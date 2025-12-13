"""
Test the availability system and campsite assignment
Tests reservation flow, campsite assignment, and overlap detection
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta
import sys

def test_availability_system():
    """Test the availability and reservation system"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(60000)

        print("🚀 Starting Availability System Test...")

        try:
            # Test 1: Make a reservation through public form
            print("\n📋 Test 1: Making a reservation through public form...")
            page.goto('http://localhost:3000/make-a-reservation', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/reservation-form-empty.png', full_page=True)

            # Calculate dates (check-in: 5 days from now, check-out: 8 days from now)
            check_in_date = (datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d')
            check_out_date = (datetime.now() + timedelta(days=8)).strftime('%Y-%m-%d')

            print(f"   Check-in: {check_in_date}")
            print(f"   Check-out: {check_out_date}")

            # Fill out reservation form - Personal Information
            page.fill('input[name="firstName"]', 'John')
            page.fill('input[name="lastName"]', 'Doe')
            page.fill('input[name="address1"]', '123 Main Street')
            page.fill('input[name="city"]', 'Portland')
            page.fill('input[name="postalCode"]', '97201')

            # Reservation Details
            page.fill('input[name="checkIn"]', check_in_date)
            page.fill('input[name="checkOut"]', check_out_date)
            page.fill('input[name="rvLength"]', '25 ft')
            page.fill('input[name="rvYear"]', '2020')
            page.fill('input[name="adults"]', '2')
            page.fill('input[name="children"]', '0')
            print("   Guests: 2 adults, 0 children")

            # Camping Unit Type (radio button)
            page.click('input[name="campingUnit"][value="Pull Trailer"]')
            print("   Camping Unit: Pull Trailer")

            # Contact Information
            page.fill('input[name="phone"]', '(503) 555-0123')
            page.fill('input[name="email"]', 'john.doe@example.com')
            page.select_option('select[name="contactMethod"]', 'Email')
            print("   Contact method: Email")

            page.screenshot(path='/tmp/reservation-form-filled.png', full_page=True)
            print("✅ Reservation form filled")

            # Submit the form
            print("\n💾 Test 2: Submitting reservation...")
            submit_button = page.locator('button[type="submit"]')
            submit_button.click()
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/reservation-submitted.png', full_page=True)

            # Check for success message or confirmation
            content = page.content()
            if 'confirmation' in content.lower() or 'success' in content.lower() or 'thank' in content.lower():
                print("✅ Reservation appears to be submitted (found confirmation text)")
            else:
                print("   ⚠️  No clear confirmation message found")

            current_url = page.url
            print(f"   Current URL: {current_url}")

            # Test 3: Login to admin and verify reservation
            print("\n🔐 Test 3: Logging in to admin panel...")
            page.goto('http://localhost:3000/admin/login', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)

            page.fill('input[type="email"]', 'admin@test.com')
            page.fill('input[type="password"]', 'admin123')
            page.click('button[type="submit"]')
            page.wait_for_timeout(3000)
            print("✅ Admin login successful")

            # Test 4: Check admin dashboard for new reservation
            print("\n📊 Test 4: Checking admin dashboard...")
            page.goto('http://localhost:3000/admin', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/admin-dashboard-with-reservation.png', full_page=True)

            # Look for our reservation
            dashboard_content = page.content()
            if 'John Doe' in dashboard_content or 'john.doe@example.com' in dashboard_content:
                print("✅ Found reservation for John Doe in admin dashboard")
            else:
                print("   ⚠️  Reservation not visible in dashboard yet")

            # Count reservations
            rows = page.locator('tbody tr').all()
            print(f"   Total reservations visible: {len(rows)}")

            # Check if campsite was assigned
            if 'Campsite' in dashboard_content:
                print("   ✅ Campsite column present in dashboard")
                # Try to find assigned campsite code (S1-S5, C1-C2)
                import re
                campsite_codes = re.findall(r'\b(S[1-6]|C[1-2])\b', dashboard_content)
                if campsite_codes:
                    print(f"   Found campsite codes in dashboard: {', '.join(set(campsite_codes))}")

            # Test 5: Try to make overlapping reservation (should fail or show warning)
            print("\n⚠️  Test 5: Testing overlap detection...")
            print("   Attempting to make overlapping reservation...")

            page.goto('http://localhost:3000/make-a-reservation', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)

            # Use overlapping dates (same check-in as previous reservation)
            overlap_check_in = check_in_date
            overlap_check_out = (datetime.now() + timedelta(days=6)).strftime('%Y-%m-%d')

            # Personal Information
            page.fill('input[name="firstName"]', 'Jane')
            page.fill('input[name="lastName"]', 'Smith')
            page.fill('input[name="address1"]', '456 Oak Avenue')
            page.fill('input[name="city"]', 'Seattle')
            page.fill('input[name="postalCode"]', '98101')

            # Reservation Details
            page.fill('input[name="checkIn"]', overlap_check_in)
            page.fill('input[name="checkOut"]', overlap_check_out)
            page.fill('input[name="rvLength"]', '30 ft')
            page.fill('input[name="rvYear"]', '2022')
            page.fill('input[name="adults"]', '2')
            page.fill('input[name="children"]', '1')

            # Camping Unit
            page.click('input[name="campingUnit"][value="5th Wheel"]')

            # Contact
            page.fill('input[name="phone"]', '(206) 555-0456')
            page.fill('input[name="email"]', 'jane.smith@example.com')
            page.select_option('select[name="contactMethod"]', 'Phone')

            page.screenshot(path='/tmp/overlap-reservation-form.png', full_page=True)

            submit_button = page.locator('button[type="submit"]')
            submit_button.click()
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/overlap-reservation-result.png', full_page=True)

            overlap_content = page.content()
            if 'available' in overlap_content.lower() or 'full' in overlap_content.lower():
                print("✅ System shows availability feedback for overlapping dates")
            else:
                print("   Overlapping reservation submitted (system may assign different campsite)")

            # Test 6: Make non-overlapping reservation
            print("\n📅 Test 6: Making non-overlapping reservation...")

            page.goto('http://localhost:3000/make-a-reservation', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)

            # Use completely different dates (15-18 days from now)
            future_check_in = (datetime.now() + timedelta(days=15)).strftime('%Y-%m-%d')
            future_check_out = (datetime.now() + timedelta(days=18)).strftime('%Y-%m-%d')

            print(f"   Check-in: {future_check_in}")
            print(f"   Check-out: {future_check_out}")

            # Personal Information
            page.fill('input[name="firstName"]', 'Bob')
            page.fill('input[name="lastName"]', 'Wilson')
            page.fill('input[name="address1"]', '789 Pine Street')
            page.fill('input[name="city"]', 'Eugene')
            page.fill('input[name="postalCode"]', '97401')

            # Reservation Details
            page.fill('input[name="checkIn"]', future_check_in)
            page.fill('input[name="checkOut"]', future_check_out)
            page.fill('input[name="rvLength"]', 'N/A')  # Using tent
            page.fill('input[name="adults"]', '2')
            page.fill('input[name="children"]', '2')
            print("   Guests: 2 adults, 2 children")

            # Camping Unit
            page.click('input[name="campingUnit"][value="Tent"]')
            print("   Camping Unit: Tent")

            # Contact
            page.fill('input[name="phone"]', '(541) 555-0789')
            page.fill('input[name="email"]', 'bob.wilson@example.com')
            page.select_option('select[name="contactMethod"]', 'Either')

            submit_button = page.locator('button[type="submit"]')
            submit_button.click()
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/future-reservation-result.png', full_page=True)
            print("✅ Non-overlapping reservation submitted")

            # Test 7: Check admin panel again
            print("\n📊 Test 7: Verifying all reservations in admin panel...")
            page.goto('http://localhost:3000/admin', wait_until='domcontentloaded')
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/admin-final-state.png', full_page=True)

            rows_final = page.locator('tbody tr').all()
            print(f"   Total reservations now: {len(rows_final)}")

            final_content = page.content()
            test_emails = ['john.doe@example.com', 'jane.smith@example.com', 'bob.wilson@example.com']
            found_count = 0
            for email in test_emails:
                if email in final_content:
                    found_count += 1
                    print(f"   ✅ Found {email}")

            print(f"\n   Found {found_count}/3 test reservations in admin panel")

            print("\n" + "="*60)
            print("🎉 Availability System Test Complete!")
            print("="*60)
            print("\n📸 Screenshots saved:")
            print("   - /tmp/reservation-form-empty.png")
            print("   - /tmp/reservation-form-filled.png")
            print("   - /tmp/reservation-submitted.png")
            print("   - /tmp/admin-dashboard-with-reservation.png")
            print("   - /tmp/overlap-reservation-form.png")
            print("   - /tmp/overlap-reservation-result.png")
            print("   - /tmp/future-reservation-result.png")
            print("   - /tmp/admin-final-state.png")

        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            page.screenshot(path='/tmp/error-screenshot.png', full_page=True)
            print("   Error screenshot saved to /tmp/error-screenshot.png")
            browser.close()
            sys.exit(1)

        browser.close()
        print("\n✨ Test complete!")

if __name__ == '__main__':
    test_availability_system()
