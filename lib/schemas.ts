import { z } from "zod";

// Regex to block control characters that could be used for email header injection:
// - \r\n: Carriage return and newline (primary header injection vectors)
// - \x00-\x1F: ASCII control characters (0-31)
// - \x7F: DEL character
// - \x80-\x9F: C1 control characters (128-159)
const CONTROL_CHARS_REGEX = /[\r\n\x00-\x1F\x7F-\x9F]/;

// Email validation that prevents header injection attacks
const emailWithSecurityValidation = z.string()
    .email("Invalid email address")
    .refine(
        (email: string) => !CONTROL_CHARS_REGEX.test(email),
        "Email address cannot contain control characters"
    );

export const contactFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: emailWithSecurityValidation,
    message: z.string().min(1, "Message is required"),
});

export const reservationFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    address1: z.string().min(1, "Address is required"),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    postalCode: z.string().min(1, "Postal/Zip code is required"),
    email: emailWithSecurityValidation,
    phone: z.string()
        .min(10, "Phone number is required")
        .regex(/^\+?[0-9\s\-()]+$/, "Invalid phone number format"),
    checkIn: z.string().min(1, "Check-in date is required"),
    checkOut: z.string().min(1, "Check-out date is required"),
    rvLength: z.string().min(1, "RV length is required"),
    rvYear: z.string().optional(),
    adults: z.coerce.number().min(1, "At least 1 adult is required"),
    children: z.coerce.number().min(0).default(0),
    campingUnit: z.string().min(1, "Camping unit type is required"),
    hearAbout: z.string().optional(),
    contactMethod: z.string().min(1, "Preferred contact method is required"),
    comments: z.string().optional(),
});

export const campsiteFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    code: z.string()
        .min(1, "Code is required")
        .toUpperCase()
        .regex(/^[A-Z0-9]+$/, "Code must contain only uppercase letters and numbers"),
    type: z.enum(['rv', 'tent', 'cabin'], {
        message: "Type must be rv, tent, or cabin"
    }),
    maxGuests: z.coerce.number()
        .min(1, "At least 1 guest capacity is required")
        .max(50, "Maximum capacity is 50 guests"),
    baseRate: z.coerce.number()
        .min(0, "Rate must be a positive number")
        .max(10000, "Rate seems unreasonably high"),
    isActive: z.boolean().default(true),
    notes: z.string().optional(),
    sortOrder: z.coerce.number().default(0),
    imageUrl: z.string().optional(),
});

export const blackoutFormSchema = z.object({
    start_date: z.string().min(1, "Start date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    end_date: z.string().min(1, "End date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    campsite_id: z.string().nullable().optional(),
    reason: z.string().optional(),
});

export const reservationUpdateSchema = z.object({
    status: z.enum(['pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'no_show']).optional(),
    campsite_id: z.string().nullable().optional(),
    check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: emailWithSecurityValidation.optional(),
    phone: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
export type ReservationFormData = z.infer<typeof reservationFormSchema>;
export type CampsiteFormData = z.infer<typeof campsiteFormSchema>;
export type BlackoutFormData = z.infer<typeof blackoutFormSchema>;
export type ReservationUpdateData = z.infer<typeof reservationUpdateSchema>;
