drop extension if exists "pg_net";

create type "public"."reservation_status" as enum ('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'no_show');

drop trigger if exists "update_payment_transactions_updated_at" on "public"."payment_transactions";

drop policy "Addons are deletable by authenticated users only" on "public"."addons";

drop policy "Addons are insertable by authenticated users only" on "public"."addons";

drop policy "Addons are updatable by authenticated users only" on "public"."addons";

drop policy "Addons are viewable by everyone" on "public"."addons";

drop policy "All addons are viewable by authenticated users" on "public"."addons";

drop policy "Payment policies are deletable by authenticated users only" on "public"."payment_policies";

drop policy "Payment policies are insertable by authenticated users only" on "public"."payment_policies";

drop policy "Payment policies are updatable by authenticated users only" on "public"."payment_policies";

drop policy "Payment policies are viewable by everyone" on "public"."payment_policies";

drop policy "Authenticated full access to payment_transactions" on "public"."payment_transactions";

drop policy "Service role full access to payment_transactions" on "public"."payment_transactions";

drop policy "Authenticated full access to reservations" on "public"."reservations";

drop policy "Service role full access to reservations" on "public"."reservations";

alter table "public"."addons" drop constraint "addons_price_check";

alter table "public"."payment_transactions" drop constraint "payment_transactions_amount_check";

alter table "public"."reservations" drop constraint "check_adults_min";

alter table "public"."reservations" drop constraint "check_children_min";

alter table "public"."reservations" drop constraint "check_dates";

alter table "public"."reservations" drop constraint "check_rv_length_valid";

alter table "public"."reservations" drop constraint "check_total_amount_positive";

alter table "public"."reservations" drop constraint "prevent_overlapping_reservations";

alter table "public"."reservations" drop constraint "reservations_adults_check";

alter table "public"."reservations" drop constraint "reservations_amount_paid_check";

alter table "public"."reservations" drop constraint "reservations_balance_due_check";

alter table "public"."reservations" drop constraint "reservations_children_check";

alter table "public"."reservations" drop constraint "reservations_total_amount_check";

alter table "public"."payment_policies" drop constraint "payment_policies_campsite_id_fkey";

alter table "public"."payment_transactions" drop constraint "payment_transactions_reservation_id_fkey";

drop index if exists "public"."idx_addons_category";

drop index if exists "public"."idx_addons_is_active";

drop index if exists "public"."idx_payment_policies_campsite_id";

drop index if exists "public"."idx_payment_policies_policy_type";

drop index if exists "public"."idx_payment_policies_site_type";

drop index if exists "public"."idx_payment_transactions_reservation_id";

drop index if exists "public"."idx_payment_transactions_stripe_pi";

drop index if exists "public"."idx_reservations_archived_at";

drop index if exists "public"."idx_reservations_email_sent";

drop index if exists "public"."idx_reservations_stripe_pi";

select 1; 
-- drop index if exists "public"."prevent_overlapping_reservations";

drop index if exists "public"."idx_reservations_status";

-- Avoid dropping the primary key index directly; it is required by the PK constraint.
-- Keeping existing PK intact prevents migration failures locally.
-- drop index if exists "public"."payment_policies_pkey";


  create table "public"."reservation_addons" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "reservation_id" uuid,
    "addon_id" uuid,
    "quantity" integer not null default 1,
    "price_at_booking" numeric(10,2) not null
      );


alter table "public"."reservation_addons" enable row level security;

alter table "public"."addons" drop column "updated_at";

alter table "public"."addons" alter column "category" drop not null;

alter table "public"."addons" alter column "price" set default 0.00;

alter table "public"."payment_policies" drop column "updated_at";

alter table "public"."payment_policies" alter column "deposit_value" set default 0.00;

alter table "public"."payment_policies" alter column "due_days_before_checkin" set default 0;

alter table "public"."payment_policies" alter column "id" set default gen_random_uuid();

alter table "public"."payment_policies" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."payment_transactions" drop column "error_message";

alter table "public"."payment_transactions" drop column "stripe_charge_id";

alter table "public"."payment_transactions" drop column "updated_at";

alter table "public"."payment_transactions" alter column "currency" set default 'cad'::text;

alter table "public"."payment_transactions" alter column "status" drop default;

alter table "public"."payment_transactions" alter column "type" set not null;

alter table "public"."reservations" drop column "email_sent_at";

alter table "public"."reservations" drop column "metadata";

alter table "public"."reservations" add column "archived_by" uuid;

alter table "public"."reservations" add column "public_edit_token_expires_at" timestamp with time zone;

alter table "public"."reservations" alter column "adults" set default 0;

alter table "public"."reservations" alter column "amount_paid" set default 0.00;

alter table "public"."reservations" alter column "amount_paid" set not null;

alter table "public"."reservations" alter column "balance_due" set default 0.00;

alter table "public"."reservations" alter column "rv_length" set not null;

alter table "public"."reservations" alter column "status" set default 'pending'::public.reservation_status;

alter table "public"."reservations" alter column "status" set data type public.reservation_status using "status"::public.reservation_status;

alter table "public"."reservations" alter column "total_amount" set default 0.00;

alter table "public"."reservations" alter column "updated_at" drop not null;

drop extension if exists "btree_gist";

CREATE INDEX idx_reservations_created_at ON public.reservations USING btree (created_at);

CREATE UNIQUE INDEX reservation_addons_pkey ON public.reservation_addons USING btree (id);

CREATE INDEX idx_reservations_status ON public.reservations USING btree (status);

