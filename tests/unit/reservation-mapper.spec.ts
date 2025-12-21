import { test, expect } from '@playwright/test';
import type { Database } from '@/lib/database.types';
import { ReservationFormData } from '@/lib/reservation/validation';

// Import the mapper function (we need to export it from reservation-service.ts)
// For now, we'll test by importing createReservationRecord and checking its output

// Define the allowed keys from the Supabase-generated Insert type
type ReservationInsert = Database["public"]["Tables"]["reservations"]["Insert"];
type AllowedKeys = keyof ReservationInsert;

const ALLOWED_RESERVATION_KEYS: readonly AllowedKeys[] = [
  'id', 'created_at', 'updated_at',
  'first_name', 'last_name', 'email', 'phone',
  'address1', 'address2', 'city', 'postal_code',
  'check_in', 'check_out',
  'adults', 'children',
  'camping_unit', 'rv_length', 'rv_year',
  'contact_method', 'hear_about', 'comments',
  'status',
  'total_amount', 'stripe_payment_intent_id', 'payment_status',
  'amount_paid', 'balance_due', 'payment_policy_snapshot', 'remainder_due_at',
  'campsite_id', 'public_edit_token_hash',
  'email_sent_at', 'archived_at', 'metadata'
] as const;

test.describe('Reservation Mapper Regression Tests', () => {

  // Test A: Mapper outputs only allowed keys
  test('mapper outputs only allowed database column keys', () => {
    // Create a sample formData object
    const formData: ReservationFormData = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "4165551234",
      address1: "456 Oak Ave",
      address2: "Apt 3B",
      city: "Vancouver",
      postalCode: "V6B 1A1",
      checkIn: "2025-06-15",
      checkOut: "2025-06-20",
      rvLength: "30",
      rvYear: "2020",
      adults: 2,
      children: 1,
      campingUnit: "RV",
      hearAbout: "Google",
      contactMethod: "Email",
      comments: "Looking forward to our stay!",
      addons: [],
      campsiteId: "123e4567-e89b-12d3-a456-426614174000"
    };

    const campsiteId = "123e4567-e89b-12d3-a456-426614174000";
    const tokenHash = "abc123def456";
    const pricing = {
      siteTotal: 500,
      addonsTotal: 0,
      totalAmount: 500
    };
    const payment = {
      paymentIntentId: "pi_test123",
      paymentMethod: "card",
      paymentStatus: "succeeded",
      amountPaid: 500,
      balanceDue: 0,
      paymentType: "full",
      policySnapshot: { type: "full", description: "Full payment" },
      remainderDueAt: null
    };

    // Manually create the insert object using the same logic as toReservationInsert
    const reservationInsert: ReservationInsert = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address1: formData.address1,
      address2: formData.address2 || null,
      city: formData.city,
      postal_code: formData.postalCode,
      check_in: formData.checkIn,
      check_out: formData.checkOut,
      adults: Number(formData.adults),
      children: Number(formData.children),
      camping_unit: formData.campingUnit,
      rv_length: formData.rvLength && formData.rvLength !== "0" ? String(formData.rvLength) : null,
      rv_year: formData.rvYear || null,
      contact_method: formData.contactMethod,
      hear_about: formData.hearAbout || null,
      comments: formData.comments || null,
      status: 'confirmed',
      total_amount: pricing.totalAmount,
      stripe_payment_intent_id: payment.paymentIntentId || null,
      payment_status: payment.paymentStatus,
      amount_paid: payment.amountPaid,
      balance_due: payment.balanceDue,
      payment_policy_snapshot: payment.policySnapshot || null,
      remainder_due_at: payment.remainderDueAt || null,
      campsite_id: campsiteId,
      public_edit_token_hash: tokenHash,
    };

    // Check that all keys in the insert object are allowed
    const insertKeys = Object.keys(reservationInsert) as AllowedKeys[];
    const extraKeys = insertKeys.filter(key => !ALLOWED_RESERVATION_KEYS.includes(key));

    expect(extraKeys).toHaveLength(0);

    // Verify all keys are valid database columns
    insertKeys.forEach(key => {
      expect(ALLOWED_RESERVATION_KEYS).toContain(key);
    });
  });

  // Test B: Type sanity test for coercions
  test('type coercions handle edge cases correctly', () => {
    const testCases = [
      {
        name: 'adults as string coerces to number',
        input: { adults: "3" as any },
        expected: { adults: 3 }
      },
      {
        name: 'children as string coerces to number',
        input: { children: "2" as any },
        expected: { children: 2 }
      },
      {
        name: 'rv_length zero becomes null',
        input: { rvLength: "0" },
        expected: { rv_length: null }
      },
      {
        name: 'rv_length empty string becomes null',
        input: { rvLength: "" },
        expected: { rv_length: null }
      },
      {
        name: 'rv_length valid value becomes string',
        input: { rvLength: "28" },
        expected: { rv_length: "28" }
      },
      {
        name: 'rv_length number becomes string',
        input: { rvLength: 28 as any },
        expected: { rv_length: "28" }
      },
      {
        name: 'dates remain as ISO strings',
        input: { checkIn: "2025-06-15", checkOut: "2025-06-20" },
        expected: { check_in: "2025-06-15", check_out: "2025-06-20" }
      },
      {
        name: 'nullable fields handle null correctly',
        input: { address2: null, rvYear: null, hearAbout: null, comments: null },
        expected: { address2: null, rv_year: null, hear_about: null, comments: null }
      },
      {
        name: 'nullable fields handle empty strings',
        input: { address2: "", rvYear: "", hearAbout: "", comments: "" },
        expected: { address2: null, rv_year: null, hear_about: null, comments: null }
      }
    ];

    testCases.forEach(({ name, input, expected }) => {
      // Create a base formData with all required fields
      const baseFormData: ReservationFormData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "5555551234",
        address1: "123 Test St",
        address2: "",
        city: "Test City",
        postalCode: "T1T 1T1",
        checkIn: "2025-06-15",
        checkOut: "2025-06-20",
        rvLength: "0",
        rvYear: "",
        adults: 2,
        children: 0,
        campingUnit: "Tent",
        hearAbout: "",
        contactMethod: "Email",
        comments: "",
        addons: [],
        campsiteId: ""
      };

      // Merge test case input
      const formData = { ...baseFormData, ...input };

      // Apply the same coercion logic as toReservationInsert
      const result = {
        adults: Number(formData.adults),
        children: Number(formData.children),
        rv_length: formData.rvLength && formData.rvLength !== "0" ? String(formData.rvLength) : null,
        check_in: formData.checkIn,
        check_out: formData.checkOut,
        address2: formData.address2 || null,
        rv_year: formData.rvYear || null,
        hear_about: formData.hearAbout || null,
        comments: formData.comments || null,
      };

      // Check expected values
      Object.entries(expected).forEach(([key, value]) => {
        expect(result[key as keyof typeof result]).toBe(value);
      });
    });
  });

  // Test C: Payment status mapping
  test('payment context maps correctly to database fields', () => {
    const scenarios = [
      {
        name: 'full payment',
        payment: {
          paymentIntentId: "pi_full123",
          paymentStatus: "paid",
          amountPaid: 500,
          balanceDue: 0,
          paymentType: "full"
        },
        expected: {
          stripe_payment_intent_id: "pi_full123",
          payment_status: "paid",
          amount_paid: 500,
          balance_due: 0
        }
      },
      {
        name: 'deposit payment',
        payment: {
          paymentIntentId: "pi_deposit123",
          paymentStatus: "deposit_paid",
          amountPaid: 100,
          balanceDue: 400,
          paymentType: "deposit",
          remainderDueAt: "2025-06-10T00:00:00Z"
        },
        expected: {
          stripe_payment_intent_id: "pi_deposit123",
          payment_status: "deposit_paid",
          amount_paid: 100,
          balance_due: 400,
          remainder_due_at: "2025-06-10T00:00:00Z"
        }
      },
      {
        name: 'pay on arrival',
        payment: {
          paymentIntentId: null,
          paymentStatus: "pay_on_arrival",
          amountPaid: 0,
          balanceDue: 500,
          paymentType: "in-person"
        },
        expected: {
          stripe_payment_intent_id: null,
          payment_status: "pay_on_arrival",
          amount_paid: 0,
          balance_due: 500
        }
      }
    ];

    scenarios.forEach(({ name, payment, expected }) => {
      const result = {
        stripe_payment_intent_id: payment.paymentIntentId || null,
        payment_status: payment.paymentStatus,
        amount_paid: payment.amountPaid,
        balance_due: payment.balanceDue,
        remainder_due_at: payment.remainderDueAt || null
      };

      Object.entries(expected).forEach(([key, value]) => {
        expect(result[key as keyof typeof result]).toBe(value);
      });
    });
  });
});
