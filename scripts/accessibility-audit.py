#!/usr/bin/env python3
"""
Accessibility audit script using Playwright
Focuses on color contrast and accessibility issues
"""

from playwright.sync_api import sync_playwright
import json
import os
from pathlib import Path

pages_to_audit = [
    {"url": "http://localhost:3000", "name": "home"},
    {"url": "http://localhost:3000/admin/login", "name": "admin-login"},
    {"url": "http://localhost:3000/admin", "name": "admin-dashboard"},
    {"url": "http://localhost:3000/amenities", "name": "amenities"},
]

def inject_axe(page):
    """Inject axe-core into the page"""
    axe_script = """
    // Inject axe-core
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
    document.head.appendChild(script);
    return new Promise((resolve) => {
        script.onload = () => resolve(true);
    });
    """
    page.evaluate(axe_script)
    page.wait_for_timeout(2000)

def run_axe_audit(page):
    """Run axe-core accessibility audit"""
    axe_results = page.evaluate("""
        async () => {
            try {
                const results = await axe.run();
                return results;
            } catch (error) {
                return { error: error.message };
            }
        }
    """)
    return axe_results

def analyze_contrast_issues(elements_html):
    """Simple contrast analysis by checking computed styles"""
    contrast_checks = []

    for elem in elements_html:
        try:
            contrast_checks.append({
                'element': elem.get('tag', 'unknown'),
                'text': elem.get('text', '')[:50],
                'snippet': elem.get('html', '')[:100]
            })
        except:
            pass

    return contrast_checks

def audit_page(page, url, name):
    """Audit a single page for accessibility issues"""
    print(f"\n🔍 Auditing: {url}")

    try:
        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(2000)

        # Take screenshot
        reports_dir = Path('./accessibility-reports')
        reports_dir.mkdir(exist_ok=True)

        screenshot_path = reports_dir / f'{name}.png'
        page.screenshot(path=str(screenshot_path), full_page=True)
        print(f"  ✓ Screenshot saved: {screenshot_path}")

        # Inject and run axe-core
        inject_axe(page)
        axe_results = run_axe_audit(page)

        if 'error' in axe_results:
            print(f"  ⚠️  axe-core error: {axe_results['error']}")
            return None

        # Save full results
        json_path = reports_dir / f'{name}.json'
        with open(json_path, 'w') as f:
            json.dump(axe_results, f, indent=2)

        # Extract violations
        violations = axe_results.get('violations', [])
        contrast_violations = [v for v in violations if 'color-contrast' in v.get('id', '')]

        print(f"  ✓ Total violations: {len(violations)}")
        print(f"  ⚠️  Contrast violations: {len(contrast_violations)}")

        # Display contrast issues
        if contrast_violations:
            for violation in contrast_violations:
                print(f"\n  📌 {violation.get('help', 'Color contrast issue')}")
                print(f"     Impact: {violation.get('impact', 'unknown').upper()}")
                print(f"     Affected elements: {len(violation.get('nodes', []))}")

                for idx, node in enumerate(violation.get('nodes', [])[:5], 1):
                    target = node.get('target', ['unknown'])[0]
                    html = node.get('html', '')[:80]
                    failure = node.get('failureSummary', '')

                    print(f"\n     Element {idx}:")
                    print(f"       Selector: {target}")
                    print(f"       HTML: {html}...")
                    if failure:
                        # Clean up failure summary
                        failure_lines = failure.split('\n')
                        for line in failure_lines[:3]:
                            if line.strip():
                                print(f"       {line.strip()}")

        return {
            'name': name,
            'url': url,
            'total_violations': len(violations),
            'contrast_violations': len(contrast_violations),
            'violations': violations
        }

    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return None

def main():
    print("🚀 Starting Accessibility Audit")
    print("📊 Focusing on color contrast and accessibility issues\n")

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for page_info in pages_to_audit:
            result = audit_page(page, page_info['url'], page_info['name'])
            if result:
                results.append(result)

        browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)

    for result in results:
        print(f"\n{result['name']}:")
        print(f"  Total violations: {result['total_violations']}")
        print(f"  Contrast violations: {result['contrast_violations']}")

    total_violations = sum(r['total_violations'] for r in results)
    total_contrast = sum(r['contrast_violations'] for r in results)

    print(f"\nTotal violations across all pages: {total_violations}")
    print(f"Total contrast violations: {total_contrast}")

    print("\n📁 Reports saved to: ./accessibility-reports/")
    print("   - Screenshots (.png)")
    print("   - Detailed results (.json)\n")

if __name__ == '__main__':
    main()
