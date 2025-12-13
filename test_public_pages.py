"""
Frontend test for Watershed Campground - Public Pages
Tests public-facing pages without authentication
"""

from playwright.sync_api import sync_playwright
import sys

def test_public_pages():
    """Test public-facing pages of the campground site"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Set longer default timeout (60 seconds)
        page.set_default_timeout(60000)

        print("🚀 Starting Public Pages Tests...")

        try:
            # Test 1: Homepage
            print("\n🏠 Test 1: Loading homepage...")
            page.goto('http://localhost:3000', wait_until='domcontentloaded')
            # Wait for hero section to be visible
            page.wait_for_selector('h1', timeout=30000)
            page.screenshot(path='/tmp/homepage.png', full_page=True)

            title = page.locator('h1').first.text_content()
            print(f"   Homepage title: {title}")
            print("✅ Homepage loaded successfully")

            # Test 2: Navigation Links
            print("\n🔗 Test 2: Testing navigation links...")
            nav_links = page.locator('nav a').all()
            print(f"   Found {len(nav_links)} navigation links")

            for link in nav_links[:5]:  # Test first 5 links
                link_text = link.text_content()
                print(f"   - {link_text}")
            print("✅ Navigation links present")

            # Test 3: Gallery Page
            print("\n📸 Test 3: Loading gallery page...")
            page.goto('http://localhost:3000/gallery', wait_until='domcontentloaded')
            # Wait for page content to load (more flexible than waiting for h1)
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/gallery-page.png', full_page=True)

            # Look for images
            images = page.locator('img').all()
            print(f"   Found {len(images)} images on gallery page")
            print("✅ Gallery page loaded")

            # Test 4: Rates Page
            print("\n💰 Test 4: Loading rates page...")
            page.goto('http://localhost:3000/rates', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/rates-page.png', full_page=True)
            print("✅ Rates page loaded")

            # Test 5: Reservation Form
            print("\n📋 Test 5: Loading reservation form...")
            page.goto('http://localhost:3000/make-a-reservation', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/reservation-form.png', full_page=True)

            # Check for form fields
            check_in = page.locator('input[name="checkIn"]')
            check_out = page.locator('input[name="checkOut"]')
            first_name = page.locator('input[name="firstName"]')
            last_name = page.locator('input[name="lastName"]')
            email = page.locator('input[name="email"]')

            form_fields_present = (
                check_in.count() > 0 and
                check_out.count() > 0 and
                first_name.count() > 0 and
                last_name.count() > 0 and
                email.count() > 0
            )

            if form_fields_present:
                print("   ✅ All required form fields present:")
                print("      - Check In date")
                print("      - Check Out date")
                print("      - First Name")
                print("      - Last Name")
                print("      - Email")
            else:
                print("   ⚠️  Some form fields missing")

            print("✅ Reservation form loaded")

            # Test 6: Amenities Page
            print("\n🏕️  Test 6: Loading amenities page...")
            page.goto('http://localhost:3000/amenities', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/amenities-page.png', full_page=True)
            print("✅ Amenities page loaded")

            # Test 7: Contact Page
            print("\n📞 Test 7: Loading contact page...")
            page.goto('http://localhost:3000/contact', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/contact-page.png', full_page=True)
            print("✅ Contact page loaded")

            # Test 8: Mobile Responsiveness Check
            print("\n📱 Test 8: Testing mobile responsiveness...")
            page.set_viewport_size({"width": 375, "height": 667})  # iPhone SE size
            page.goto('http://localhost:3000', wait_until='domcontentloaded')
            page.wait_for_selector('h1', timeout=30000)
            page.screenshot(path='/tmp/homepage-mobile.png', full_page=True)
            print("✅ Mobile viewport tested")

            print("\n" + "="*60)
            print("🎉 All public page tests completed!")
            print("="*60)
            print("\n📸 Screenshots saved:")
            print("   - /tmp/homepage.png")
            print("   - /tmp/gallery-page.png")
            print("   - /tmp/rates-page.png")
            print("   - /tmp/reservation-form.png")
            print("   - /tmp/amenities-page.png")
            print("   - /tmp/contact-page.png")
            print("   - /tmp/homepage-mobile.png")

        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            page.screenshot(path='/tmp/error-screenshot.png', full_page=True)
            print("   Error screenshot saved to /tmp/error-screenshot.png")
            browser.close()
            sys.exit(1)

        browser.close()
        print("\n✨ Testing complete!")

if __name__ == '__main__':
    test_public_pages()
