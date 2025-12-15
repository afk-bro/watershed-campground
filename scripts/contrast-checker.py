#!/usr/bin/env python3
"""
Manual contrast checker using Playwright
Inspects specific elements and their computed styles
"""

from playwright.sync_api import sync_playwright
import json
from pathlib import Path

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

def parse_rgb(color_string):
    """Parse rgb() or rgba() string to RGB values"""
    if not color_string or color_string == 'rgba(0, 0, 0, 0)':
        return None

    # Handle rgba
    if 'rgba' in color_string:
        parts = color_string.replace('rgba(', '').replace(')', '').split(',')
        if len(parts) >= 4 and float(parts[3].strip()) == 0:
            return None  # Transparent
        return tuple(int(parts[i].strip()) for i in range(3))

    # Handle rgb
    if 'rgb' in color_string:
        parts = color_string.replace('rgb(', '').replace(')', '').split(',')
        return tuple(int(p.strip()) for p in parts[:3])

    return None

def check_element_contrast(page, selector, description):
    """Check contrast for a specific element"""
    try:
        element = page.locator(selector).first
        if not element.is_visible():
            return None

        # Get computed styles
        styles = element.evaluate("""
            (el) => {
                const computed = window.getComputedStyle(el);
                return {
                    color: computed.color,
                    backgroundColor: computed.backgroundColor,
                    fontSize: computed.fontSize,
                    fontWeight: computed.fontWeight,
                    text: el.innerText?.substring(0, 100) || ''
                };
            }
        """)

        color = parse_rgb(styles['color'])
        bg_color = parse_rgb(styles['backgroundColor'])

        # If bg is transparent, need to find parent bg
        if not bg_color:
            bg_color = element.evaluate("""
                (el) => {
                    let parent = el.parentElement;
                    while (parent) {
                        const bg = window.getComputedStyle(parent).backgroundColor;
                        if (bg && bg !== 'rgba(0, 0, 0, 0)') {
                            return bg;
                        }
                        parent = parent.parentElement;
                    }
                    return 'rgb(255, 255, 255)'; // Default to white
                }
            """)
            bg_color = parse_rgb(bg_color)

        if color and bg_color:
            ratio = get_contrast_ratio(*color, *bg_color)

            # WCAG AA standards
            font_size = float(styles['fontSize'].replace('px', ''))
            font_weight = int(styles['fontWeight']) if styles['fontWeight'].isdigit() else 400

            # Large text: 18pt+ or 14pt+ bold (18pt ≈ 24px, 14pt ≈ 18.66px)
            is_large = font_size >= 24 or (font_size >= 18.66 and font_weight >= 700)
            min_ratio = 3.0 if is_large else 4.5

            passes = ratio >= min_ratio

            return {
                'selector': selector,
                'description': description,
                'text': styles['text'][:50],
                'color': styles['color'],
                'backgroundColor': styles['backgroundColor'],
                'fontSize': styles['fontSize'],
                'fontWeight': styles['fontWeight'],
                'contrastRatio': round(ratio, 2),
                'required': min_ratio,
                'passes': passes,
                'isLargeText': is_large
            }

        return None
    except Exception as e:
        return {'selector': selector, 'error': str(e)}

def audit_page_contrast(page, url, name, selectors):
    """Audit specific selectors on a page"""
    print(f"\n🔍 Checking contrast on: {name}")

    try:
        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(1000)

        results = []

        for selector_info in selectors:
            selector = selector_info['selector']
            description = selector_info['description']

            result = check_element_contrast(page, selector, description)
            if result and 'error' not in result:
                results.append(result)

                status = "✓" if result['passes'] else "✗"
                ratio = result['contrastRatio']
                required = result['required']

                print(f"\n  {status} {description}")
                print(f"     Contrast: {ratio}:1 (required: {required}:1)")
                print(f"     Text: \"{result['text']}\"")
                print(f"     Color: {result['color']} on {result['backgroundColor']}")

                if not result['passes']:
                    print(f"     ⚠️  FAILS WCAG AA")

        return results

    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return []

def main():
    print("🚀 Starting Manual Contrast Audit")
    print("📊 Checking specific elements for WCAG AA compliance\n")

    # Define specific elements to check based on user's report
    checks = [
        {
            'url': 'http://localhost:3000/admin/login',
            'name': 'Admin Login',
            'selectors': [
                {'selector': 'h1, h2, h3', 'description': 'Login page header'},
                {'selector': 'label', 'description': 'Form labels (Email/Password)'},
                {'selector': 'input::placeholder', 'description': 'Input placeholders'},
                {'selector': 'button', 'description': 'Sign In button text'},
            ]
        },
        {
            'url': 'http://localhost:3000/amenities',
            'name': 'Amenities Page',
            'selectors': [
                {'selector': 'h1', 'description': 'Page title'},
                {'selector': 'h2', 'description': 'Section headings'},
                {'selector': 'p', 'description': 'Body text'},
                {'selector': 'label', 'description': 'Form labels'},
            ]
        },
        {
            'url': 'http://localhost:3000',
            'name': 'Home Page',
            'selectors': [
                {'selector': 'h1', 'description': 'Main heading'},
                {'selector': 'h2', 'description': 'Section headings'},
                {'selector': 'p', 'description': 'Body text'},
                {'selector': 'nav a', 'description': 'Navigation links'},
            ]
        }
    ]

    all_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for check in checks:
            results = audit_page_contrast(
                page,
                check['url'],
                check['name'],
                check['selectors']
            )
            all_results.extend(results)

        browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)

    failures = [r for r in all_results if not r.get('passes', True)]
    passes = [r for r in all_results if r.get('passes', False)]

    print(f"\nTotal elements checked: {len(all_results)}")
    print(f"✓ Passing WCAG AA: {len(passes)}")
    print(f"✗ Failing WCAG AA: {len(failures)}")

    if failures:
        print("\n⚠️  CONTRAST ISSUES FOUND:")
        for failure in failures:
            print(f"\n  • {failure['description']}")
            print(f"    Selector: {failure['selector']}")
            print(f"    Contrast: {failure['contrastRatio']}:1 (needs {failure['required']}:1)")

    # Save detailed report
    report_path = Path('./accessibility-reports/contrast-report.json')
    with open(report_path, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\n📁 Detailed report saved to: {report_path}\n")

if __name__ == '__main__':
    main()
