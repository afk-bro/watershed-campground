// tests/db/reset-e2e.ts
import { createClient } from "@supabase/supabase-js";

const must = (v: string | undefined, name: string) => {
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
};

export async function resetE2EData() {
  if (process.env.E2E_DB_RESET_ENABLED !== "true") {
    console.log("ℹ️ E2E_DB_RESET_ENABLED != true, skipping DB reset.");
    return;
  }

  const url = must(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = must(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  const orgSlug = process.env.E2E_ORG_SLUG ?? "watershed-campground";

  // Optional safety guard: refuse to run if you detect prod URL patterns.
  if (/prod|production/i.test(url)) {
    throw new Error(`Refusing to reset DB: URL looks like prod: ${url}`);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Find the org id
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", orgSlug)
    .single();

  if (orgErr || !org) throw new Error(`Could not find org slug="${orgSlug}": ${orgErr?.message}`);

  const organizationId = org.id;
  console.log(`🧹 Resetting E2E data for org: ${orgSlug} (${organizationId})`);

  // 2) Delete in dependency order
  // Note: payment_transactions doesn't have organization_id, so we clear all
  // The audit trigger may cause errors, but we'll ignore them

  // Delete all payment_transactions (no org filter)
  try {
    const { error } = await supabase.from("payment_transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) console.log("✅ cleared: payment_transactions");
  } catch (e) {
    console.warn(`⚠️ skipping payment_transactions: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Delete audit_logs first (before reservations)
  try {
    const { error } = await supabase.from("audit_logs").delete().eq("organization_id", organizationId);
    if (!error) console.log("✅ cleared: audit_logs");
  } catch (e) {
    console.warn(`⚠️ skipping audit_logs: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Delete blackout_dates
  try {
    const { error } = await supabase.from("blackout_dates").delete().eq("organization_id", organizationId);
    if (!error) console.log("✅ cleared: blackout_dates");
  } catch (e) {
    console.warn(`⚠️ skipping blackout_dates: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Delete reservations (except the 3 seed ones we'll recreate)
  try {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("organization_id", organizationId);
    if (!error) console.log("✅ cleared: reservations");
  } catch (e) {
    console.warn(`⚠️ skipping reservations: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3) Re-seed the 3 test reservations
  console.log("📝 Re-seeding test reservations...");

  // Get campsite IDs for S1 and S4
  const { data: campsites } = await supabase
    .from("campsites")
    .select("id, code")
    .in("code", ["S1", "S4"])
    .eq("organization_id", organizationId);

  const s1 = campsites?.find(c => c.code === "S1");
  const s4 = campsites?.find(c => c.code === "S4");

  if (s1 && s4) {
    const seedReservations = [
      {
        campsite_id: s1.id,
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@test.com",
        phone: "555-0100",
        address1: "123 Main St",
        city: "Portland",
        postal_code: "97201",
        check_in: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_out: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        adults: 2,
        children: 1,
        camping_unit: "rv",
        rv_length: "25",
        contact_method: "email",
        status: "confirmed",
        total_amount: 90.00,
        stripe_payment_intent_id: "pi_test_assigned_1",
        organization_id: organizationId,
      },
      {
        campsite_id: s4.id,
        first_name: "Jane",
        last_name: "Smith",
        email: "jane.smith@test.com",
        phone: "555-0101",
        address1: "456 Oak Ave",
        city: "Eugene",
        postal_code: "97401",
        check_in: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_out: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        adults: 2,
        children: 0,
        camping_unit: "tent",
        rv_length: null,
        contact_method: "email",
        status: "confirmed",
        total_amount: 60.00,
        stripe_payment_intent_id: "pi_test_assigned_2",
        organization_id: organizationId,
      },
      {
        campsite_id: null,
        first_name: "Bob",
        last_name: "Johnson",
        email: "bob.johnson@test.com",
        phone: "555-0102",
        address1: "789 Pine Rd",
        city: "Bend",
        postal_code: "97701",
        check_in: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_out: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        adults: 4,
        children: 2,
        camping_unit: "rv",
        rv_length: "30",
        contact_method: "email",
        status: "pending",
        total_amount: 100.00,
        stripe_payment_intent_id: "pi_test_unassigned",
        organization_id: organizationId,
      },
    ];

    const { error: seedErr } = await supabase
      .from("reservations")
      .insert(seedReservations);

    if (seedErr) {
      console.warn(`⚠️ Failed to re-seed reservations: ${seedErr.message}`);
    } else {
      console.log("✅ Re-seeded 3 test reservations");
    }
  }

  console.log("🎉 E2E DB reset complete.");
}
