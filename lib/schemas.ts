import { z } from "zod";

export const contactFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    message: z.string().min(1, "Message is required"),
});

export const reservationFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    address1: z.string().min(1, "Address is required"),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    postalCode: z.string().min(1, "Postal/Zip code is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number is required"),
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

export type ContactFormData = z.infer<typeof contactFormSchema>;
export type ReservationFormData = z.infer<typeof reservationFormSchema>;
