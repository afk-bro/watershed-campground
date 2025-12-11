-- Create the reservations table
create table public.reservations (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  address1 text not null,
  address2 text null,
  city text not null,
  postal_code text not null,
  check_in date not null,
  check_out date not null,
  adults integer not null default 0,
  children integer not null default 0,
  rv_length text not null,
  rv_year text null,
  camping_unit text not null,
  hear_about text null,
  contact_method text not null,
  comments text null,
  status text not null default 'pending'::text,
  constraint reservations_pkey primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.reservations enable row level security;

-- Policy: Allow ANONYMOUS INSERT (Open for public reservation form)
create policy "Allow public inserts"
  on public.reservations
  for insert
  to anon
  with check (true);

-- Policy: Allow SERVICE_ROLE to do everything (Admin / API Route with Service Key if needed, but here we use Anon for insert)
-- Note: By default, service_role bypasses RLS, but explicit policies help clarity.
