import { test, expect } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { reservationFormSchema } from '../../lib/reservation/validation';
import { generateGuestConfirmationHtml, generateAdminNotificationHtml } from '../../lib/email/templates';
import { createReservationRecord, CodeDeps } from '../../lib/reservation/reservation-service';

// --- Validation Tests ---
test.describe('Reservation Validation', () => {
    const validData = {
        firstName: "John",
        lastName: "Doe",
        address1: "123 Main St",
        city: "Toronto",
        postalCode: "M5V 2H1",
        email: "john@example.com",
        phone: "4165550123",
        checkIn: "2024-07-01",
        checkOut: "2024-07-05",
        rvLength: "25",
        adults: 2,
        children: 1,
        campingUnit: "RV",
        contactMethod: "Email"
    };

    test('accepts valid payload', () => {
        const result = reservationFormSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    test('rejects missing fields', () => {
        const { firstName, ...invalid } = validData;
        const result = reservationFormSchema.safeParse(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.firstName).toBeDefined();
        }
    });

    test('rejects invalid email', () => {
        const invalid = { ...validData, email: "not-an-email" };
        const result = reservationFormSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    test('rejects check-out before check-in', () => {
        const invalid = { ...validData, checkIn: "2024-07-05", checkOut: "2024-07-01" };
        const result = reservationFormSchema.safeParse(invalid);
        expect(result.success).toBe(false);
        // Zod refinement error often appears in formErrors or path-specific
        // In our schema, we attached it to checkOut path
        if (!result.success) {
            // Note: Zod refinements on the object usually end up in refinement errors, but we mapped it to path ["checkOut"]
            expect(JSON.stringify(result.error)).toContain("Check-out date must be after check-in date");
        }
    });
});

// --- Template Tests ---
test.describe('Email Templates', () => {
    const mockData = {
        firstName: "Alice",
        checkIn: "2025-08-01",
        checkOut: "2025-08-03",
        email: "alice@test.com",
        phone: "555-0199",
        address1: "42 Wallaby Way",
        city: "Sydney",
        postalCode: "2000",
        adults: 2,
        children: 0,
        campingUnit: "Tent",
        rvLength: "0",
        contactMethod: "Email",
        confirmationUrl: "http://test.com/manage"
    };

    test('guest email contains critical info', () => {
        const html = generateGuestConfirmationHtml(mockData, "Alice", "paid", 100, 0);
        expect(html).toContain("Alice");
        expect(html).toContain("2025-08-01");
        expect(html).toContain("2025-08-03");
        expect(html).toContain("$100.00"); // Amount paid
    });

    test('admin email contains contact info', () => {
        const html = generateAdminNotificationHtml(mockData, "Alice Smith");
        expect(html).toContain("Alice Smith");
        expect(html).toContain("alice@test.com"); // contact
        expect(html).toContain("42 Wallaby Way"); // address
    });
});

// --- Service Logic Tests (Mocked DB) ---
test.describe('Reservation Service', () => {
    test('createReservationRecord inserts data correctly', async () => {
        // Mock Supabase Client with proper type
        type MockSupabaseClient = Pick<SupabaseClient, 'from'>;
        
        // We need a proper mock chain: .from().insert().select().single()
        const mockSupabase: MockSupabaseClient = {
            from: (table: string) => {
                return {
                    insert: (data: unknown[]) => {
                        return {
                            select: () => ({
                                single: async () => {
                                    // Mock response
                                    if (table === 'reservations') {
                                        const firstItem = data[0] as Record<string, unknown>;
                                        return { data: { id: "res_123", ...firstItem }, error: null };
                                    }
                                    return { data: null, error: null }; // For ledgers/addons
                                }
                            })
                        }
                    }
                };
            }
        };

        const formData = {
            firstName: "Test",
            lastName: "User",
            email: "test@user.com",
            phone: "555-0100",
            address1: "123 Test St",
            city: "Test City",
            postalCode: "12345",
            checkIn: "2024-01-01",
            checkOut: "2024-01-02",
            rvLength: "0",
            adults: 2,
            children: 0,
            campingUnit: "Tent",
            contactMethod: "Email" as const,
            addons: [{ id: "addon_1", quantity: 1, price: 10 }]
        };

        const result = await createReservationRecord(
            { supabase: mockSupabase },
            formData,
            "site_123",
            { siteTotal: 50, addonsTotal: 10, totalAmount: 60 },
            { paymentStatus: 'paid', amountPaid: 60, balanceDue: 0, paymentType: 'full' }
        );

        expect(result.reservation.id).toBe("res_123");
        expect(result.reservation.first_name).toBe("Test");
        expect(result.reservation.amount_paid).toBe(60);
        expect(result.reservation.campsite_id).toBe("site_123");
    });
});
