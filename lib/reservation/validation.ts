import { z } from "zod";

export const reservationFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    address1: z.string().min(1, "Address is required"),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    checkIn: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid check-in date",
    }),
    checkOut: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid check-out date",
    }),
    rvLength: z.union([z.string(), z.number()]).transform(val => String(val)).default("0"),
    rvYear: z.string().optional(),
    adults: z.coerce.number().min(1, "At least 1 adult is required"),
    children: z.coerce.number().min(0).default(0),
    campingUnit: z.string().min(1, "Camping unit type is required"),
    hearAbout: z.string().optional(),
    contactMethod: z.enum(["Phone", "Email", "Either"], {
        message: "Please select a valid contact method"
    }),
    comments: z.string().optional(),
    addons: z.array(z.object({
        id: z.string(),
        quantity: z.number().min(1),
        price: z.number()
    })).optional().default([]),
    campsiteId: z.string().optional()
}).refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out date must be after check-in date",
    path: ["checkOut"],
});

export type ReservationFormData = z.infer<typeof reservationFormSchema>;

/**
 * Schema for validating reservation data from the database.
 * Uses snake_case field names to match database schema.
 * Provides runtime safety for data integrity issues.
 */
export const databaseReservationSchema = z.object({
    id: z.string().uuid("Invalid reservation ID"),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),

    // Guest Information (required)
    first_name: z.string().min(1, "First name is missing"),
    last_name: z.string().min(1, "Last name is missing"),
    email: z.string().email("Invalid email in database"),
    phone: z.string().min(1, "Phone number is missing"),
    address1: z.string().min(1, "Address is missing"),
    city: z.string().min(1, "City is missing"),
    postal_code: z.string().min(1, "Postal code is missing"),

    // Guest Information (optional)
    address2: z.string().nullable().optional(),
    rv_year: z.string().nullable().optional(),
    hear_about: z.string().nullable().optional(),
    comments: z.string().nullable().optional(),

    // Booking Details (required)
    check_in: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid check-in date in database",
    }),
    check_out: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid check-out date in database",
    }),
    adults: z.coerce.number().int().min(1, "Invalid adult count"),
    children: z.coerce.number().int().min(0, "Invalid children count"),
    rv_length: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)).nullable(),
    camping_unit: z.string().min(1, "Camping unit is missing"),
    contact_method: z.enum(["Phone", "Email", "Either"], {
        message: "Invalid contact method in database"
    }),
    status: z.enum(['pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'no_show'], {
        message: "Invalid reservation status"
    }),

    // Payment Information
    payment_status: z.string().optional().default('pending'),
    amount_paid: z.number().min(0).optional().default(0),
    balance_due: z.number().min(0).optional().default(0),
    total_amount: z.number().min(0).optional(),
    payment_policy_snapshot: z.any().optional(), // JSONB field
    remainder_due_at: z.string().nullable().optional(),
    stripe_payment_intent_id: z.string().nullable().optional(),

    // References
    campsite_id: z.string().uuid().nullable().optional(),
    public_edit_token_hash: z.string().nullable().optional(),
    public_edit_token_expires_at: z.string().nullable().optional(),

    // Allow timestamps and other DB-managed fields
    email_sent_at: z.string().nullable().optional(),
    archived_at: z.string().nullable().optional(),
    archived_by: z.string().uuid().nullable().optional(),

        // Opaque metadata stored as JSONB (flexible but guided)
        metadata: z
            .union([
                z.record(z.unknown()),
                z.array(z.unknown()),
                z.string(),
                z.number(),
                z.boolean(),
                z.null(),
            ])
            .optional(),
}).passthrough(); // Allow extra DB columns to avoid breaking when schema evolves

export type DatabaseReservation = z.infer<typeof databaseReservationSchema>;
