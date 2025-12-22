import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Types
export type PaymentPolicyType = 'full' | 'deposit';
export type DepositType = 'percent' | 'fixed';

export interface PaymentPolicy {
    id: string;
    name: string;
    policy_type: PaymentPolicyType;
    deposit_type?: DepositType;
    deposit_value?: number;
    due_days_before_checkin?: number;
    site_type?: string;
    campsite_id?: string;
    start_month?: number;
    end_month?: number;
}

/**
 * Converts database row to PaymentPolicy with type validation.
 * Validates that policy_type and deposit_type match expected literal types.
 */
function toPaymentPolicy(data: Database['public']['Tables']['payment_policies']['Row']): PaymentPolicy | null {
    const validPolicyTypes: PaymentPolicyType[] = ['full', 'deposit'];
    const validDepositTypes: DepositType[] = ['percent', 'fixed'];
    
    // Validate policy_type
    if (!validPolicyTypes.includes(data.policy_type as PaymentPolicyType)) {
        console.error(`Invalid policy_type: ${data.policy_type}`);
        return null;
    }
    
    // Validate deposit_type if present
    if (data.deposit_type && !validDepositTypes.includes(data.deposit_type as DepositType)) {
        console.error(`Invalid deposit_type: ${data.deposit_type}`);
        return null;
    }
    
    // Map database row to PaymentPolicy interface
    return {
        id: data.id,
        name: data.name,
        policy_type: data.policy_type as PaymentPolicyType,
        deposit_type: data.deposit_type as DepositType | undefined,
        deposit_value: data.deposit_value ?? undefined,
        due_days_before_checkin: data.due_days_before_checkin ?? undefined,
        site_type: data.site_type ?? undefined,
        campsite_id: data.campsite_id ?? undefined,
        start_month: data.start_month ?? undefined,
        end_month: data.end_month ?? undefined,
    };
}

export interface PaymentBreakdown {
    totalAmount: number;
    policyApplied: PaymentPolicy;
    dueNow: number;
    dueLater: number;
    depositAmount: number;
    remainderDueAt: Date | null;
}

// Default Policy (Fallback)
const DEFAULT_POLICY: PaymentPolicy = {
    id: 'default',
    name: 'Standard Pay in Full',
    policy_type: 'full',
    due_days_before_checkin: 0
};

/**
 * Determines the best matching payment policy for a given booking.
 * Priorities:
 * 1. Specific Campsite ID Match
 * 2. Site Type Match
 * 3. Season Match (Month) - *Can combine with above, but usually refinements*
 * 4. Default
 */
export async function determinePaymentPolicy(
    supabaseAdmin: SupabaseClient<Database>,
    campsiteId: string,
    campsiteType: string,
    checkInDate: Date
): Promise<PaymentPolicy> {
    const checkInMonth = checkInDate.getMonth() + 1; // 1-12

    const { data: policies, error } = await supabaseAdmin
        .from('payment_policies')
        .select('*');

    if (error || !policies) {
        console.error("Error fetching policies:", error);
        return DEFAULT_POLICY;
    }

    // Filter and Sort Candidates
    // We want the "most specific" rule.
    // Let's score them.
    const validPolicies = policies.map(toPaymentPolicy).filter((p): p is PaymentPolicy => p !== null);
    
    const scoredPolicies: Array<{ policy: PaymentPolicy; score: number; match: boolean }> = validPolicies
        .map((p) => {
            let score = 0;
            let match = true;

            // 1. Campsite ID Match (Highest Priority)
            if (p.campsite_id) {
                if (p.campsite_id === campsiteId) score += 100;
                else match = false;
            }

            // 2. Site Type Match
            if (p.site_type) {
                if (p.site_type === campsiteType) score += 50;
                else match = false;
            }

            // 3. Season Match
            if (p.start_month && p.end_month) {
                // ... (keep logic)
                if (p.start_month <= p.end_month) {
                    if (checkInMonth >= p.start_month && checkInMonth <= p.end_month) score += 20;
                    else match = false;
                } else {
                    if (checkInMonth >= p.start_month || checkInMonth <= p.end_month) score += 20;
                    else match = false;
                }
            }

            console.log(`Policy: ${p.name}, SiteType: ${p.site_type} vs ${campsiteType}, Match: ${match}, Score: ${score}`);

            return { policy: p, score, match };
        });

    const bestMatch = scoredPolicies
        .filter((p) => p.match)
        .sort((a, b) => b.score - a.score)[0];

    return bestMatch ? bestMatch.policy : DEFAULT_POLICY;
}

/**
 * Calculates how much is due now vs later based on the policy and total.
 */
export function calculatePaymentAmounts(
    totalAmount: number,
    policy: PaymentPolicy,
    checkInDate: Date
): PaymentBreakdown {
    let dueNow = totalAmount;
    let dueLater = 0;
    let depositAmount = 0;
    let remainderDueAt: Date | null = null;

    if (policy.policy_type === 'deposit') {
        if (policy.deposit_type === 'percent') {
            const pct = (policy.deposit_value || 0) / 100;
            depositAmount = Math.round(totalAmount * pct * 100) / 100;
        } else {
            // Fixed amount
            depositAmount = policy.deposit_value || 0;
        }

        // Sanity check: Deposit shouldn't exceed total (unless logic demands, but usually capped)
        if (depositAmount > totalAmount) {
            depositAmount = totalAmount;
        }

        dueNow = depositAmount;
        dueLater = totalAmount - depositAmount;

        // Calculate Due Date
        if (dueLater > 0 && policy.due_days_before_checkin) {
            remainderDueAt = new Date(checkInDate);
            remainderDueAt.setDate(remainderDueAt.getDate() - policy.due_days_before_checkin);
        }
    }

    return {
        totalAmount,
        policyApplied: policy,
        dueNow,
        dueLater,
        depositAmount,
        remainderDueAt
    };
}
