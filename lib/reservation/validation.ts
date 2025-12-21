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
    rvLength: z.string().min(1, "RV length is required"),
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
