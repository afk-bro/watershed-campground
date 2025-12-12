CAMPGROUND SaaS – FULL PRODUCT ROADMAP
(Architecture • Features • DB Schema • APIs • Frontend Screens • Admin UX • Camper UX • Security • Deployment • Scaling)
0️⃣ Core Vision

Create a modern, simple, elegant campground reservation platform with:

Public booking (no login for campers)

Magic-link reservation management

Admin dashboards for campground owners

Super admin (you) for managing multiple campgrounds

Supabase for DB, Auth, RLS

Next.js for frontend + API routes

Stripe optional for payments

Extensible to multiple campgrounds (multi-tenant)

1️⃣ System Architecture
Tech Stack

Frontend: Next.js (App Router) + TailwindCSS

Backend: Supabase (Postgres, RLS, Functions, Auth)

Auth: Supabase Auth (admins only) + magic links for campers

DB: Normalized schema w/ relational constraints

APIs: Next.js Route Handlers using:

supabaseAdmin (service role) for admin

supabase (anon client) for public actions

Payments: Stripe Checkout (optional add-on)

Email Delivery: Resend

Hosting

Next.js → Vercel

Supabase → hosted project

Domain → Cloudflare (recommended)

2️⃣ Database Schema (v2 – Production Ready)
campgrounds (multi-tenant support)
id (uuid)
name (text)
description (text)
location (text)
contact_email (text)
created_at (timestamptz)
updated_at (timestamptz)

campsites
id (uuid)
campground_id (uuid) references campgrounds(id)
name (text)
type (text) -- rv, tent, cabin
max_occupancy (int)
is_active (boolean)
notes (text)
created_at
updated_at

reservations
id (uuid)
campground_id (uuid)
campsite_id (uuid)
guest_name
email
phone
arrival_date
departure_date
num_adults
num_children
notes
status (enum: pending, confirmed, cancelled, checked_in, checked_out, no_show)
public_edit_token_hash (text)
total_cost (numeric)
created_at
updated_at

admin_users

(Supabase auth.users + metadata)

role = 'camp_admin'
campground_id (uuid)

reservation_logs
id uuid
reservation_id uuid
admin_user_id uuid
action text
old_status enum
new_status enum
timestamp timestamptz

3️⃣ RLS Policies
Public (anon)

✔ Can insert into reservations
✔ Can update their own reservation via magic-link token (server-validated)

Authenticated Admins

✔ Can read/write all reservations for their campground
✔ Can manage campsites
✔ Can view reporting
✔ Cannot modify other campgrounds (multi-tenant isolation)

Super Admin

✔ Uses service role key
✔ Bypasses RLS
✔ Can onboard campgrounds
✔ Can create admin users

4️⃣ Feature Roadmap (Phased Development)
PHASE 1 — Core Reservation System (MVP)

(Already mostly built!)

✔ Reservation Form (public)

Name, email, phone

Dates

Site selection (later dynamic)

Notes

Inserts reservation w/ status = pending

Generates magic public edit token

Sends “reservation received” email

Sends “new reservation” email to admin

✔ Admin Login

Email/password

Protected /admin/* routes

✔ Admin Dashboard (v1)

View all reservations

Approve / cancel

Update status (all 6 lifecycle states)

Search & filter by status

✔ Magic-Link Management

Camper gets link

Can view reservation

Can cancel it

Cannot edit without validation

PHASE 2 — Campsite & Availability System
🎯 Add campsite management

/admin/campsites

Add/edit/delete sites

Toggle active/inactive

Assign type (RV/tent/cabin)

🎯 Availability checks

Before inserting reservation:

Prevent double-booking

Prevent overlapping stays

Allow availability check endpoint /api/availability

🎯 Public campsite selection UI

Show available sites for date range

Disable unavailable ones

PHASE 3 — Calendar View (Admin)

The “wow” feature for campground owners.

/admin/calendar

Rows = campsites

Columns = dates

Blocks = reservations

Color-coded by status

Click block → reservation detail drawer

Drag-and-drop (Phase 4)

Supporting API:

/api/admin/calendar to fetch data

Pre-aggregated SQL view for performance

PHASE 4 — Payments (Optional)
Stripe integration

Collect deposit or full payment

Auto-attach payment status to reservation

Refunds for cancellations

Add fields:
payment_status: unpaid, paid, refunded
payment_intent_id
amount_paid

Email automation:

Payment receipt

Payment failure warning

PHASE 5 — Reporting Dashboard
Metrics:

Occupancy by date range

Total reservations

Revenue (if Stripe enabled)

No-show rate

Most popular sites

Screens:

/admin/reports

Filters (date range, site, status)

Export CSV

DB Optimization:

Materialized views

Scheduled refresh (Supabase Cron)

PHASE 6 — Multi-Campground SaaS Platform

Turn your system into a multi-tenant SaaS.

Add:

campground_id everywhere

Admin users tied to specific campground

Super dashboard for you:

Create campgrounds

Create admin accounts

Manage billing (Stripe Billing optional)

Usage analytics

Tenant Isolation:

RLS ensures each admin only sees their own data

APIs accept campground_id via admin JWT

Tenant Branding:

Custom subdomains (mycampground.yourapp.com)

Custom theme per campground

Custom email sender address (via Resend domain linking)

PHASE 7 — Premium Add-ons
SMS Notifications

Twilio integration

Arrival reminders

Admin alerts

Add-ons Store

Firewood, extra vehicles, pets, etc.

Custom pricing rules

Seasonal & Long-Term Stays

Monthly billing

Metered utilities

Recurring invoices

Photo-rich campsite listings

Gallery upload

Site features (power, water, sewer, etc.)

5️⃣ APIs (Backend Contract)
Public APIs
POST /api/reservations         -- create reservation
POST /api/reservations/manage  -- fetch via magic token
POST /api/reservations/cancel  -- cancel via magic token
GET  /api/availability          -- check sites by dates

Admin APIs
GET    /api/admin/reservations
PATCH  /api/admin/reservations
GET    /api/admin/campsites
POST   /api/admin/campsites
PATCH  /api/admin/campsites
DELETE /api/admin/campsites
GET    /api/admin/calendar
POST   /api/admin/payments/refund

Super Admin APIs
POST /api/super/campgrounds
POST /api/super/create-admin
GET  /api/super/usage

6️⃣ Frontend Screens (Complete List)
Camper (Public)

Home

Campsite list

Campsite details

Reservation form

Reservation success page

Manage reservation page (magic link)

Admin (Campground Owner)

Login

Dashboard (KPIs)

Reservations list

Reservation detail drawer

Calendar view

Campsites management

Reports

Settings (change password)

Logout

Super Admin (You)

Master dashboard

Campground list

Create campground

Create admin user

SaaS analytics

Billing (optional)

7️⃣ Security Model (Final)
Public (Campers)

No Supabase auth

Only interact via controlled backend APIs

Never see admin data

Magic-link tokens hashed in DB

Admin Users

Supabase Auth email/password

Authenticated → RLS grants access to their campground only

Middleware protects /admin/*

Super Admin

Has service role key → used only in server routes

Can:

Create campgrounds

Create admin users

Query global stats

8️⃣ Deployment & Scaling Plan
Deployment

Vercel + Supabase = zero ops

Cloudflare DNS for domain & caching

Backup & Restore

Supabase scheduled backups

CSV exports for critical tables

Scaling

Switch from free → Pro Supabase plan

Add read replicas if needed

Enable Postgres row-level caching for heavy reports

Offload analytics to Materialized Views