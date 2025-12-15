# What a Proper Help Module Actually Is (and Is Not)

### ❌ What it should NOT be

* A dump of technical documentation
* A long FAQ page nobody reads
* A separate “manual” they must learn first
* Screenshots with no context

### ✅ What it SHOULD be

* **Task-based**
* **Searchable**
* **Contextual**
* **Reassuring**
* **Always available**

Think:

> “I forgot how to do X — help me *right now*.”

---

# The Right Mental Model

There are **3 layers of help**, and you should implement all three over time.

```
Inline Help  →  Help Center  →  Deep Reference
```

You already started Layer 1 with overlays and empty states — good.

---

# Layer 1: Inline & Contextual Help (You’re Already Doing This)

This is **just-in-time learning**.

### Examples (you already have some)

* Instructional overlays (Blackout Dates)
* Empty state helpers
* Tooltips on icons
* Micro-copy under form fields

### Best practices

* Only explain *what’s needed right now*
* Never explain everything at once
* Avoid jargon

👉 Keep doing this. It reduces the need for Help Center visits.

---

# Layer 2: Admin Help Center (This Is What You’re Building Now)

This is the **main Help module**.

## Where it lives

**Admin top-right corner**:

* `? Help` or `Help & Support`

Click opens:

* Dedicated `/admin/help` page **OR**
* Slide-out panel (preferred later)

---

## Structure of the Help Center (This Matters)

### 1. Task-Based Categories (Not Features)

Campground owners don’t think in “modules,” they think in *tasks*.

#### Recommended top-level sections

### 🏕️ Getting Started

* Setting up your campground
* Campsites & availability
* Blackout dates & closures
* Pricing & seasons
* First reservation

### 📅 Reservations & Calendar

* Creating a reservation
* Editing or moving reservations
* Blackout dates
* Understanding colors & symbols
* Overbooking & conflicts

### 💳 Payments & Policies

* Deposits vs full payment
* Refunds & cancellations
* Payment status meanings
* Stripe basics (high-level)

### 👤 Guests & Communication

* Guest information
* Confirmation emails
* Updating guest details
* Resending emails

### ⚙️ Settings & Admin

* Admin accounts
* Passwords & login
* Campground details
* Taxes & fees

### 🆘 Troubleshooting

* “A guest says they paid but I don’t see it”
* “Dates are blocked unexpectedly”
* “I made a mistake — how do I undo it?”

---

### 2. Article Format (Very Important)

Each help article should follow **this exact structure**:

#### Title

> Add Blackout Dates to the Calendar

#### Short summary (1 sentence)

> Block dates so guests cannot book during closures, maintenance, or private use.

#### When you’d use this

* Seasonal closures
* Repairs
* Owner stays
* Special events

#### How to do it (steps)

1. Go to **Admin → Calendar**
2. Click and drag across the dates
3. Select **Blackout Date**
4. Add an optional reason
5. Save

#### What happens next

* Dates appear with diagonal stripes
* Guests can’t book these dates
* You can edit or delete them later

#### Tips (optional)

* You can create blackout dates across multiple sites
* Blackouts don’t send guest emails

This format builds confidence and reduces support tickets.

---

### 3. Search (Critical)

A Help module without search is basically useless.

Even a **simple client-side search** that filters article titles + keywords is enough.

Users will type:

* “block dates”
* “close campground”
* “blackout”
* “reservation wrong”

Make sure your content includes those words.

---

# Layer 3: Deep Reference (Add Later)

This is **for power users**, not everyone.

Examples:

* Payment status definitions
* Reservation lifecycle states
* Availability logic explanation
* Calendar color legend

This can live as:

* “Learn more” links
* Accordion sections inside articles

---

# How Much Content Do You Actually Need Right Now?

**MVP Help Module**

* ~10–15 articles
* Covers the top 80% of actions
* Focus on “I’m stuck” moments

Start with:

* Calendar basics
* Blackout dates
* Creating/editing reservations
* Payments at a high level
* Common mistakes

You do **not** need everything on day one.

---

# UX Patterns That Work Well

### 1. Contextual “View Help” Links

Example:

* On the calendar page:

  > “Need help with blackout dates?” → links to article

### 2. Highlight from Onboarding

Once onboarding is done:

> “You can always find help in the Help section.”

### 3. Calm, Reassuring Tone

Avoid:

* “Error”
* “Invalid”
* “Failure”

Prefer:

* “Here’s what’s happening”
* “You can fix this by…”

---

# What This Communicates About Your Product

A good Help module says:

* “This system is safe to use”
* “You won’t break anything”
* “You don’t need to be technical”
* “We thought about your future self”
