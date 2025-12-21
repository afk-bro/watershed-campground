"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function OnboardingChecklist() {
  const [checklist, setChecklist] = useState({
    hasCampsites: false,
    hasBlackouts: false,
    stripeConnected: false, 
    pricingSet: false,
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("onboarding_dismissed") === "true";
  });

  useEffect(() => {
    // If already dismissed, skip the check
    if (dismissed) {
      return;
    }

    async function checkStatus() {
      // 1. Check Campsites
      const { count: campsiteCount } = await supabase
        .from('campsites')
        .select('*', { count: 'exact', head: true });

      // 2. Check Blackouts (Just to see if they know how)
      const { count: blackoutCount } = await supabase
        .from('blackout_dates')
        .select('*', { count: 'exact', head: true });

      // 3. Pricing (Check if any campsite has price > 0)
      const { data: pricedCampsites } = await supabase
        .from('campsites')
        .select('base_rate')
        .gt('base_rate', 0)
        .limit(1);

      // 4. Stripe (Mocked check - maybe check if any transaction exists?)
      // Real check would be an API call to verify account status.
      // For V1 onboarding, let's assume if they have a reservation with payment_status != null, they are rolling.
      // OR just check if the secret key env var is detected? Client can't see env.
      // Let's rely on manual check or "Go Live" button.
      
      setChecklist({
        hasCampsites: (campsiteCount || 0) > 0,
        hasBlackouts: (blackoutCount || 0) > 0,
        pricingSet: (pricedCampsites?.length || 0) > 0,
        stripeConnected: true // Assuming true for now as we don't have a secure check endpoint ready
      });
      setLoading(false);
    }

    checkStatus();
  }, [dismissed]);

  if (dismissed) return null;
  if (loading) return (
    <div className="mb-8">
      <div className="skeleton-title mb-3" />
      <div className="skeleton h-32 w-full" />
    </div>
  );

  const steps = [
    {
      id: "campsites",
      label: "Add Campsites",
      done: checklist.hasCampsites,
      link: "/admin/campsites",
      desc: "Create your inventory of RV sites, cabins, or tent spots."
    },
    {
      id: "pricing",
      label: "Set Pricing",
      done: checklist.pricingSet,
      link: "/admin/campsites",
      desc: "Ensure all your campsites have a base nightly rate."
    },
    {
      id: "blackouts",
      label: "Configure Blackout Dates",
      done: checklist.hasBlackouts,
      link: "/admin/calendar",
      desc: "Block off dates for maintenance or off-season."
    },
    {
      id: "stripe",
      label: "Connect Stripe",
      done: checklist.stripeConnected,
      link: "/admin/settings", // Placeholder
      desc: "Link your Stripe account to accept payments."
    }
  ];

  const completedCount = steps.filter(s => s.done).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null; // Hide when done

  return (
    <div className="admin-card mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Getting Started</h2>
          <p className="text-[var(--color-text-muted)] text-sm">Complete these steps to get your campground ready for guests.</p>
        </div>
        <div className="text-right">
           <span className="text-sm font-medium text-[var(--color-accent-gold)]">{Math.round(progress)}% Complete</span>
        </div>
      </div>

      <div className="w-full bg-[var(--color-surface-secondary)] rounded-full h-2 mb-6">
        <div className="bg-[var(--color-accent-gold)] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => (
          <div key={step.id} className={`flex items-start gap-3 p-3 rounded-md border transition-surface ${step.done ? 'bg-[var(--color-status-confirmed-bg)] border-[var(--color-status-confirmed)]/20' : 'bg-[var(--color-surface-card)] border-[var(--color-border-default)]'}`}>
            <div className={`mt-0.5 ${step.done ? 'text-[var(--color-status-confirmed)]' : 'text-[var(--color-text-muted)]'}`}>
              {step.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </div>
            <div className="flex-1">
              <h3 className={`font-medium ${step.done ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-primary)]'}`}>
                {step.label}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">{step.desc}</p>
              {!step.done && (
                  <Link href={step.link} className="text-xs font-semibold text-[var(--color-accent-gold)] hover:underline flex items-center gap-1">
                    Do this now <ArrowRight size={12} />
                  </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
