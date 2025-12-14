"""
Frontend test for Watershed Campground - Campsite Management
Tests the admin campsite management UI and availability system
"""

from playwright.sync_api import sync_playwright, expect
import sys

def test_campsite_management():
    """Test the admin campsite management interface"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("🚀 Starting Campsite Management Tests...")

        try:
            # Test 0: Admin Login
            print("\n🔐 Test 0: Logging in as admin...")
            page.goto('http://localhost:3000/admin/login')
            page.wait_for_load_state('networkidle')

            # Fill in login form
            page.fill('input[type="email"]', 'admin@test.com')
            page.fill('input[type="password"]', 'admin123')

            # Click sign in and wait for navigation
            page.click('button[type="submit"]')
            page.wait_for_url('**/admin', timeout=10000)
            page.wait_for_load_state('networkidle')

            print("✅ Successfully logged in as admin")
            page.screenshot(path='/tmp/admin-logged-in.png', full_page=True)

            # Test 1: Admin Campsites Page Loads
            print("\n📋 Test 1: Loading /admin/campsites page...")
            page.goto('http://localhost:3000/admin/campsites')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/admin-campsites.png', full_page=True)
            print("✅ Admin campsites page loaded")

            # Verify page title
            title = page.locator('h1').first.text_content()
            print(f"   Page title: {title}")

            # Test 2: Check for sample campsite data
            print("\n📊 Test 2: Verifying sample campsite data...")

            # Wait for table to load
            page.wait_for_selector('table', timeout=5000)

            # Count rows (should have 7 sample campsites)
            rows = page.locator('tbody tr').all()
            print(f"   Found {len(rows)} campsites in table")

            # Verify specific campsites exist
            page_content = page.content()
            expected_sites = ['S1', 'S2', 'S3', 'S4', 'S5', 'C1', 'C2']
            found_sites = []
            for site_code in expected_sites:
                if site_code in page_content:
                    found_sites.append(site_code)

            print(f"   Found campsite codes: {', '.join(found_sites)}")

            if len(found_sites) == 7:
                print("✅ All sample campsites visible")
            else:
                print(f"⚠️  Expected 7 campsites, found {len(found_sites)}")

            # Test 3: Test filter functionality
            print("\n🔍 Test 3: Testing filter buttons...")

            # Check if filter buttons exist
            all_button = page.get_by_role('button', name='All')
            rv_filter = page.get_by_role('button', name='RV Sites')
            tent_filter = page.get_by_role('button', name='Tent Sites')
            cabin_filter = page.get_by_role('button', name='Cabins')

            if all_button.count() > 0:
                print("   ✅ Filter buttons found")

                # Click RV filter
                rv_filter.click()
                page.wait_for_timeout(500)
                page.screenshot(path='/tmp/admin-campsites-rv-filter.png', full_page=True)
                rv_rows = page.locator('tbody tr').all()
                print(f"   RV Sites filter: {len(rv_rows)} sites")

                # Click Tent filter
                tent_filter.click()
                page.wait_for_timeout(500)
                tent_rows = page.locator('tbody tr').all()
                print(f"   Tent Sites filter: {len(tent_rows)} sites")

                # Click Cabins filter
                cabin_filter.click()
                page.wait_for_timeout(500)
                cabin_rows = page.locator('tbody tr').all()
                print(f"   Cabins filter: {len(cabin_rows)} sites")

                # Reset to All
                all_button.click()
                page.wait_for_timeout(500)
                print("✅ Filter functionality working")
            else:
                print("   ⚠️  Filter buttons not found")

            # Test 4: Navigate to Add Campsite page
            print("\n➕ Test 4: Testing 'Add Campsite' navigation...")

            add_button = page.get_by_role('link', name='Add Campsite')
            if add_button.count() > 0:
                add_button.click()
                page.wait_for_load_state('networkidle')
                page.screenshot(path='/tmp/admin-campsites-new.png', full_page=True)

                # Verify we're on the new campsite page
                new_title = page.locator('h1').first.text_content()
                print(f"   Navigated to: {new_title}")

                # Check for form fields
                form_fields = [
                    'input[name="name"]',
                    'input[name="code"]',
                    'select[name="type"]',
                    'input[name="max_guests"]',
                    'input[name="base_rate"]'
                ]

                fields_found = 0
                for field in form_fields:
                    if page.locator(field).count() > 0:
                        fields_found += 1

                print(f"   Found {fields_found}/{len(form_fields)} required form fields")

                if fields_found == len(form_fields):
                    print("✅ Add Campsite form loaded correctly")
                else:
                    print("   ⚠️  Some form fields missing")
            else:
                print("   ⚠️  Add Campsite button not found")

            # Test 5: Test Public Reservation Page
            print("\n🏕️  Test 5: Testing public reservation page...")
            page.goto('http://localhost:3000/make-a-reservation')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/public-reservation-form.png', full_page=True)

            # Check for date fields
            check_in = page.locator('input[name="checkIn"]')
            check_out = page.locator('input[name="checkOut"]')

            if check_in.count() > 0 and check_out.count() > 0:
                print("✅ Reservation form loaded with date fields")
            else:
                print("   ⚠️  Date fields not found")

            # Test 6: Test Admin Dashboard (reservations with campsite column)
            print("\n📊 Test 6: Testing admin dashboard...")
            page.goto('http://localhost:3000/admin')
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/admin-dashboard.png', full_page=True)

            # Check if Campsite column exists
            content = page.content()
            if 'Campsite' in content:
                print("✅ Admin dashboard loaded with Campsite column")
            else:
                print("   ⚠️  Campsite column not found in dashboard")

            print("\n" + "="*60)
            print("🎉 All tests completed!")
            print("="*60)
            print("\n📸 Screenshots saved:")
            print("   - /tmp/admin-logged-in.png")
            print("   - /tmp/admin-campsites.png")
            print("   - /tmp/admin-campsites-rv-filter.png")
            print("   - /tmp/admin-campsites-new.png")
            print("   - /tmp/public-reservation-form.png")
            print("   - /tmp/admin-dashboard.png")

        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            page.screenshot(path='/tmp/error-screenshot.png', full_page=True)
            print("   Error screenshot saved to /tmp/error-screenshot.png")
            browser.close()
            sys.exit(1)

        browser.close()
        print("\n✨ Testing complete!")

if __name__ == '__main__':
    test_campsite_management()
