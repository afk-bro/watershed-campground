# Mobile Responsiveness QA Checklist

## Overview

This checklist provides a comprehensive guide for testing mobile responsiveness across all pages of the Watershed Campground website. Use this for manual testing of new pages, pre-release quality checks, code reviews, and onboarding new developers.

**Mobile Breakpoint:** `< 768px` (phone), `>= 768px` (tablet/desktop)

**Key Viewports to Test:**
- **Phone Portrait:** 390x844 (iPhone 12 Pro) - PRIMARY MOBILE TARGET
- **Phone Landscape:** 844x390
- **Tablet Portrait:** 768x1024 (iPad)
- **Tablet Landscape:** 1024x768
- **Desktop:** 1280x720 or larger

**Related Documentation:**
- Automated tests: `/tests/admin/mobile-features.spec.ts`, `/tests/admin/responsive-reservations.spec.ts`
- Responsive components: `/components/responsive/`
- Design system: `/docs/design-system.md`

---

## Quick Reference: Test Execution

### Browser DevTools Testing
1. Open Chrome/Firefox DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select "Responsive" or specific device
4. Test at: 390px, 768px, 1280px widths
5. Test both portrait and landscape orientations
6. Use throttling to simulate slower networks

### Physical Device Testing
1. Test on actual iOS and Android devices when possible
2. Clear browser cache before testing
3. Test in both portrait and landscape
4. Test with and without browser UI visible (affects vh units)

### Automated Testing
```bash
# Run all responsive tests
npx playwright test tests/admin/responsive-reservations.spec.ts
npx playwright test tests/admin/mobile-features.spec.ts

# Run with headed mode to see visual behavior
npx playwright test --headed

# Debug a specific test
npx playwright test --debug
```

---

## Section 1: Layout & Visual Testing

### 1.1 Viewport Breakpoint Transitions

**Test at exactly 768px (breakpoint boundary):**

- [ ] Page renders correctly at 767px (mobile)
- [ ] Page renders correctly at 768px (desktop)
- [ ] Page renders correctly at 769px (desktop)
- [ ] No broken layouts at boundary
- [ ] No horizontal scrolling at any width
- [ ] No content cut off or hidden
- [ ] Transitions are smooth, not jarring

**Common Issues to Watch For:**
- Elements overlapping at breakpoint
- Sudden jumps or shifts in layout
- Hidden content that should be visible
- Horizontal scrollbar appearing

### 1.2 Content Reflow

**Phone (< 768px):**

- [ ] Single column layout for main content
- [ ] No elements wider than viewport
- [ ] Images scale proportionally
- [ ] Text doesn't overflow containers
- [ ] Tables convert to cards/stacks (see Section 5)
- [ ] Multi-column grids collapse to single column
- [ ] Adequate spacing between stacked elements (minimum 12px)

**Tablet (768px - 1024px):**

- [ ] Layout utilizes available space efficiently
- [ ] Appropriate number of columns (typically 2-3)
- [ ] Text line length remains readable (45-75 characters)
- [ ] Sidebars stack or collapse appropriately

**Desktop (> 1024px):**

- [ ] Maximum content width constrains for readability
- [ ] Multi-column layouts display correctly
- [ ] Whitespace used effectively
- [ ] No awkward gaps or stretching

### 1.3 Typography & Readability

**Font Sizes (minimum requirements):**

- [ ] Body text: >= 16px on phone (14px acceptable for labels)
- [ ] Headings: Appropriately scaled for viewport
- [ ] Line height: 1.5-1.6 for body text
- [ ] Letter spacing: No compressed text on mobile

**Text Layout:**

- [ ] No truncated text (unless intentional with ellipsis)
- [ ] Headings don't orphan (single word on line)
- [ ] Links are distinguishable (color + underline)
- [ ] Sufficient contrast (minimum 4.5:1 for body text)
- [ ] Text doesn't overlap with other elements

### 1.4 Images & Media

- [ ] Images load and display correctly
- [ ] Images scale without distortion (maintain aspect ratio)
- [ ] Retina/high-DPI images used where appropriate
- [ ] Background images position correctly
- [ ] Alt text present for all images
- [ ] No layout shift while images load (explicit width/height)
- [ ] Videos are responsive and controls accessible
- [ ] Image file sizes appropriate for mobile (not desktop-sized)

### 1.5 Spacing & Whitespace

**Padding/Margins:**

- [ ] Adequate padding on containers (minimum 16px on phone)
- [ ] Consistent spacing between sections
- [ ] No edge-to-edge content (except intentional full-bleed)
- [ ] Comfortable breathing room around all elements

**Specific Measurements:**

- [ ] Card padding: >= 16px (see DataCard component)
- [ ] Form field spacing: >= 12px vertical
- [ ] Section spacing: >= 24px between major sections
- [ ] Button spacing: >= 8px between adjacent buttons

---

## Section 2: Touch Interaction & Tap Targets

### 2.1 Touch Target Sizes

**Minimum Standards:**
- **iOS HIG:** 44x44px (recommended)
- **Material Design:** 48x48px (recommended)
- **Acceptable:** 40x40px (minimum for testing)

