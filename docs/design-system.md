# Watershed Campground Design System

> Production-ready design tokens, utilities, and component recipes for consistent UI development.

---

## 🔒 System Status: STABLE & FROZEN

**Status:** Production-ready and locked as of **2025-01-14**

**This design system is now frozen.** No new tokens should be added without team review.

### Rules for Changes

1. **NO NEW TOKENS** unless a clear category emerges
   - Don't add one-off colors for specific components
   - If you need a new color/token 3+ times, propose it as a semantic token

2. **PREFER COMPOSITION** over expansion
   - Combine existing tokens in new ways
   - Example: `bg-[var(--color-surface-card)] border-[var(--color-border-strong)]`
   - Don't create new tokens for every UI variant

3. **CHANGES REQUIRE REVIEW**
   - Discuss additions in team meetings
   - Update this documentation with clear rationale
   - Run `npm run lint` to verify no violations

**Why freeze?** Token bloat is the #1 failure mode of design systems. A small, well-composed system is better than a sprawling one.

---

## Table of Contents
- [Core Principles](#core-principles)
- [Design Tokens](#design-tokens)
- [Component Recipes](#component-recipes)
- [Utility Classes](#utility-classes)
- [Anti-Patterns](#anti-patterns)
- [Migration Guide](#migration-guide)

---

## Core Principles

### ✅ DO Use:
- **Semantic tokens** (`--color-surface-card`, `--color-text-primary`)
- **Utility classes** (`.admin-card`, `.section-lg`, `.skeleton`)
- **Design system components** (buttons, inputs with consistent styling)

### ❌ DON'T Use:
- **Raw Tailwind colors** (`bg-white`, `text-slate-700`, `bg-emerald-100`)
- **Hardcoded hex values** (`#06251c` - use tokens instead)
- **Inconsistent spacing** (use `.section-*` utilities)

### Why?
- **Single source of truth** - Theme updates happen in one place
- **Semantic meaning** - `--color-text-muted` is clearer than `text-slate-500`
- **Future-proof** - Easy to add dark mode or rebrand
- **Consistency** - UI doesn't drift over time

---

## Design Tokens

### Color Tokens

#### Brand Colors
```css
--color-brand-forest: #06251c        /* Primary brand */
--color-navbar-forest: #042c21       /* Navbar variant */
--color-accent-gold: #c8a75a         /* Primary accent */
--color-accent-gold-dark: #d4c08a    /* Hover states */
--color-accent-beige: #e9dfc7        /* Body text */
```

#### Semantic Surface Tokens
```css
--color-surface-primary: #06251c     /* Main background */
--color-surface-secondary: #083a2c   /* Slightly lighter */
--color-surface-card: #0a3f30        /* Card backgrounds */
--color-surface-elevated: #0d4538    /* Hover/active states */
--color-surface-overlay: rgba(6, 37, 28, 0.95)  /* Modals */
```

**Usage:**
```tsx
// ✅ Good
<div className="bg-[var(--color-surface-card)]">

// ❌ Bad
<div className="bg-brand-forest/80">
```

#### Semantic Text Tokens
```css
--color-text-primary: #e9dfc7       /* Body text */
--color-text-secondary: #cbbfa5     /* Secondary text */
--color-text-muted: #b8aa8f         /* Muted/disabled (WCAG AA) */
--color-text-inverse: #06251c       /* Text on light backgrounds */
--color-text-accent: #c8a75a        /* Links, highlights */
```

#### Semantic Border Tokens
```css
--color-border-subtle: rgba(200, 167, 90, 0.15)
--color-border-default: rgba(200, 167, 90, 0.25)
--color-border-strong: rgba(200, 167, 90, 0.4)
```

#### Admin Status Colors
```css
--color-status-pending: #c8a75a      /* Gold (harmonized) */
--color-status-confirmed: #7fb069    /* Sage green */
--color-status-cancelled: #c97064    /* Muted rust */
--color-status-active: #5ca3b8       /* Teal */
--color-status-neutral: #8a9ba8      /* Slate gray */
```

**Usage:**
```tsx
// ✅ Good
<span className="bg-[var(--color-status-confirmed-bg)] text-[var(--color-status-confirmed)]">

// ❌ Bad
<span className="bg-emerald-100 text-emerald-800">
```

#### Error/Success States
```css
--color-error: #c97064
--color-success: #7fb069
--color-warning: #d4a03a
```

---

## Component Recipes

### Buttons

**Use utility classes for consistency.** These 4 button types cover 90% of use cases.

#### Primary Button (Main Actions)
```tsx
// ✅ Preferred - use utility class
<button className="btn-primary">Save Changes</button>

// Also valid - manual composition
<button className="px-4 py-2 bg-[var(--color-accent-gold)] text-[var(--color-text-inverse)] rounded-lg font-medium hover:opacity-90 transition-opacity">
  Primary Action
</button>
```

#### Secondary Button (Alternative Actions)
```tsx
// ✅ Preferred - use utility class
<button className="btn-secondary">Cancel</button>

// Also valid - manual composition
<button className="px-4 py-2 bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-lg font-medium hover:bg-[var(--color-surface-elevated)] transition-surface">
  Secondary Action
</button>
```

#### Danger Button (Destructive Actions)
```tsx
// ✅ Preferred - use utility class
<button className="btn-danger">Delete Reservation</button>
```

#### Ghost Button (Tertiary Actions)
```tsx
// ✅ Preferred - use utility class
<button className="btn-ghost">View Details</button>

// Also valid - manual composition
<button className="px-4 py-2 text-[var(--color-accent-gold)] hover:bg-[var(--color-surface-elevated)] rounded-lg transition-surface">
  Tertiary Action
</button>
```

### Form Inputs

**Use utility classes for all form inputs.** This ensures consistent styling and focus states.

#### Complete Form Example
```tsx
<div>
  <label className="label">Email Address</label>
  <input type="email" className="input" placeholder="you@example.com" />
  <p className="help-text">We'll never share your email</p>
</div>

<div>
  <label className="label-required">Password</label>
  <input type="password" className="input" />
  {error && <p className="error-text">{error}</p>}
</div>

<div>
  <label className="label">Country</label>
  <select className="select">
    <option>United States</option>
    <option>Canada</option>
  </select>
</div>

<div>
  <label className="label">Message</label>
  <textarea rows={4} className="textarea"></textarea>
</div>
```

#### Individual Components

**Text Input**
```tsx
// ✅ Preferred - use utility class
<input type="text" className="input" />
```

**Select Dropdown**
```tsx
// ✅ Preferred - use utility class
<select className="select">
  <option>Option 1</option>
</select>
```

**Textarea**
```tsx
// ✅ Preferred - use utility class
<textarea rows={4} className="textarea"></textarea>
```

**Labels & Helpers**
```tsx
// Standard label
<label className="label">Field Name</label>

// Required field label (adds red asterisk)
<label className="label-required">Email</label>

// Help text (muted, small)
<p className="help-text">Additional context</p>

// Error text (red, small)
<p className="error-text">This field is required</p>
```

---

### 🔒 Locked Form Primitives

**These 11 classes cover 90% of admin UI needs. They are frozen and should NOT be expanded.**

**Buttons (4):**
- `.btn-primary` - Main actions (Save, Submit, Create)
- `.btn-secondary` - Alternative actions (Cancel, Back)
- `.btn-danger` - Destructive actions (Delete, Remove)
- `.btn-ghost` - Tertiary actions (View, Edit, Details)

**Form Inputs (3):**
- `.input` - Text fields, email, password, date, etc.
- `.select` - Dropdown selectors
- `.textarea` - Multi-line text input

**Labels & Helpers (4):**
- `.label` - Standard form label
- `.label-required` - Label with red asterisk
- `.help-text` - Muted helper text
- `.error-text` - Error message text

**Once these exist, 90% of admin UI work becomes mechanical.** Use composition for variants.

---

### Cards & Surfaces

#### Admin Card
```tsx
<div className="admin-card">
  <h3 className="text-lg font-bold text-[var(--color-text-inverse)] mb-2">Card Title</h3>
  <p className="text-[var(--color-text-muted)]">Card content</p>
</div>
```

#### Admin Table
```tsx
<div className="admin-table">
  <table className="w-full">
    <thead className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-default)]">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[var(--color-border-subtle)]">
      <tr className="hover:bg-[var(--color-surface-elevated)] transition-surface">
        <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Utility Classes

### Layout - Section Spacing
```tsx
// Instead of: <section className="py-32">
<section className="section-hero">   {/* 128px padding */}

// Instead of: <section className="py-20">
<section className="section-lg">     {/* 80px padding */}

// Instead of: <section className="py-16">
<section className="section-md">     {/* 64px padding */}
```

### Loading States
```tsx
{loading && (
  <div className="animate-fade-in">
    <div className="skeleton-title mb-3" />
    <div className="skeleton-text mb-2" />
    <div className="skeleton-text w-3/4" />
  </div>
)}
```

### Error States
```tsx
{error && (
  <div className="error-message">
    <strong>Error:</strong> {error}
  </div>
)}
```

### Success States
```tsx
{success && (
  <div className="success-message">
    Reservation confirmed!
  </div>
)}
```

### Animations
```tsx
// Hover lift effect
<div className="hover-lift">
  <Card />
</div>

// Fade in on mount
<div className="animate-fade-in">
  <Content />
</div>

// Smooth surface transitions
<button className="transition-surface">
  Click me
</button>
```

---

## Anti-Patterns

### ❌ Don't Mix Old & New Systems
```tsx
// BAD - mixing semantic tokens with raw Tailwind
<div className="bg-[var(--color-surface-card)] text-slate-700">
```

```tsx
// GOOD - use semantic tokens consistently
<div className="bg-[var(--color-surface-card)] text-[var(--color-text-primary)]">
```

### ❌ Don't Hardcode Colors
```tsx
// BAD
<div className="bg-brand-forest/80">
<div className="text-accent-beige/90">
```

```tsx
// GOOD
<div className="bg-[var(--color-surface-card)]">
<div className="text-[var(--color-text-primary)]">
```

### ❌ Don't Use Generic Tailwind for Admin UI
```tsx
// BAD
<div className="bg-white border border-gray-200">
```

```tsx
// GOOD
<div className="admin-card">
```

---

## Migration Guide

### Step 1: Find Old Colors
Search for these patterns in your code:
- `bg-white`
- `bg-slate-*`
- `text-slate-*`
- `border-slate-*`
- `bg-emerald-*`, `bg-amber-*`, `bg-rose-*`, `bg-blue-*`

### Step 2: Replace with Semantic Tokens

| Old Pattern | New Pattern |
|-------------|-------------|
| `bg-white` | `bg-[var(--color-surface-card)]` or `.admin-card` |
| `text-slate-900` | `text-[var(--color-text-inverse)]` |
| `text-slate-700` | `text-[var(--color-text-primary)]` |
| `text-slate-500` | `text-[var(--color-text-muted)]` |
| `border-slate-200` | `border-[var(--color-border-default)]` |
| `bg-slate-50` (hover) | `hover:bg-[var(--color-surface-elevated)]` |
| `bg-emerald-100` | `bg-[var(--color-status-confirmed-bg)]` |
| `bg-amber-100` | `bg-[var(--color-status-pending-bg)]` |
| `bg-rose-100` | `bg-[var(--color-status-cancelled-bg)]` |

### Step 3: Apply Utilities
- Replace `py-20` → `.section-lg`
- Replace loading divs → `.skeleton-*`
- Replace error text → `.error-message`
- Replace card divs → `.admin-card`

---

## ESLint Rules (Recommended)

Add to `.eslintrc.json` to prevent regressions:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "warn",
      {
        "selector": "Literal[value=/bg-white|bg-slate-|text-slate-|border-slate-|bg-emerald-|bg-amber-/]",
        "message": "Use semantic design tokens instead of raw Tailwind colors"
      }
    ]
  }
}
```

---

## Questions?

**"Can I still use Tailwind utilities?"**
Yes! Tailwind is great for layout (`flex`, `grid`, `px-4`). Just avoid hardcoded colors.

**"When should I create a new token?"**
When you find yourself using the same color/value 3+ times.

**"Can I use opacity modifiers?"**
Yes, but prefer semantic tokens: `bg-[var(--color-surface-card)]` over `bg-brand-forest/80`

**"How do I update the theme?"**
Edit `app/globals.css` `:root` section. All components update automatically!

---

**Last updated:** 2025-01-14
**Maintained by:** Design System Team
