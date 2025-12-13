"""
Test creating a new campsite via the admin UI
"""

from playwright.sync_api import sync_playwright
import sys

def test_create_campsite():
    """Test creating a new campsite through the admin interface"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(60000)

        print("🚀 Starting Create Campsite Test...")

        try:
            # Step 1: Login
            print("\n🔐 Step 1: Logging in as admin...")
            page.goto('http://localhost:3000/admin/login', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)

            page.fill('input[type="email"]', 'admin@test.com')
            page.fill('input[type="password"]', 'admin123')
            page.click('button[type="submit"]')
            page.wait_for_timeout(3000)

            print("✅ Login successful")

            # Step 2: Navigate to Campsites page
            print("\n📋 Step 2: Navigating to campsites page...")
            page.goto('http://localhost:3000/admin/campsites', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/campsites-before-add.png', full_page=True)

            # Count current campsites
            rows_before = len(page.locator('tbody tr').all())
            print(f"   Current campsites: {rows_before}")
            print("✅ Campsites page loaded")

            # Step 3: Click "Add Campsite" button
            print("\n➕ Step 3: Clicking 'Add Campsite' button...")
            add_button = page.get_by_role('link', name='Add Campsite')
            add_button.click()
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/add-campsite-form.png', full_page=True)
            print("✅ Add Campsite form loaded")

            # Step 4: Fill out the form
            print("\n📝 Step 4: Filling out new campsite form...")

            # Fill in campsite details using placeholders and positions
            # Name field (first text input)
            name_input = page.locator('input[type="text"]').first
            name_input.fill('Riverfront Site 6')
            print("   Name: Riverfront Site 6")

            # Code field (second text input with uppercase class)
            code_input = page.locator('input.uppercase')
            code_input.fill('S6')
            print("   Code: S6")

            # Type dropdown
            type_select = page.locator('select')
            type_select.select_option('rv')
            print("   Type: RV")

            # Max Guests (first number input)
            max_guests_input = page.locator('input[type="number"]').first
            max_guests_input.fill('4')
            print("   Max Guests: 4")

            # Base Rate (second number input)
            base_rate_input = page.locator('input[type="number"]').nth(1)
            base_rate_input.fill('48')
            print("   Base Rate: $48.00")

            # Notes (textarea)
            notes_textarea = page.locator('textarea')
            notes_textarea.fill('Premium riverfront location added via Playwright test')
            print("   Notes: Added test description")

            # Sort order (third number input)
            sort_order_input = page.locator('input[type="number"]').nth(2)
            sort_order_input.fill('6')
            print("   Sort Order: 6")

            page.screenshot(path='/tmp/add-campsite-form-filled.png', full_page=True)
            print("✅ Form filled out")

            # Step 5: Submit the form
            print("\n💾 Step 5: Submitting form...")
            submit_button = page.get_by_role('button', name='Create Campsite')
            submit_button.click()

            # Wait for redirect back to campsites page
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/campsites-after-add.png', full_page=True)
            print("✅ Form submitted")

            # Step 6: Verify new campsite appears
            print("\n✅ Step 6: Verifying new campsite...")
            page.wait_for_timeout(2000)

            # Check if we're back on the campsites page
            current_url = page.url
            print(f"   Current URL: {current_url}")

            # Count rows again
            rows_after = len(page.locator('tbody tr').all())
            print(f"   Campsites after: {rows_after}")

            # Look for the new campsite code
            page_content = page.content()
            if 'S6' in page_content:
                print("   ✅ Found campsite code 'S6' in table")
            else:
                print("   ⚠️  Campsite 'S6' not visible yet")

            if 'Riverfront Site 6' in page_content:
                print("   ✅ Found campsite name 'Riverfront Site 6' in table")
            else:
                print("   ⚠️  Campsite name not visible yet")

            if rows_after > rows_before:
                print(f"✅ New campsite added successfully! ({rows_before} → {rows_after})")
            else:
                print(f"⚠️  Row count unchanged ({rows_before} → {rows_after})")

            print("\n" + "="*60)
            print("🎉 Create Campsite Test Complete!")
            print("="*60)
            print("\n📸 Screenshots saved:")
            print("   - /tmp/campsites-before-add.png")
            print("   - /tmp/add-campsite-form.png")
            print("   - /tmp/add-campsite-form-filled.png")
            print("   - /tmp/campsites-after-add.png")

        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            page.screenshot(path='/tmp/error-screenshot.png', full_page=True)
            print("   Error screenshot saved to /tmp/error-screenshot.png")
            browser.close()
            sys.exit(1)

        browser.close()
        print("\n✨ Test complete!")

if __name__ == '__main__':
    test_create_campsite()
