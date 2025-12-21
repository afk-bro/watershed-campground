import { NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ReservationStatus } from "@/lib/supabase";
import { Resend } from "resend";
import { generateRescheduleEmail } from "@/lib/emails/rescheduleNotification";

const resend = new Resend(process.env.RESEND_API_KEY);

type UpdateReservationBody = {
    status?: ReservationStatus;
    campsite_id?: string | null;
    check_in?: string;
    check_out?: string;
};

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Server-side authentication check
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized: Authentication required" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { status, campsite_id, check_in, check_out } = body as UpdateReservationBody;

        // Fetch current reservation (for comparison and email sending)
        const { data: oldReservation, error: fetchError } = await supabaseAdmin
            .from('reservations')
            .select('*, campsites(id, name, code)')
            .eq('id', id)
            .single();

        if (fetchError || !oldReservation) {
            return NextResponse.json(
                { error: "Reservation not found" },
                { status: 404 }
            );
        }

        // Build updates object
        const updates: Partial<UpdateReservationBody & { updated_at: string }> = {
            updated_at: new Date().toISOString(),
        };

        // Validate and add status if provided
        if (status !== undefined) {
            const validStatuses: ReservationStatus[] = [
                'pending',
                'confirmed',
                'cancelled',
                'checked_in',
                'checked_out',
                'no_show'
            ];

            if (!validStatuses.includes(status)) {
                return NextResponse.json(
                    { error: "Invalid status value" },
                    { status: 400 }
                );
            }
            updates.status = status;
        }

        // Validate dates if provided
        if (check_in !== undefined || check_out !== undefined) {
            const newCheckIn = check_in || oldReservation.check_in;
            const newCheckOut = check_out || oldReservation.check_out;

            if (new Date(newCheckOut) <= new Date(newCheckIn)) {
                return NextResponse.json(
                    { error: "Check-out date must be after check-in date" },
                    { status: 400 }
                );
            }

            if (check_in) updates.check_in = check_in;
            if (check_out) updates.check_out = check_out;
        }

        // Validate campsite if provided (allow null for unassigning)
        if (campsite_id !== undefined) {
            if (campsite_id === null) {
                // Explicitly unassigning - this is valid
                updates.campsite_id = null;
            } else {
                // Validate actual campsite ID
                const { data: campsite, error: campsiteError } = await supabaseAdmin
                    .from('campsites')
                    .select('id, name, is_active')
                    .eq('id', campsite_id)
                    .single();

                if (campsiteError || !campsite) {
                    return NextResponse.json(
                        { error: "Campsite not found" },
                        { status: 404 }
                    );
                }

                if (!campsite.is_active) {
                    return NextResponse.json(
                        { error: "Campsite is not active" },
                        { status: 400 }
                    );
                }

                updates.campsite_id = campsite_id;
            }
        }

        // Check for overlapping reservations if dates or campsite changed
        // Skip conflict check if moving to unassigned (campsite_id === null)
        if (campsite_id !== undefined || check_in !== undefined || check_out !== undefined) {
            const targetCampsiteId = campsite_id !== undefined ? campsite_id : oldReservation.campsite_id;
            const targetCheckIn = check_in || oldReservation.check_in;
            const targetCheckOut = check_out || oldReservation.check_out;

            // Only check conflicts if assigned to a campsite
            if (targetCampsiteId !== null) {
                // Check for blackout dates
                const { data: blackoutConflicts, error: blackoutError } = await supabaseAdmin
                    .from('blackout_dates')
                    .select('reason')
                    .or(`campsite_id.is.null,campsite_id.eq.${targetCampsiteId}`)
                    .lt('start_date', targetCheckOut)
                    .gte('end_date', targetCheckIn);

                if (blackoutError) {
                    console.error("Error checking blackout conflicts:", blackoutError);
                }

                if (blackoutConflicts && blackoutConflicts.length > 0) {
                    const reason = blackoutConflicts[0].reason || "Dates are blacked out";
                    return NextResponse.json(
                        { error: `Conflict with blackout date: ${reason}` },
                        { status: 409 }
                    );
                }

                const { data: conflicts, error: conflictError } = await supabaseAdmin
                    .from('reservations')
                    .select('id, first_name, last_name')
                    .eq('campsite_id', targetCampsiteId)
                    .neq('id', id)
                    .lt('check_in', targetCheckOut)
                    .gt('check_out', targetCheckIn)
                    .not('status', 'in', '(cancelled,no_show)');

                if (conflictError) {
                    console.error("Error checking conflicts:", conflictError);
                }

                if (conflicts && conflicts.length > 0) {
                    const conflict = conflicts[0];
                    return NextResponse.json(
                        {
                            error: `Conflicts with ${conflict.first_name} ${conflict.last_name} reservation`
                        },
                        { status: 409 }
                    );
                }
            }
        }

        // Update reservation
        const { data: updatedReservation, error: updateError } = await supabaseAdmin
            .from('reservations')
            .update(updates)
            .eq('id', id)
            .select('*, campsites(id, name, code)')
            .single();

        if (updateError) {
            console.error("Error updating reservation:", updateError);
            return NextResponse.json(
                { error: "Failed to update reservation" },
                { status: 500 }
            );
        }

        // Send email if dates or campsite changed (best-effort)
        // OR if status changed to cancelled
        let emailSent = false;
        let emailError = null;

        const datesChanged =
            (check_in && check_in !== oldReservation.check_in) ||
            (check_out && check_out !== oldReservation.check_out);
        const campsiteChanged = campsite_id && campsite_id !== oldReservation.campsite_id;
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
                        refundAmount: 0 // Logic for refund amount not fully tracked yet, default 0
                    });
                } else {
                    // Reschedule
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
                    await resend.emails.send({
                        from: "The Watershed Campground <onboarding@resend.dev>",
                        to: [updatedReservation.email],
                        subject: emailData.subject,
                        html: emailData.html,
                    });
                    emailSent = true;
                }
            } catch (error: unknown) {
                console.error("Error sending notification email:", error);
                emailError = error instanceof Error ? error.message : "Email sending failed";
                // Don't fail the request - email is best-effort
            }
        }

        return NextResponse.json({
            reservation: updatedReservation,
            emailSent,
            emailError,
        });
    } catch (error) {
        console.error("Error in PATCH /api/admin/reservations/[id]:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
