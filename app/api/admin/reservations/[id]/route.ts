import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ReservationStatus } from "@/lib/supabase";
import { Resend } from "resend";
import { generateRescheduleEmail } from "@/lib/emails/rescheduleNotification";

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;
function getResendClient() {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

type UpdateReservationBody = {
    status?: ReservationStatus;
    campsite_id?: string | null;
    check_in?: string;
    check_out?: string;
};

import { requireAdminWithOrg } from '@/lib/admin-auth';
import { reservationUpdateSchema } from "@/lib/schemas";
import { logAudit } from "@/lib/audit/audit-service";
import { verifyOrgResource, updateWithOrg } from '@/lib/db-helpers';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authorization
        const { authorized, user, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const { id } = await params;

        // 2. Fetch current reservation for comparison/logging (org-scoped)
        const { data: oldReservation, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('*, campsites(id, name, code)')
            .eq('id', id)
            .eq('organization_id', organizationId!)
            .single();

        if (fetchError || !oldReservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        // 3. Validation
        const body = await request.json();
        const validation = reservationUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const updates: any = {
            updated_at: new Date().toISOString(),
        };

        const { status, campsite_id, check_in, check_out, firstName, lastName, email, phone } = validation.data;

        if (status !== undefined) updates.status = status;
        if (campsite_id !== undefined) updates.campsite_id = campsite_id;
        if (check_in !== undefined) updates.check_in = check_in;
        if (check_out !== undefined) updates.check_out = check_out;
        if (firstName !== undefined) updates.first_name = firstName;
        if (lastName !== undefined) updates.last_name = lastName;
        if (email !== undefined) updates.email = email;
        if (phone !== undefined) updates.phone = phone;

        // Validate date order if changed
        const finalCheckIn = check_in || oldReservation.check_in;
        const finalCheckOut = check_out || oldReservation.check_out;
        if (new Date(finalCheckOut) <= new Date(finalCheckIn)) {
            return NextResponse.json({ error: "Check-out must be after check-in" }, { status: 400 });
        }

        // Validate campsite if provided (org-scoped)
        if (campsite_id !== undefined && campsite_id !== null) {
            const campsite = await verifyOrgResource('campsites', campsite_id, organizationId!);

            if (!campsite) {
                return NextResponse.json({ error: "Campsite not found" }, { status: 404 });
            }
        }

        // Conflict check (skipped for brevity but should be logically here)
        // I will preserve the conflict check logic...
        const targetCampsiteId = campsite_id !== undefined ? campsite_id : oldReservation.campsite_id;
        if (targetCampsiteId !== null && (campsite_id !== undefined || check_in !== undefined || check_out !== undefined)) {
            // [PRESERVED CONFLICT LOGIC - org-scoped]
            const { data: blackoutConflicts } = await supabaseAdmin
                .from('blackout_dates')
                .select('reason')
                .eq('organization_id', organizationId!)
                .or(`campsite_id.is.null,campsite_id.eq.${targetCampsiteId}`)
                .lt('start_date', finalCheckOut)
                .gte('end_date', finalCheckIn);

            if (blackoutConflicts && blackoutConflicts.length > 0) {
                return NextResponse.json({ error: `Conflict with blackout date` }, { status: 409 });
            }

            const { data: conflicts } = await supabaseAdmin
                .from('reservations')
                .select('id, first_name, last_name')
                .eq('organization_id', organizationId!)
                .eq('campsite_id', targetCampsiteId)
                .neq('id', id)
                .lt('check_in', finalCheckOut)
                .gt('check_out', finalCheckIn)
                .not('status', 'in', '(cancelled,no_show)');

            if (conflicts && conflicts.length > 0) {
                return NextResponse.json({ error: `Conflicts with existing reservation` }, { status: 409 });
            }
        }

        // 4. Update (org-scoped)
        const { data: updatedReservation, error: updateError } = await supabaseAdmin
            .from('reservations')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', organizationId!)
            .select('*, campsites(id, name, code)')
            .single();

        if (updateError) throw updateError;

        // 5. Audit Logging
        await logAudit({
            action: 'RESERVATION_UPDATE',
            reservationId: id,
            oldData: oldReservation,
            newData: updatedReservation,
            changedBy: user!.id
        });

        // 6. Best-effort email notification
        let emailSent = false;
        const datesChanged = (check_in && check_in !== oldReservation.check_in) || (check_out && check_out !== oldReservation.check_out);
        const campsiteChanged = campsite_id !== undefined && campsite_id !== oldReservation.campsite_id;
        const isCancelled = status === 'cancelled' && oldReservation.status !== 'cancelled';

        if (datesChanged || campsiteChanged || isCancelled) {
            try {
                const oldCampsiteName = oldReservation.campsites?.name || "Unassigned";
                const newCampsiteName = updatedReservation.campsites?.name || "Unassigned";
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

                let emailData;
                if (isCancelled) {
                    const { generateCancellationEmail } = await import("@/lib/emails/cancellationConfirmation");
                    emailData = generateCancellationEmail({
                        guestFirstName: updatedReservation.first_name,
                        campsiteName: oldCampsiteName,
                        checkIn: oldReservation.check_in,
                        checkOut: oldReservation.check_out,
                        refundAmount: 0
                    });
                } else {
                    const manageUrl = `${baseUrl}/manage-reservation?rid=${updatedReservation.id}`;
                    emailData = generateRescheduleEmail({
                        guestFirstName: updatedReservation.first_name,
                        oldCampsiteName,
                        newCampsiteName,
                        oldCheckIn: oldReservation.check_in,
                        oldCheckOut: oldReservation.check_out,
                        newCheckIn: updatedReservation.check_in,
                        newCheckOut: updatedReservation.check_out,
                        manageUrl,
                    });
                }

                if (emailData) {
                    const resend = getResendClient();
                    await resend.emails.send({
                        from: "The Watershed Campground <onboarding@resend.dev>",
                        to: [updatedReservation.email],
                        subject: emailData.subject,
                        html: emailData.html,
                    });
                    emailSent = true;
                }
            } catch (e) {
                console.error("Email notification failed:", e);
            }
        }

        return NextResponse.json({
            reservation: updatedReservation,
            emailSent
        });
    } catch (error) {
        console.error("Error in PATCH /api/admin/reservations/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
