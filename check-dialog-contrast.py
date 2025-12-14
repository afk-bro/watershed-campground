#!/usr/bin/env python3
"""
Check specific color combinations from the dialog
"""

def get_contrast_ratio(r1, g1, b1, r2, g2, b2):
    """Calculate WCAG contrast ratio between two RGB colors"""
    def get_luminance(r, g, b):
        r, g, b = r / 255, g / 255, b / 255
        r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
        g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
        b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    l1 = get_luminance(r1, g1, b1)
    l2 = get_luminance(r2, g2, b2)

    lighter = max(l1, l2)
    darker = min(l1, l2)

    return (lighter + 0.05) / (darker + 0.05)

# Check the problematic combination
# text-[var(--color-text-inverse)] = #06251c (dark forest)
# bg-[var(--color-surface-elevated)] = #0d4538 (dark teal)

text_inverse = (6, 37, 28)  # #06251c
surface_elevated = (13, 69, 56)  # #0d4538
warning_bg = (92, 163, 184)  # #5ca3b8 from --color-status-active

print("=" * 60)
print("DIALOG CONTRAST ANALYSIS")
print("=" * 60)

print("\n1. Guest Name (line 71):")
print(f"   Color: #{text_inverse[0]:02x}{text_inverse[1]:02x}{text_inverse[2]:02x} (--color-text-inverse)")
print(f"   Background: #{surface_elevated[0]:02x}{surface_elevated[1]:02x}{surface_elevated[2]:02x} (--color-surface-elevated)")
ratio = get_contrast_ratio(*text_inverse, *surface_elevated)
print(f"   Contrast: {ratio:.2f}:1")
print(f"   WCAG AA (normal text 4.5:1): {'✓ PASS' if ratio >= 4.5 else '✗ FAIL'}")
print(f"   WCAG AA (large text 3.0:1): {'✓ PASS' if ratio >= 3.0 else '✗ FAIL'}")

print("\n2. Warning Box Text (line 149):")
print(f"   Color: #{text_inverse[0]:02x}{text_inverse[1]:02x}{text_inverse[2]:02x} (--color-text-inverse)")
print(f"   Background: rgba({warning_bg[0]}, {warning_bg[1]}, {warning_bg[2]}, 0.1)")
print(f"   Note: Background is 90% transparent, actual bg is darker")
print("   This needs manual inspection with actual rendered background")

print("\n" + "=" * 60)
