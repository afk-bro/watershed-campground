
import { checkAvailability } from "@/lib/availability/engine";
import { requireAdminWithOrg } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-helpers";

export async function POST(request: Request) {
    try {
        // Use admin auth with org scoping
        const { authorized, organizationId, response: authResponse } = await requireAdminWithOrg();
        if (!authorized) return authResponse!;

        const body = await request.json();

        // Destructure specifically to avoid passing unsafe junk
        const {
            checkIn,
            checkOut,
            guestCount,
            campsiteId,
            ignorePastCheck,
            forceConflict,
            overrideBlackout
        } = body;

        // Admin override logic (route layer)
        // If admin is forcing availability, skip engine check entirely
        if (forceConflict || overrideBlackout) {
            return successResponse({
                available: true,
                message: "Admin override: availability check bypassed",
                recommendedSiteId: campsiteId || null
            });
        }

        // Past date validation (route layer for admin control)
        if (!ignorePastCheck) {
            const checkInDate = new Date(checkIn);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (checkInDate < today) {
                return successResponse({
                    available: false,
                    message: "Check-in date cannot be in the past"
                });
            }
        }

        // Use new engine with org scoping
        const result = await checkAvailability({
            checkIn,
            checkOut,
            guestCount: Number(guestCount),
            campsiteId,
            organizationId: organizationId!
        });

        return successResponse(result);

    } catch (error) {
        logger.error("Availability Check API Error:", error);
        return errorResponse("Server error checking availability", 500, {
            available: false
        });
    }
}
