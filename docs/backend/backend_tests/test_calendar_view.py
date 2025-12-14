
"""
Test the Calendar View functionality
"""

from playwright.sync_api import sync_playwright
import sys
import datetime

def test_calendar_view():
    """Test the administrative calendar view"""

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        page.set_default_timeout(30000)

        print("🚀 Starting Calendar View Test...")

        try:
            # Step 1: Login
            print("\n🔐 Step 1: Logging in as admin...")
            page.goto('http://localhost:3000/admin/login', wait_until='domcontentloaded')
            
            # Check if we are already logged in or need to log in
            if page.locator('input[type="email"]').is_visible():
                page.fill('input[type="email"]', 'admin@test.com')
                page.fill('input[type="password"]', 'admin123')
                page.click('button[type="submit"]')
                page.wait_for_url('**/admin')
            
            print("✅ Login successful")

            # Step 2: Navigate to Calendar
            print("\n📅 Step 2: Navigating to Calendar View...")
            page.goto('http://localhost:3000/admin/calendar', wait_until='networkidle')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/calendar-view.png', full_page=True)
            print("✅ Calendar page loaded")

            # Step 3: Verify basic structure
            print("\n🔍 Step 3: Verifying calendar structure...")
            
            # Check header
            if page.get_by_text(datetime.datetime.now().strftime("%B %Y")).is_visible():
                 print(f"   ✅ Found current month header: {datetime.datetime.now().strftime('%B %Y')}")
            else:
                 print("   ⚠️ Current month header not found")

            # Check for campsites (Assuming some exist from previous tests)
            campsite_rows = page.locator('.sticky.left-0')
            count = campsite_rows.count()
            print(f"   Found {count} campsite rows (including header)")
            
            if count > 1:
                print("   ✅ Campsite rows rendered")
            else:
                print("   ⚠️ No campsite rows found (besides header maybe)")

            # Step 4: Check for reservation blocks
            print("\n🎫 Step 4: Checking for reservations...")
            # Look for elements with reservation styling (absolute positioned)
            # We can look for text we know fits a reservation or just the class
            reservations = page.locator('button.absolute.rounded-md')
            res_count = reservations.count()
            print(f"   Found {res_count} reservation blocks visible")

            if res_count > 0:
                print("   ✅ Reservations rendered")
                
                # Step 5: Test Interaction
                print("\n👆 Step 5: Testing interactions...")
                first_res = reservations.first
                first_res.click()
                page.wait_for_timeout(1000)
                
                # Check for drawer
                drawer = page.locator('.fixed.inset-y-0.right-0')
                if drawer.is_visible():
                    print("   ✅ Reservation drawer opened")
                    page.screenshot(path='/tmp/calendar-drawer.png')
                    
                    # Close drawer - look for X button
                    close_button = page.locator('button:has(svg.lucide-x)').first
                    if close_button.is_visible():
                        close_button.click()
                    page.wait_for_timeout(500)
                    if not drawer.is_visible():
                        print("   ✅ Drawer closed")
                else:
                    print("   ❌ Drawer did not open")
            else:
                print("   ⚠️ No reservations found to test interaction")

            print("\n" + "="*60)
            print("🎉 Calendar View Test Complete!")
            print("="*60)

        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            page.screenshot(path='/tmp/calendar-error.png', full_page=True)
            browser.close()
            sys.exit(1)

        browser.close()

if __name__ == '__main__':
    test_calendar_view()
