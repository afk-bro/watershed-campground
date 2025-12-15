# Task Hero Redesign: Reducing Friction on Task Pages

## Problem Statement

The original full-height Hero component (65vh with parallax image) created friction on task-oriented pages like "Make a Reservation" and "Contact" because:

1. **Context mismatch**: The cinematic hero said "relax, explore" when users were thinking "complete this task"
2. **Hidden progress**: Users couldn't see the stepper or primary action without scrolling
3. **Identical navigation**: Reusing the same hero image across all pages created poor spatial awareness
4. **Cognitive overhead**: Large heroes fight against the goal of immediate task completion

## Solution: TaskHero Component

### Design Philosophy

**"Progressive Momentum"** - A design direction focused on:
- **Immediate clarity**: Show the task and progress without scrolling
- **Warm efficiency**: Maintain brand warmth while optimizing for task completion
- **Forward motion**: Visual hierarchy that reinforces progress

### Key Changes

#### 1. Compressed Height
- **From**: 65vh with large parallax image
- **To**: 32vh (240px minimum) with no image
- **Result**: Primary content visible above the fold

#### 2. Gradient Background
- **Replaced**: Full photography with overlays
- **With**: Organic gradient using brand forest colors (#083a2c → #06251c → #042018)
- **Added**: Subtle SVG noise texture for natural feel
- **Accent**: Radial gradient with gold warmth for depth

#### 3. Integrated Progress Indicators
- **Previous**: Stepper shown below hero (required scrolling)
- **Now**: Progress bars integrated directly into TaskHero
- **Features**:
  - Animated progress bars with 4-step visualization
  - Current step highlighted with gold glow effect
  - Step labels visible immediately
  - Smooth transitions between steps

#### 4. Refined Typography
- **Kept**: Distinctive brand heading font
- **Scaled**: Smaller, more compact sizing (3xl-5xl vs 4xl-6xl)
- **Enhanced**: Clearer hierarchy with subtle accent line
- **Improved**: Better contrast with shadow optimization

### Implementation

```tsx
<TaskHero
  title="Complete Your Booking"
  subtitle="Just a few more details and you're all set"
  currentStep={2}
  totalSteps={4}
  stepLabels={['Your Details', 'Add-ons', 'Review & Pay', 'Confirmed']}
/>
```

### Pages Updated

#### Task Pages (with progress indicators)
- **Make a Reservation** - 4-step booking flow with integrated progress
- **Contact** - Simple task-focused header for form submission

#### Informational Pages (no progress, just clean header)
- **Rates** - Compressed header, immediate content
- **Amenities** - Clean transition to feature list
- **Rules** - Focused header for policy content

#### Unchanged
- **Home page** - Retains cinematic 65vh Hero (appropriate for landing/exploration)

## Technical Details

### Aesthetic Choices

1. **Color Palette**
   - Base: Brand forest (#06251c, #083a2c, #042018)
   - Accent: Gold (#c8a75a) with opacity variations
   - Text: Beige (#e9dfc7) for warmth

2. **Texture & Depth**
   - SVG noise at 3% opacity for organic feel
   - Radial gradient overlay with gold warmth
   - Soft bottom fade into page background

3. **Motion**
   - Progress bar transitions: 500ms ease
   - Active step gets subtle shadow glow
   - No parallax (reduces complexity, improves performance)

4. **Spacing**
   - Negative margin (-mt-4) creates seamless flow from hero to content
   - Reduced padding (py-12 vs py-16) maintains momentum

### Accessibility

- Maintains high contrast ratios (text shadows for readability)
- No motion that might trigger vestibular issues
- Clear semantic structure
- Keyboard-friendly (no parallax scroll hijacking)

## Impact

### Before
- Users landed → saw large image → scrolled → found stepper → scrolled more → saw form
- No immediate sense of progress or task structure
- Same visual on every page created disorientation

### After
- Users land → immediately see: task title + progress + first action
- Progress visible without any scrolling
- Each page feels distinct due to gradient (vs. identical photo)
- Reduced friction = faster task completion

## Future Enhancements

### Potential Variations
1. **Different gradient per section** - Subtle color shifts for spatial awareness
   - Reservations: Standard forest green
   - Contact: Warmer gold-tinted gradient
   - Admin: Slightly cooler, more professional tone

2. **Micro-interactions**
   - Subtle pulse on current step
   - Completion celebration animation
   - Scroll-triggered reveal of progress bar

3. **InfoHero variant** - For informational pages that might benefit from imagery
   - Keep compressed height
   - Allow optional background image with strong gradient overlay
   - Different crop/treatment per page

## Design Principles Applied

✓ **Bold minimalism** - Stripped away unnecessary visual noise
✓ **Contextual design** - Task pages feel different from landing pages
✓ **Progressive disclosure** - Show what matters immediately
✓ **Brand consistency** - Maintains warmth and natural aesthetic
✓ **Performance** - Removed parallax, reduced image assets
✓ **Accessibility** - High contrast, no motion triggers

---

*Design approach influenced by best practices in task-completion UX and informed by the "Progressive Momentum" aesthetic direction.*
