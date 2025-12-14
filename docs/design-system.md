# Watershed Campground Design System

> Production-ready design tokens, utilities, and component recipes for consistent UI development.

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

#### Primary Button
```tsx
<button className="px-4 py-2 bg-[var(--color-accent-gold)] text-[var(--color-text-inverse)] rounded-lg font-medium hover:opacity-90 transition-opacity">
  Primary Action
</button>
```

#### Secondary Button
```tsx
<button className="px-4 py-2 bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-lg font-medium hover:bg-[var(--color-surface-elevated)] transition-surface">
  Secondary Action
</button>
```

#### Ghost Button
```tsx
<button className="px-4 py-2 text-[var(--color-accent-gold)] hover:bg-[var(--color-surface-elevated)] rounded-lg transition-surface">
  Tertiary Action
</button>
```

### Form Inputs

#### Text Input
```tsx
<input
  type="text"
  className="w-full px-3 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-[var(--color-accent-gold)] focus:ring-2 focus:ring-[var(--color-accent-gold)]/20"
/>
```

#### Text Input with Error
```tsx
<input
  type="email"
  className="error-input"
/>
{error && <p className="error-text">{error}</p>}
```

#### Select Dropdown
```tsx
<select className="w-full px-3 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)]">
  <option>Option 1</option>
</select>
```

#### Textarea
```tsx
<textarea
  rows={4}
  className="w-full px-3 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] resize-y"
/>
```

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
