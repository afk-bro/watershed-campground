import { test, expect } from '@playwright/test';
import { getPaymentStatus } from '../../lib/admin/reservations/listing';

test.describe('getPaymentStatus Utility', () => {
    const totalAmount = 100;
    const baseReservation = {
        metadata: { total_amount: totalAmount },
        check_in: '2025-01-01',
        status: 'confirmed',
        payment_transactions: []
    };

    test('returns payment_due when no transactions exist', () => {
        const res = { ...baseReservation, check_in: '2099-01-01' };
        expect(getPaymentStatus(res)).toBe('payment_due');
    });

    test('returns overdue when no transactions exist and check-in is past', () => {
        const res = { ...baseReservation, check_in: '2000-01-01' };
        expect(getPaymentStatus(res)).toBe('overdue');
    });

    test('returns payment_due for cancelled reservations even if past check-in', () => {
        const res = { ...baseReservation, check_in: '2000-01-01', status: 'cancelled' };
        expect(getPaymentStatus(res)).toBe('payment_due');
    });

    test('returns paid when total paid equals total amount', () => {
        const res = {
            ...baseReservation,
            payment_transactions: [
                { amount: 100, status: 'succeeded', type: 'payment', created_at: '2024-01-01' }
            ]
        };
        expect(getPaymentStatus(res)).toBe('paid');
    });

    test('returns paid when total paid is within rounding tolerance (1 cent)', () => {
        const res = {
            ...baseReservation,
            payment_transactions: [
                { amount: 99.99, status: 'succeeded', type: 'payment', created_at: '2024-01-01' }
            ]
        };
        expect(getPaymentStatus(res)).toBe('paid');
    });

    test('returns deposit_paid when partial payment exists', () => {
        const res = {
            ...baseReservation,
            payment_transactions: [
                { amount: 50, status: 'succeeded', type: 'payment', created_at: '2024-01-01' }
            ]
        };
        expect(getPaymentStatus(res)).toBe('deposit_paid');
    });

    test('returns paid when overpaid', () => {
        const res = {
            ...baseReservation,
            payment_transactions: [
                { amount: 150, status: 'succeeded', type: 'payment', created_at: '2024-01-01' }
            ]
        };
        expect(getPaymentStatus(res)).toBe('paid');
    });

    test('returns refunded if any refund transaction exists', () => {
        const res = {
            ...baseReservation,
            payment_transactions: [
                { amount: 100, status: 'succeeded', type: 'payment', created_at: '2024-01-01' },
                { amount: 100, status: 'succeeded', type: 'refund', created_at: '2024-01-02' }
            ]
        };
        expect(getPaymentStatus(res)).toBe('refunded');
    });

    test('returns failed if the most recent transaction failed', () => {
        const res = {
            ...baseReservation,
            payment_transactions: [
                { amount: 100, status: 'failed', type: 'payment', created_at: '2024-01-02' },
                { amount: 50, status: 'succeeded', type: 'payment', created_at: '2024-01-01' }
            ]
        };
        expect(getPaymentStatus(res)).toBe('failed');
    });

    test('ignores failed transactions that are not the most recent for simple status determination', () => {
        const res = {
            ...baseReservation,
            payment_transactions: [
                { amount: 100, status: 'succeeded', type: 'payment', created_at: '2024-01-02' },
                { amount: 100, status: 'failed', type: 'payment', created_at: '2024-01-01' }
            ]
        };
        expect(getPaymentStatus(res)).toBe('paid');
    });
});