**Elements to Check:**

- [ ] **Buttons:** >= 44px height
  - Primary CTAs should be 48-56px
  - Icon-only buttons >= 44x44px
- [ ] **Links:** >= 44px clickable area
  - Standalone links should have padding to reach minimum
- [ ] **Form inputs:** >= 44px height
  - Text inputs, selects, textareas
- [ ] **Checkboxes/Radio:** >= 24px with >= 44px tap area
  - Include label in tap target
- [ ] **Navigation items:** >= 44px tap area
- [ ] **Card tap areas:** Entire card tappable (if interactive)
- [ ] **Action menus:** Menu triggers >= 44x44px

**Testing Method:**
```javascript
// In DevTools console:
const button = document.querySelector('button');
const box = button.getBoundingBox();
console.log(`Width: ${box.width}, Height: ${box.height}`);
```

### 2.2 Touch Target Spacing

- [ ] Minimum 8px spacing between adjacent tap targets
- [ ] 12px preferred for critical actions (delete, confirm, etc.)
- [ ] Navigation items spaced to prevent mis-taps
- [ ] Inline form actions (add/remove) have adequate spacing
- [ ] No overlapping tap areas

### 2.3 Touch-Specific Interactions

**Gestures:**

- [ ] Swipe gestures work where implemented
- [ ] No conflicting gestures (e.g., swipe vs scroll)
- [ ] Pinch-to-zoom disabled where intentional (forms)
- [ ] Pull-to-refresh doesn't interfere with scrolling
- [ ] Long-press menus work (if used)

**Touch Feedback:**

- [ ] Visual feedback on tap (hover states work, but consider active states)
- [ ] No hover-dependent functionality
  - All actions must be accessible via tap
  - Tooltips should work on tap, not just hover
  - Dropdown menus trigger on tap
- [ ] No double-tap required (unless intentional)
- [ ] Active/pressed states provide immediate feedback

**Testing Note:** Use actual device or DevTools touch emulation, not mouse clicks.

---

## Section 3: Navigation Testing

### 3.1 Mobile Navigation (< 768px)

**Admin Pages:**

- [ ] Bottom navigation bar visible and accessible
- [ ] Navigation positioned at bottom of viewport (not mid-screen)
- [ ] All nav items visible without horizontal scroll
- [ ] Icons + labels present and readable
- [ ] Active/current page clearly indicated
- [ ] Nav items meet touch target requirements (44px min)
- [ ] Nav spacing prevents accidental taps
- [ ] Bottom nav doesn't obscure content
- [ ] Bottom nav persists on scroll (fixed position)

**Public Pages:**

- [ ] Hamburger menu visible and accessible (if used)
- [ ] Menu icon >= 44x44px
- [ ] Menu opens smoothly (slide-in animation)
- [ ] Menu overlay/backdrop prevents interaction with page
- [ ] Close button clearly visible in menu
- [ ] Menu items large enough to tap (44px height)
- [ ] Menu scrolls if content exceeds viewport
- [ ] Menu closes when item selected
- [ ] Logo/home link accessible

### 3.2 Desktop Navigation (>= 768px)

**Admin Pages:**

- [ ] Top navigation bar visible
- [ ] All navigation items visible in header
- [ ] Horizontal layout for nav items
- [ ] No hamburger menu (unless intentional)
- [ ] Dropdown menus work (if present)

**Public Pages:**

- [ ] Horizontal menu bar visible
- [ ] All items fit without wrapping
- [ ] Dropdowns accessible via hover or click
- [ ] Logo positioned correctly

### 3.3 Navigation Transitions

- [ ] Smooth transition from mobile to desktop nav
- [ ] No layout shift during transition
- [ ] Navigation state persists across viewport changes
- [ ] Active page indicator transitions correctly
- [ ] No JavaScript errors during resize

---

## Section 4: Form Usability (Mobile Focus)

### 4.1 Input Field Design

**Field Sizing:**

- [ ] Input height >= 44px (iOS minimum)
- [ ] Full width or nearly full width on phone (>= 70% viewport)
- [ ] Adequate padding inside inputs (12-16px horizontal)
- [ ] Font size >= 16px to prevent iOS zoom
- [ ] No horizontal scrolling required

**Field Spacing:**

- [ ] Vertical spacing between fields >= 12px
- [ ] Adequate space to prevent mis-taps
- [ ] Labels clearly associated with inputs
- [ ] Helper text doesn't overlap fields

**Field Types:**

- [ ] Appropriate input types used:
  - `type="email"` for email (shows @ on mobile keyboard)
  - `type="tel"` for phone (shows number pad)
  - `type="number"` for numbers
  - `type="date"` for dates (native picker on mobile)
  - `type="search"` for search fields
  - `autocomplete` attributes for common fields

### 4.2 Labels & Placeholders

- [ ] Labels visible (not placeholder-only design)
- [ ] Labels positioned above inputs (not beside)
- [ ] Label font size >= 14px
- [ ] Sufficient contrast for labels
- [ ] Labels don't truncate
- [ ] Placeholder text provides helpful hints
- [ ] Required field indicators visible (*)

