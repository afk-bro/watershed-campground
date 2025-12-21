# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Watershed Campground is a Next.js 16 website for a riverside campground. Built with React 19, TypeScript, and Tailwind CSS 4.

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture

### Next.js App Router Structure

- Uses Next.js App Router with file-based routing in `app/`
- Each route has its own directory with a `page.tsx` file (e.g., `app/gallery/page.tsx`)
- Root layout at `app/layout.tsx` wraps all pages with Navbar and Footer

### Path Aliases

TypeScript is configured with `@/*` alias mapping to root directory:
```typescript
import { navLinks } from "@/lib/navLinks";
import Navbar from "@/components/Navbar";
```

However, the codebase currently uses relative imports (`../lib`, `../components`). When adding new files, follow the existing relative import pattern for consistency.

### Styling System

**Tailwind CSS 4** with custom brand colors defined in `app/globals.css`:
- `brand-forest` (#0b3d2e) - primary background
- `accent-gold` (#c8a75a) - headings, CTAs, active states
- `accent-beige` (#e9dfc7) - body text

**Typography:**
- Headings: Cormorant Garamond (loaded via `next/font/google`)
  - Use `font-heading` class or `--font-heading` variable
- Body: Inter font
  - Default body font, use `font-body` for explicit styling

### Component Architecture

All reusable components live in `components/`:
- **Layout components**: `Container`, `Hero`, `Navbar`, `Footer`
- **Content components**: `Card`, `SectionHeader`, `CTAButton`, `SiteGalleryGrid`
- Components are client-side by default (React 19 behavior)
- `Navbar` uses `"use client"` (implied by `usePathname` hook)

### Navigation

Central navigation configuration in `lib/navLinks.ts`:
- Single source of truth for all site navigation
- Export type `NavLink` with `href` and `label`
- Navbar consumes this for consistent routing

### Routes

Current routes:
- `/` - Homepage
- `/gallery` - Photo gallery
- `/rates` - Pricing information
- `/amenities` - Campground features
- `/things-to-do` - Nearby activities
- `/contact` - Contact information
- `/make-a-reservation` - Booking page

### Image Handling

Uses Next.js `<Image>` component for optimization:
- Hero images stored in `public/gallery/`
- Reference as `/gallery/img-1.jpg` (no `public/` prefix)
- Hero component uses `fill` with `priority` for above-fold images

## Code Patterns

### Page Structure
```typescript
// Typical page pattern
import Hero from "@/components/Hero";
import Container from "@/components/Container";
import SectionHeader from "@/components/SectionHeader";

export default function PageName() {
  return (
    <main>
      <Hero
        title="Page Title"
        subtitle="Subtitle"
        imageSrc="/gallery/image.jpg"
        cta={{ label: "Action", href: "/path" }}
      />
      <div className="py-12">
        <Container>
          <SectionHeader title="Section" subtitle="Description" />
          {/* Page content */}
        </Container>
      </div>
    </main>
  );
}
```

### Component Props Pattern
Components use TypeScript `type` for props (not `interface`):
```typescript
type Props = {
  title: string;
  subtitle?: string;
};

export default function Component({ title, subtitle }: Props) {
  // ...
}
```

## Important Notes

- The project uses **Tailwind CSS v4** with `@import "tailwindcss"` syntax in globals.css
- No Tailwind config file exists - configuration is inline in CSS via `@theme inline`
- The site has a fixed brand color scheme (forest green, gold, beige) - don't add dark mode
- Navbar is sticky with backdrop blur effect
- All pages follow the Hero → Container → Content pattern