-- Preserve existing primary key; do not recreate the index here.
-- CREATE UNIQUE INDEX payment_policies_pkey ON public.payment_policies USING btree (id);

alter table "public"."reservation_addons" add constraint "reservation_addons_pkey" PRIMARY KEY using index "reservation_addons_pkey";

alter table "public"."addons" add constraint "addons_category_check" CHECK ((category = ANY (ARRAY['merchandise'::text, 'service'::text, 'rental'::text, 'other'::text]))) not valid;

alter table "public"."addons" validate constraint "addons_category_check";

alter table "public"."payment_transactions" add constraint "payment_transactions_status_check" CHECK ((status = ANY (ARRAY['succeeded'::text, 'pending'::text, 'failed'::text]))) not valid;

alter table "public"."payment_transactions" validate constraint "payment_transactions_status_check";

alter table "public"."payment_transactions" add constraint "payment_transactions_type_check" CHECK ((type = ANY (ARRAY['deposit'::text, 'balance'::text, 'full'::text, 'refund'::text]))) not valid;

alter table "public"."payment_transactions" validate constraint "payment_transactions_type_check";

alter table "public"."reservation_addons" add constraint "reservation_addons_addon_id_fkey" FOREIGN KEY (addon_id) REFERENCES public.addons(id) not valid;

alter table "public"."reservation_addons" validate constraint "reservation_addons_addon_id_fkey";

alter table "public"."reservation_addons" add constraint "reservation_addons_reservation_id_fkey" FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE not valid;

alter table "public"."reservation_addons" validate constraint "reservation_addons_reservation_id_fkey";

alter table "public"."reservations" add constraint "check_out_after_check_in" CHECK ((check_out > check_in)) not valid;

alter table "public"."reservations" validate constraint "check_out_after_check_in";

alter table "public"."reservations" add constraint "reservations_payment_status_check" CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'deposit_paid'::text]))) not valid;

alter table "public"."reservations" validate constraint "reservations_payment_status_check";

alter table "public"."payment_policies" add constraint "payment_policies_campsite_id_fkey" FOREIGN KEY (campsite_id) REFERENCES public.campsites(id) not valid;

alter table "public"."payment_policies" validate constraint "payment_policies_campsite_id_fkey";

alter table "public"."payment_transactions" add constraint "payment_transactions_reservation_id_fkey" FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) not valid;

alter table "public"."payment_transactions" validate constraint "payment_transactions_reservation_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_reservation_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (reservation_id, action, new_data, changed_by)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (reservation_id, action, old_data, new_data, changed_by)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (reservation_id, action, old_data, changed_by)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

grant select on table "public"."addons" to "authenticator";

grant select on table "public"."audit_logs" to "authenticator";

grant delete on table "public"."blackout_dates" to "authenticator";

grant insert on table "public"."blackout_dates" to "authenticator";

grant select on table "public"."blackout_dates" to "authenticator";

grant update on table "public"."blackout_dates" to "authenticator";

grant select on table "public"."campsites" to "authenticator";

grant select on table "public"."payment_policies" to "authenticator";

grant select on table "public"."payment_transactions" to "authenticator";

grant select on table "public"."rate_limits" to "authenticator";

grant delete on table "public"."reservation_addons" to "anon";

grant insert on table "public"."reservation_addons" to "anon";

grant references on table "public"."reservation_addons" to "anon";

grant select on table "public"."reservation_addons" to "anon";

grant trigger on table "public"."reservation_addons" to "anon";

grant truncate on table "public"."reservation_addons" to "anon";

grant update on table "public"."reservation_addons" to "anon";

grant delete on table "public"."reservation_addons" to "authenticated";

grant insert on table "public"."reservation_addons" to "authenticated";

grant references on table "public"."reservation_addons" to "authenticated";

grant select on table "public"."reservation_addons" to "authenticated";

grant trigger on table "public"."reservation_addons" to "authenticated";

grant truncate on table "public"."reservation_addons" to "authenticated";

grant update on table "public"."reservation_addons" to "authenticated";

grant select on table "public"."reservation_addons" to "authenticator";

grant delete on table "public"."reservation_addons" to "service_role";

grant insert on table "public"."reservation_addons" to "service_role";

grant references on table "public"."reservation_addons" to "service_role";

grant select on table "public"."reservation_addons" to "service_role";

grant trigger on table "public"."reservation_addons" to "service_role";

grant truncate on table "public"."reservation_addons" to "service_role";

grant update on table "public"."reservation_addons" to "service_role";

grant select on table "public"."reservations" to "authenticator";

grant select on table "public"."webhook_events" to "authenticator";


  create policy "Allow authenticated read all addons"
  on "public"."addons"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow public read of active addons"
  on "public"."addons"
  as permissive
  for select
  to anon
using ((is_active = true));



  create policy "Allow service_role full access addons"
  on "public"."addons"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow public read of payment policies"
  on "public"."payment_policies"
  as permissive
  for select
  to anon
using (true);



  create policy "Allow service_role full access policies"
  on "public"."payment_policies"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated read own transactions"
  on "public"."payment_transactions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow service_role full access transactions"
  on "public"."payment_transactions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated full access reservation_addons"
  on "public"."reservation_addons"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Allow public insert reservation_addons"
  on "public"."reservation_addons"
  as permissive
  for insert
  to anon
with check (true);



  create policy "Allow authenticated users to read all reservations"
  on "public"."reservations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to update all reservations"
  on "public"."reservations"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Allow service_role full access"
  on "public"."reservations"
  as permissive
  for all
  to service_role
using (true)
with check (true);