### 4.3 Error States & Validation

**Error Messages:**

- [ ] Error messages visible on mobile (not cut off)
- [ ] Errors appear near relevant field
- [ ] Error text readable (>= 14px)
- [ ] High contrast for error text (red: #DC2626 or similar)
- [ ] Error icon or indicator present
- [ ] Screen reader accessible (aria-describedby)

**Validation UX:**

- [ ] Real-time validation doesn't disrupt typing
- [ ] Submit button shows loading state
- [ ] Success messages visible and clear
- [ ] Focus moves to first error on submit
- [ ] Keyboard doesn't hide error messages

### 4.4 Button Design

**Primary Actions:**

- [ ] Full width on phone (or nearly full: >= 90%)
- [ ] Height >= 48px
- [ ] Clear, action-oriented labels ("Sign In" not "Submit")
- [ ] Adequate padding (16px horizontal minimum)
- [ ] Loading state prevents double-taps
- [ ] Disabled state clearly indicated

**Secondary Actions:**

- [ ] Clearly differentiated from primary
- [ ] Still meet touch target requirements
- [ ] Adequate spacing from primary (>= 12px)
- [ ] Not hidden or hard to find

**Button Groups:**

- [ ] Stack vertically on phone (primary on top)
- [ ] Horizontal on desktop (cancel left, primary right)
- [ ] Equal width or proportional
- [ ] Adequate spacing between buttons

### 4.5 Complex Form Patterns

**Multi-Step Forms:**

- [ ] Progress indicator visible on mobile
- [ ] Step labels clear and readable
- [ ] Back button accessible
- [ ] Can save progress (if long form)
- [ ] Steps stack vertically on phone

**Date/Time Pickers:**

- [ ] Native pickers preferred on mobile (`type="date"`)
- [ ] Custom pickers are touch-friendly
- [ ] Calendar grid has adequate tap targets
- [ ] Month/year selectors easy to use
- [ ] Time picker uses mobile-friendly input

**Select Dropdowns:**

- [ ] Native select works on mobile
- [ ] Custom selects open smoothly
- [ ] Options are full-width and tappable
- [ ] Search/filter available if many options
- [ ] Selected value clearly indicated

**File Uploads:**

- [ ] Upload button >= 48px height
- [ ] Camera access works on mobile (if applicable)
- [ ] File preview displays correctly
- [ ] Remove/replace file option clear
- [ ] Upload progress visible

---

## Section 5: Data Display & Cards

### 5.1 Table to Card Conversion (< 768px)

**When tables become cards (see DataCard component):**

- [ ] Tables hidden on mobile (display: none)
- [ ] Card layout visible on mobile (display: block)
- [ ] Each table row becomes a card
- [ ] Cards stack vertically with spacing
- [ ] Card spacing >= 12px (typically 16px)

**Card Structure:**

- [ ] Card has clear visual boundary (border or shadow)
- [ ] Header shows primary identifier (e.g., guest name)
- [ ] Status badge visible in header
- [ ] Fields organized in logical groups
- [ ] Labels clearly indicate field meaning
- [ ] Values are readable and not truncated
- [ ] Actions accessible (menu or buttons)

**Required Card Features (from DataCard.tsx):**

- [ ] Title and status in header
- [ ] Field labels (text-muted, text-xs)
- [ ] Field values (text-primary, text-sm)
- [ ] Highlighted fields use accent color
- [ ] Actions stop propagation (don't trigger card click)
- [ ] Entire card tappable if onClick provided
- [ ] Keyboard accessible (role="button", tabIndex, onKeyDown)

### 5.2 Card Interactions

**Selection:**

- [ ] Checkbox visible and accessible
- [ ] Checkbox meets touch target requirements
- [ ] Checkbox state clear (checked/unchecked)
- [ ] Select-all functionality works
- [ ] Bulk actions visible when items selected

**Tap to View Details:**

- [ ] Entire card area tappable (except actions)
- [ ] Visual feedback on tap (border color change)
- [ ] Opens detail view (BottomSheet or modal)
- [ ] Detail view can be dismissed
- [ ] Return to list maintains scroll position

**Swipe Actions (if implemented):**

- [ ] Swipe gesture smooth and responsive
- [ ] Action icons/labels clearly visible
- [ ] Swipe reveals actions (delete, archive, etc.)
- [ ] Destructive actions require confirmation
- [ ] Swipe can be canceled

### 5.3 Data-Dense Displays

**Strategies for Mobile:**

- [ ] Prioritize most important fields
- [ ] Use progressive disclosure (expand for details)
- [ ] Provide filtering/search to reduce clutter
- [ ] Use icons to save space (with labels for clarity)
- [ ] Consider tabs or segmented controls for categories
- [ ] Avoid horizontal scrolling tables

**Admin Calendar (Special Case):**

- [ ] Week view available on phone
- [ ] Day view for detailed mobile access
- [ ] Agenda/list view as alternative
- [ ] Drag/resize gestures work on touch
- [ ] Reservations clearly labeled
- [ ] Tap to view/edit works reliably

---

## Section 6: Modal & Overlay Patterns

### 6.1 BottomSheet Component (< 768px)

**From /components/responsive/BottomSheet.tsx:**

- [ ] Slides up from bottom on mobile
- [ ] Rounded top corners (rounded-t-2xl)
- [ ] Max height 90vh (leaves status bar visible)
- [ ] Backdrop darkens page (bg-black/50)
- [ ] Tap backdrop to dismiss
- [ ] Escape key to dismiss
- [ ] Body scroll locked when open

**BottomSheet Structure:**

- [ ] Header with title and close button
- [ ] Close button (X) in top right
- [ ] Close button >= 44x44px tap area
- [ ] Content area scrolls independently
- [ ] Footer fixed at bottom (if present)
- [ ] Footer actions (Save/Cancel) clearly visible

**Accessibility:**

- [ ] role="dialog" set
- [ ] aria-modal="true" set
- [ ] aria-labelledby points to title
- [ ] Focus trapped in sheet when open
- [ ] Focus returns to trigger on close

### 6.2 Modal Dialogs (>= 768px)

**Desktop Modal Behavior:**

- [ ] Centers in viewport
- [ ] Max width constrains for readability (max-w-2xl)
- [ ] Max height allows scrolling (max-h-85vh)
- [ ] Rounded corners (rounded-lg)
- [ ] Backdrop same as mobile
- [ ] Escape key and backdrop click work

### 6.3 Toast & Notification Messages

- [ ] Toast appears in safe zone (not obscured by notch)
- [ ] Toast doesn't block critical UI
- [ ] Toast auto-dismisses after reasonable time (3-5s)
- [ ] Toast can be manually dismissed
- [ ] Multiple toasts stack appropriately
- [ ] Toast text readable (sufficient size and contrast)
- [ ] Toast meets touch target size for dismiss button

---

## Section 7: Performance & Loading States

### 7.1 Initial Page Load (Mobile Focus)

**Performance Budget (on 3G):**

- [ ] First Contentful Paint (FCP) < 2s
- [ ] Time to Interactive (TTI) < 5s
- [ ] Page weight < 1MB (including images)
- [ ] Critical CSS inline or fast-loading
- [ ] No render-blocking resources

**Testing:**
```bash
# Lighthouse performance test
npx playwright test --project=chromium --grep "performance"

# Or manually in DevTools:
# 1. Open Lighthouse tab
# 2. Select "Mobile" device
# 3. Throttle to "Slow 3G"
# 4. Run audit
```

### 7.2 Loading States

**Skeleton Screens:**

- [ ] Skeleton UI shown while loading
- [ ] Skeleton matches final layout
- [ ] No jarring layout shift (CLS score < 0.1)
- [ ] Smooth transition from skeleton to content

**Spinners/Progress:**

- [ ] Loading spinner visible and centered
- [ ] Progress bar for long operations
- [ ] Loading text provides context
- [ ] Can cancel long-running operations
- [ ] Timeout handling prevents infinite loading

**Optimistic UI:**

- [ ] Immediate feedback on user actions
- [ ] Optimistic update shown before server confirms
- [ ] Rollback if server rejects action
- [ ] Error states handled gracefully

### 7.3 Lazy Loading & Pagination

**Images:**

- [ ] Below-fold images lazy load
- [ ] `loading="lazy"` attribute set
- [ ] Placeholder shown until loaded
- [ ] No layout shift when images load

**Infinite Scroll:**

- [ ] New items load smoothly
- [ ] Loading indicator at bottom of list
- [ ] Can return to previous position
- [ ] Keyboard navigation works
- [ ] "Load More" button alternative available

**Pagination:**

- [ ] Pagination controls large enough to tap
- [ ] Page numbers clearly visible
- [ ] Current page highlighted
- [ ] Prev/Next buttons work as expected
- [ ] Jump to page works (if present)

### 7.4 Error States

- [ ] Network error messages clear and actionable
- [ ] Retry button accessible and functional
- [ ] Offline state handled gracefully
- [ ] Error doesn't break entire page
- [ ] Error logged for debugging

---

## Section 8: Accessibility (Mobile Specific)

### 8.1 Screen Reader Support

**VoiceOver (iOS) Testing:**

1. Enable VoiceOver: Settings > Accessibility > VoiceOver
2. Swipe right/left to navigate
3. Double-tap to activate

**TalkBack (Android) Testing:**

1. Enable TalkBack: Settings > Accessibility > TalkBack
2. Swipe right/left to navigate
3. Double-tap to activate

**Checklist:**

- [ ] All interactive elements have labels
- [ ] Images have alt text (or alt="" if decorative)
- [ ] Form inputs have associated labels
- [ ] Buttons have clear text or aria-label
- [ ] Links have descriptive text (not "click here")
- [ ] Headings follow logical hierarchy (h1 > h2 > h3)
- [ ] Focus order is logical
- [ ] Dynamic content updates announced (aria-live)
- [ ] Modals trap focus appropriately

### 8.2 Keyboard Navigation (Tablet/Desktop)

- [ ] All functionality accessible via keyboard
- [ ] Tab order is logical
- [ ] Focus indicators clearly visible
- [ ] No keyboard traps
- [ ] Escape key closes modals/menus
- [ ] Enter/Space activate buttons
- [ ] Arrow keys work for navigation (where appropriate)

### 8.3 Color & Contrast

**WCAG 2.1 AA Requirements:**

- [ ] Text contrast >= 4.5:1 (normal text)
- [ ] Text contrast >= 3:1 (large text, 18pt+)
- [ ] UI component contrast >= 3:1
- [ ] Focus indicators >= 3:1 contrast
- [ ] Color not sole indicator of meaning
  - Use icons + color for status badges
  - Use patterns + color for charts

**Testing Tools:**
- Chrome DevTools > Lighthouse > Accessibility
- WebAIM Contrast Checker
- axe DevTools extension

### 8.4 Zoom & Text Scaling

- [ ] Page usable at 200% browser zoom
- [ ] Text scales without breaking layout
- [ ] No horizontal scrolling at 200% zoom
- [ ] iOS text size adjustment works (Dynamic Type)
- [ ] Android font scaling works
- [ ] Tap targets remain adequate when zoomed

---

## Section 9: Common Responsive Issues

### 9.1 CSS Issues

**Viewport Units:**

- [ ] `vh` units account for mobile browser UI
  - Safari address bar causes `100vh` to be too tall
  - Use `dvh` (dynamic viewport height) or CSS variables
- [ ] `vw` units don't cause horizontal scroll
- [ ] `min()`, `max()`, `clamp()` work as expected

**Breakpoint Issues:**

- [ ] Media queries use `min-width` (mobile-first)
- [ ] Breakpoint values consistent (768px, 1024px, 1280px)
- [ ] No overlapping media query ranges
- [ ] `hover` media query prevents hover on touch devices:
  ```css
  @media (hover: hover) {
    /* Hover effects only on devices that support it */
  }
  ```

**Overflow Issues:**

- [ ] `overflow-x: hidden` doesn't hide content
- [ ] Scrollable areas have visible scrollbars
- [ ] Sticky elements don't overlap content
- [ ] Fixed elements positioned correctly

### 9.2 JavaScript Issues

**Touch Events:**

- [ ] Touch events work (`touchstart`, `touchend`, etc.)
- [ ] No reliance on `mouseover` or `hover`
- [ ] Click events work on touch (300ms delay handled)
- [ ] Passive event listeners for scroll performance
- [ ] Prevent default on touch events where needed

**Viewport Detection:**

- [ ] `window.innerWidth` used (not `screen.width`)
- [ ] Resize listeners debounced
- [ ] Media query listeners used (matchMedia)
- [ ] Orientation change handled

**Example:**
```javascript
// Good: React hook for viewport detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    setIsMobile(query.matches);

    const handler = (e) => setIsMobile(e.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return isMobile;
};
```

### 9.3 Image Issues

- [ ] Images don't overflow containers
- [ ] Retina images served on high-DPI screens
- [ ] Lazy loading doesn't break initial view
- [ ] SVGs scale without pixelation
- [ ] Background images have fallback colors
- [ ] Images compressed for mobile (WebP format)

### 9.4 Typography Issues

- [ ] Font loading doesn't cause layout shift (FOUT/FOIT)
- [ ] System fonts load immediately
- [ ] Font sizes don't require zoom to read
- [ ] Line lengths appropriate for viewport
- [ ] Hyphenation works for narrow columns (if used)

---

## Section 10: Page-Specific Testing

### 10.1 Public Pages

**Home Page (`/`):**

- [ ] Hero section scales appropriately
- [ ] Hero CTA button prominent on mobile
- [ ] Feature sections stack vertically on phone
- [ ] Images load and scale correctly
- [ ] Contact information visible without scrolling (or clear CTA)

**Gallery (`/gallery`):**

- [ ] Image grid responsive (3 cols → 2 cols → 1 col)
- [ ] Image tap opens lightbox/modal
- [ ] Lightbox swipe gestures work
- [ ] Lightbox close button accessible
- [ ] Captions readable on mobile

**Rates (`/rates`):**

- [ ] Pricing tables convert to cards on mobile
- [ ] All pricing info visible
- [ ] Comparison features clear
- [ ] CTA button accessible

**Contact (`/contact`):**

- [ ] Contact form meets mobile ergonomics (Section 4)
- [ ] Phone number tappable (tel: link)
- [ ] Email tappable (mailto: link)
- [ ] Map embeds responsively (if present)
- [ ] Business hours readable

**Make a Reservation (`/make-a-reservation`):**

- [ ] Multi-step form works on mobile
- [ ] Date picker mobile-friendly
- [ ] Guest count selectors accessible
- [ ] Payment form meets PCI standards
- [ ] Stripe Elements responsive
- [ ] Confirmation page displays correctly

**Manage Reservation (`/manage-reservation`):**

- [ ] Lookup form mobile-friendly
- [ ] Reservation details readable in cards
- [ ] Cancel/modify buttons accessible
- [ ] Confirmation dialogs work on mobile

### 10.2 Admin Pages

**Reservations Dashboard (`/admin`):**

- [ ] Table converts to cards on mobile (< 768px)
- [ ] Card layout uses DataCard component
- [ ] Bulk selection works on mobile
- [ ] Filters accessible and functional
- [ ] Search input full-width on phone
- [ ] Action buttons in mobile menu or bottom sheet

**Calendar (`/admin/calendar`):**

- [ ] Week view visible on tablet
- [ ] Day/agenda view on phone
- [ ] Drag-and-drop works on touch
- [ ] Reservation blocks clearly labeled
- [ ] Tap to view/edit opens BottomSheet
- [ ] Date navigation accessible

**Campsites (`/admin/campsites`):**

- [ ] Campsite list converts to cards on mobile
- [ ] Add campsite button accessible
- [ ] Edit form in BottomSheet
- [ ] Image upload works on mobile
- [ ] Delete confirmation clear

**Settings (`/admin/settings`):**

- [ ] Settings groups stack on mobile
- [ ] Toggle switches large enough to tap
- [ ] Save button fixed at bottom (or clearly visible)
- [ ] Changes saved without scroll

**Help (`/admin/help`):**

- [ ] Help articles readable on mobile
- [ ] Navigation/TOC accessible
- [ ] Search works on mobile
- [ ] Code snippets scroll horizontally (if needed)

**Login/Auth Pages:**

- [ ] Login form meets mobile ergonomics
- [ ] Password visibility toggle accessible
- [ ] Forgot password link visible
- [ ] Error messages clear
- [ ] Social login buttons (if present) stack on mobile

---

## Section 11: Testing Workflow

### 11.1 Pre-Commit Checklist

Before committing responsive changes:

- [ ] Test at 390px (phone)
- [ ] Test at 768px (tablet)
- [ ] Test at 1280px (desktop)
- [ ] Run responsive Playwright tests
- [ ] Check DevTools console for errors
- [ ] Verify no horizontal scroll
- [ ] Check touch target sizes
- [ ] Validate semantic HTML

```bash
# Quick test command
npx playwright test tests/admin/responsive-reservations.spec.ts tests/admin/mobile-features.spec.ts
```

### 11.2 Pre-Release Checklist

Before merging to main or deploying:

- [ ] All automated tests pass
- [ ] Manual testing on 3+ viewports
- [ ] Physical device testing (iOS + Android)
- [ ] Lighthouse mobile score >= 90
- [ ] No accessibility violations (axe)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Performance budget met
- [ ] No console errors/warnings

### 11.3 Code Review Checklist

When reviewing responsive code:

**HTML/JSX:**

- [ ] Semantic HTML used
- [ ] ARIA attributes correct
- [ ] Alt text on images
- [ ] Form labels associated
- [ ] Heading hierarchy logical

**CSS:**

- [ ] Mobile-first approach (min-width media queries)
- [ ] Breakpoints consistent (768px, 1024px)
- [ ] No hardcoded pixel values for typography
- [ ] Flexbox/Grid used appropriately
- [ ] No fixed widths on containers
- [ ] Padding in rem/em units

**JavaScript/React:**

- [ ] No hover-dependent logic
- [ ] Touch events handled
- [ ] Viewport detection uses matchMedia
- [ ] Resize handlers debounced
- [ ] No assumptions about device capabilities

**Components:**

- [ ] Responsive components used (DataCard, BottomSheet, etc.)
- [ ] Props for mobile/desktop variants
- [ ] Hooks for viewport detection
- [ ] Conditional rendering based on viewport

### 11.4 New Page Checklist

When creating a new page:

**Setup:**

- [ ] Use PageShell component (if applicable)
- [ ] Import responsive utilities
- [ ] Plan mobile layout first
- [ ] Define breakpoints needed

**Development:**

1. [ ] Build mobile layout (< 768px)
2. [ ] Test on 390px viewport
3. [ ] Build tablet layout (768px - 1024px)
4. [ ] Test on 768px viewport
5. [ ] Build desktop layout (> 1024px)
6. [ ] Test on 1280px viewport
7. [ ] Test breakpoint transitions
8. [ ] Add responsive tests (Playwright)
9. [ ] Run full test suite
10. [ ] Manual testing on devices

**Documentation:**

- [ ] Add page to this checklist (Section 10)
- [ ] Document any custom breakpoints
- [ ] Note any special mobile behaviors
- [ ] Update Playwright tests if needed

---

## Section 12: Tools & Resources

### 12.1 Browser DevTools

**Chrome DevTools:**
- Device toolbar: Ctrl+Shift+M (Windows) / Cmd+Shift+M (Mac)
- Responsive mode: Drag to resize viewport
- Device presets: iPhone 12 Pro, iPad, etc.
- Throttling: Simulate slow 3G, 4G
- Touch simulation: Settings > Devices > Add device
- Lighthouse: Run mobile audit

**Firefox DevTools:**
- Responsive Design Mode: Ctrl+Shift+M
- Device presets: iPhone, iPad, etc.
- Touch simulation: Built-in
- Screenshot: Capture full-page or specific element

**Safari (for iOS testing):**
- Develop > Enter Responsive Design Mode
- iOS Simulator integration
- Remote debugging: iPhone > Safari > Develop menu

### 12.2 Online Testing Tools

**BrowserStack / Sauce Labs:**
- Test on real devices in cloud
- iOS and Android versions
- Network throttling
- Video recording of test sessions

**Responsively App:**
- Free desktop app
- Multiple viewports simultaneously
- Screenshot all sizes
- Hot reload

**Viewport Resizer:**
- Browser bookmarklet
- Quick resize to common viewports
- Lightweight alternative to full DevTools

### 12.3 Automated Testing

**Playwright Tests:**

```bash
# Run all responsive tests
npx playwright test tests/admin/responsive-reservations.spec.ts
npx playwright test tests/admin/mobile-features.spec.ts

# Run specific test
npx playwright test --grep "displays card view on mobile"

# Debug mode
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Generate test report
npx playwright show-report
```

**Visual Regression Testing:**

```bash
# Take baseline screenshots
npx playwright test --update-snapshots

# Compare against baseline
npx playwright test
```

### 12.4 Design Resources

**Figma Files:**
- Mobile designs: [Link to Figma]
- Component library: [Link to Figma]
- Breakpoint specs: See `/docs/design-system.md`

**Responsive Components:**
- `/components/responsive/DataCard.tsx` - Table to card conversion
- `/components/responsive/BottomSheet.tsx` - Mobile modals
- `/components/responsive/PageShell.tsx` - Page container
- `/components/responsive/ResponsiveStack.tsx` - Adaptive stacking
- `/components/responsive/ResponsiveGrid.tsx` - Responsive grids

**Hooks:**
- `/lib/hooks/useViewportMode.ts` - Detect phone/tablet/desktop
- `/lib/hooks/useMediaQuery.ts` - Custom media queries
- `/components/providers/ViewportModeProvider.tsx` - Context provider

---

## Section 13: Troubleshooting

### 13.1 Common Problems & Solutions

**Problem: Horizontal scrolling on mobile**

Causes:
- Fixed width elements wider than viewport
- `vw` units in calc without accounting for scrollbar
- Negative margins without containment
- Absolute positioned elements outside container

Solutions:
```css
/* Add to body or wrapper */
overflow-x: hidden;

/* Or find specific element */
.element {
  max-width: 100%;
  box-sizing: border-box;
}
```

**Problem: Text too small on mobile**

Solution:
```css
/* Minimum 16px to prevent iOS zoom */
input, textarea, select {
  font-size: 16px;
}

body {
  font-size: clamp(1rem, 2vw, 1.125rem);
}
```

**Problem: Viewport units (vh) too tall on mobile**

Cause: Mobile browsers with collapsible UI

Solutions:
```css
/* Use dvh instead of vh */
.fullscreen {
  height: 100dvh; /* Dynamic viewport height */
}

/* Or CSS custom property */
:root {
  --app-height: 100vh;
}

.fullscreen {
  height: var(--app-height);
}
```

```javascript
// Update on resize
const setAppHeight = () => {
  document.documentElement.style.setProperty(
    '--app-height',
    `${window.innerHeight}px`
  );
};

window.addEventListener('resize', setAppHeight);
setAppHeight();
```

**Problem: Hover effects stuck on mobile**

Solution:
```css
/* Only apply hover on devices that support it */
@media (hover: hover) {
  .button:hover {
    background: var(--color-accent-gold);
  }
}

/* Touch devices get active state instead */
.button:active {
  background: var(--color-accent-gold);
}
```

**Problem: Table doesn't convert to cards**

Check:
1. Viewport detection hook working?
2. Conditional rendering correct?
3. CSS media query applied?
4. DataCard component imported?

Example:
```tsx
import { useViewportModeContext } from '@/components/providers/ViewportModeProvider';
import { DataCard } from '@/components/responsive/DataCard';

function ReservationsList() {
  const { isPhone } = useViewportModeContext();

  if (isPhone) {
    return (
      <div className="space-y-3">
        {reservations.map(res => (
          <DataCard key={res.id} {...cardProps} />
        ))}
      </div>
    );
  }

  return <table>...</table>;
}
```

**Problem: BottomSheet not sliding up**

Check:
1. isOpen prop passed correctly?
2. CSS animations enabled?
3. z-index conflicts?
4. ViewportModeProvider wrapping component?

**Problem: Touch targets too small**

Increase with CSS:
```css
/* Add padding to increase tap area */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* Or add ::before pseudo-element */
.icon-button {
  position: relative;
}

.icon-button::before {
  content: '';
  position: absolute;
  inset: -12px; /* Expands tap area by 12px in all directions */
}
```

### 13.2 Debugging Techniques

**Visual Debugging:**

```css
/* Add outlines to see element boundaries */
* {
  outline: 1px solid red;
}

/* Or use DevTools > More tools > Rendering > Show layout shift regions */
```

**Console Logging:**

```javascript
// Log viewport changes
const logViewport = () => {
  console.log({
    width: window.innerWidth,
    height: window.innerHeight,
    isPhone: window.innerWidth < 768,
    devicePixelRatio: window.devicePixelRatio,
  });
};

window.addEventListener('resize', logViewport);
logViewport();
```

**Performance Profiling:**

1. Open DevTools > Performance
2. Start recording
3. Resize viewport or scroll page
4. Stop recording
5. Look for:
   - Long tasks (> 50ms)
   - Layout shifts (CLS)
   - Forced reflows

**Touch Event Debugging:**

```javascript
// Log all touch events
document.addEventListener('touchstart', (e) => {
  console.log('Touch start', {
    touches: e.touches.length,
    target: e.target,
  });
});
```

---

## Appendix A: Quick Reference

### Breakpoints

```css
/* Phone */
@media (max-width: 767px) { }

/* Tablet and up */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large desktop */
@media (min-width: 1280px) { }
```

### Touch Target Sizes

| Element | Minimum | Recommended |
|---------|---------|-------------|
| Buttons | 44x44px | 48x48px |
| Links | 44px height | 48px height |
| Form inputs | 44px height | 48px height |
| Checkboxes | 24px + 20px padding | 24px + 24px padding |
| Icon buttons | 44x44px | 48x48px |
| Nav items | 44px height | 48px height |

### Font Sizes

| Element | Mobile | Desktop |
|---------|--------|---------|
| Body text | 16px | 16-18px |
| Labels | 14px | 14px |
| Small text | 14px | 14px |
| H1 | 32px | 48px |
| H2 | 24px | 32px |
| H3 | 20px | 24px |

### Spacing

| Context | Mobile | Desktop |
|---------|--------|---------|
| Container padding | 16px | 24-32px |
| Section spacing | 24-32px | 48-64px |
| Card padding | 16px | 20-24px |
| Form field spacing | 12-16px | 16-24px |
| Button spacing | 8-12px | 12-16px |

---

## Appendix B: Test Data Requirements

### For Manual Testing

**Test Reservations:**
- Confirmed reservation
- Pending reservation
- Checked-in reservation
- Cancelled reservation
- Reservation with long guest name
- Reservation with notes/special requests
- Multi-guest reservation (5+ people)

**Test Campsites:**
- RV site (full hookups)
- Tent site (no hookups)
- Cabin
- Site with long name
- Site with custom amenities
- Disabled site

**Test Users:**
- Admin user (full permissions)
- Read-only user (if applicable)
- User with long email address

**Edge Cases:**
- Empty states (no reservations, no campsites)
- Very long lists (50+ items)
- Error states (network failures)
- Loading states (slow network)

### For Automated Testing

See `/tests/.env.test` for test credentials and `/supabase/seed.sql` for test data generation.

---

## Appendix C: Changelog

**Version 1.0 (2024-12-26):**
- Initial checklist created
- Based on Tasks 1-3 implementation
- Covers all public and admin pages
- Includes automated test references
- Provides troubleshooting guide

**Future Updates:**
- Add visual regression testing section
- Expand cross-browser testing
- Add native app testing (React Native if applicable)
- Include performance budgets by page
- Add more code examples

---

## Appendix D: Related Documentation

- **Design System:** `/docs/design-system.md`
- **Test Coverage:** `/docs/TEST_COVERAGE_ANALYSIS.md`
- **CI/CD Pipeline:** `/docs/CI_CD.md`
- **Rate Limiting:** `/docs/RATE_LIMITING.md`
- **Project Instructions:** `/CLAUDE.md`

**Automated Tests:**
- `/tests/admin/responsive-reservations.spec.ts` - Table to card conversion
- `/tests/admin/mobile-features.spec.ts` - Touch targets, navigation, forms

**Responsive Components:**
- `/components/responsive/DataCard.tsx`
- `/components/responsive/BottomSheet.tsx`
- `/components/responsive/PageShell.tsx`
- `/components/responsive/ResponsiveStack.tsx`
- `/components/responsive/ResponsiveGrid.tsx`

**Utilities:**
- `/lib/hooks/useViewportMode.ts`
- `/components/providers/ViewportModeProvider.tsx`

---

## How to Use This Checklist

### For Developers

1. **New Feature:** Start with Section 11.4 (New Page Checklist)
2. **Bug Fix:** Use relevant section based on component type
3. **Code Review:** Use Section 11.3 (Code Review Checklist)
4. **Pre-Commit:** Quick check with Section 11.1

### For QA

1. **Manual Testing:** Follow Section 10 for page-specific tests
2. **Regression Testing:** Run full checklist (Sections 1-9)
3. **Automated Testing:** Execute Playwright tests (Section 12.3)
4. **Pre-Release:** Complete Section 11.2

### For Designers

1. **Design Handoff:** Reference Section 12.4 for components
2. **Breakpoints:** See Appendix A for specifications
3. **Touch Targets:** Section 2.1 for minimum sizes
4. **Typography:** Appendix A for size recommendations

### For Product Managers

1. **Acceptance Criteria:** Reference relevant sections
2. **Performance Budget:** Section 7.1
3. **Feature Support:** Section 10 (page-specific)
4. **Mobile-First:** Prioritize phone experience (< 768px)

---

**Last Updated:** 2024-12-26
**Maintained By:** Development Team
**Questions?** See `/CLAUDE.md` or ask in #engineering Slack channel
