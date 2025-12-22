import { test, expect } from '@playwright/test';
import { 
    isPaymentPolicyType, 
    isDepositType, 
    toPaymentPolicy,
    type PaymentPolicy 
} from '../../lib/payment-policy';
import type { Database } from '@/lib/database.types';

// --- Type Guard Tests ---
test.describe('Payment Policy Type Guards', () => {
    test.describe('isPaymentPolicyType', () => {
        test('returns true for valid "full" policy type', () => {
            expect(isPaymentPolicyType('full')).toBe(true);
        });

        test('returns true for valid "deposit" policy type', () => {
            expect(isPaymentPolicyType('deposit')).toBe(true);
        });

        test('returns false for invalid policy type', () => {
            expect(isPaymentPolicyType('invalid')).toBe(false);
            expect(isPaymentPolicyType('partial')).toBe(false);
            expect(isPaymentPolicyType('Full')).toBe(false); // case sensitive
            expect(isPaymentPolicyType('')).toBe(false);
        });
    });

    test.describe('isDepositType', () => {
        test('returns true for valid "percent" deposit type', () => {
            expect(isDepositType('percent')).toBe(true);
        });

        test('returns true for valid "fixed" deposit type', () => {
            expect(isDepositType('fixed')).toBe(true);
        });

        test('returns false for invalid deposit type', () => {
            expect(isDepositType('invalid')).toBe(false);
            expect(isDepositType('percentage')).toBe(false);
            expect(isDepositType('Percent')).toBe(false); // case sensitive
            expect(isDepositType('')).toBe(false);
        });
    });
});

// --- Database Row to PaymentPolicy Conversion Tests ---
test.describe('toPaymentPolicy Conversion', () => {
    // Helper to mock console.error for validation tests
    const mockConsoleError = () => {
        const spy = { calls: [] as any[] };
        const original = console.error;
        console.error = (...args: any[]) => {
            spy.calls.push(args);
        };
        return { spy, restore: () => { console.error = original; } };
    };

    const createMockRow = (overrides: Partial<Database['public']['Tables']['payment_policies']['Row']> = {}): Database['public']['Tables']['payment_policies']['Row'] => {
        return {
            id: 'test-policy-1',
            name: 'Test Policy',
            policy_type: 'full',
            deposit_type: null,
            deposit_value: null,
            due_days_before_checkin: null,
            site_type: null,
            campsite_id: null,
            start_month: null,
            end_month: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            ...overrides
        };
    };

    test('converts valid full payment policy', () => {
        const row = createMockRow({
            id: 'policy-1',
            name: 'Pay in Full',
            policy_type: 'full'
        });

        const result = toPaymentPolicy(row);

        expect(result).not.toBeNull();
        expect(result?.id).toBe('policy-1');
        expect(result?.name).toBe('Pay in Full');
        expect(result?.policy_type).toBe('full');
        expect(result?.deposit_type).toBeUndefined();
    });

    test('converts valid deposit policy with percent type', () => {
        const row = createMockRow({
            id: 'policy-2',
            name: '50% Deposit',
            policy_type: 'deposit',
            deposit_type: 'percent',
            deposit_value: 50,
            due_days_before_checkin: 30
        });

        const result = toPaymentPolicy(row);

        expect(result).not.toBeNull();
        expect(result?.policy_type).toBe('deposit');
        expect(result?.deposit_type).toBe('percent');
        expect(result?.deposit_value).toBe(50);
        expect(result?.due_days_before_checkin).toBe(30);
    });

    test('converts valid deposit policy with fixed type', () => {
        const row = createMockRow({
            id: 'policy-3',
            name: '$100 Deposit',
            policy_type: 'deposit',
            deposit_type: 'fixed',
            deposit_value: 100,
            due_days_before_checkin: 14
        });

        const result = toPaymentPolicy(row);

        expect(result).not.toBeNull();
        expect(result?.policy_type).toBe('deposit');
        expect(result?.deposit_type).toBe('fixed');
        expect(result?.deposit_value).toBe(100);
        expect(result?.due_days_before_checkin).toBe(14);
    });

    test('handles null deposit_type correctly', () => {
        const row = createMockRow({
            policy_type: 'full',
            deposit_type: null
        });

        const result = toPaymentPolicy(row);

        expect(result).not.toBeNull();
        expect(result?.deposit_type).toBeUndefined();
    });

    test('returns null for invalid policy_type', () => {
        const consoleMock = mockConsoleError();

        const row = createMockRow({
            id: 'invalid-1',
            name: 'Invalid Policy',
            policy_type: 'invalid-type' as any
        });

        const result = toPaymentPolicy(row);

        expect(result).toBeNull();
        consoleMock.restore();
    });

    test('returns null for invalid deposit_type', () => {
        const consoleMock = mockConsoleError();

        const row = createMockRow({
            id: 'invalid-2',
            name: 'Invalid Deposit Type',
            policy_type: 'deposit',
            deposit_type: 'invalid-deposit' as any
        });

        const result = toPaymentPolicy(row);

        expect(result).toBeNull();
        consoleMock.restore();
    });

    test('converts policy with site_type', () => {
        const row = createMockRow({
            policy_type: 'deposit',
            deposit_type: 'percent',
            deposit_value: 25,
            site_type: 'RV'
        });

        const result = toPaymentPolicy(row);

        expect(result).not.toBeNull();
        expect(result?.site_type).toBe('RV');
    });

    test('converts policy with campsite_id', () => {
        const row = createMockRow({
            policy_type: 'full',
            campsite_id: 'site-123'
        });

        const result = toPaymentPolicy(row);

        expect(result).not.toBeNull();
        expect(result?.campsite_id).toBe('site-123');
    });

    test('converts policy with seasonal dates', () => {
        const row = createMockRow({
            policy_type: 'deposit',
            deposit_type: 'percent',
            deposit_value: 50,
            start_month: 6,
            end_month: 8
        });

        const result = toPaymentPolicy(row);

        expect(result).not.toBeNull();
        expect(result?.start_month).toBe(6);
        expect(result?.end_month).toBe(8);
    });

    test('omits created_at and updated_at from converted policy', () => {
        const row = createMockRow({
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-12-01T00:00:00Z'
        });

        const result = toPaymentPolicy(row);

        expect(result).not.toBeNull();
        expect(result).not.toHaveProperty('created_at');
        expect(result).not.toHaveProperty('updated_at');
    });
});
