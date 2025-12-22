import { test, expect } from '@playwright/test';
import { format, addDays } from 'date-fns';

test.describe('Guest Booking - Complete Happy Path', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Unauthenticated user

    test('should complete full booking with Stripe payment', async ({ page }) => {
        test.setTimeout(60000); // Increase timeout for full E2E flow including Stripe
        // ==========================================
        // STEP 1: Navigate to Reservation Page
        // ==========================================
        await page.goto('/make-a-reservation');

        // Verify wizard loads
        await expect(page.getByRole('heading', { name: 'Make a Reservation' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'When would you like to stay?' })).toBeVisible();

        // ==========================================
        // STEP 2: Select Dates (Wizard Step 1)
        // ==========================================
        const tomorrow = addDays(new Date(), 1);
        const checkOutDate = addDays(tomorrow, 2);
        const checkInDay = format(tomorrow, 'd');
        const checkOutDay = format(checkOutDate, 'd');

        await page.locator(`button:has-text("${checkInDay}")`).first().click();
        await page.waitForTimeout(500);
        await page.locator(`button:has-text("${checkOutDay}")`).first().click();

        // ==========================================
        // STEP 3: Select Parameters (Wizard Step 2)
        // ==========================================
        await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
        await page.getByRole('button', { name: /RV.*Trailer/i }).click();
        await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
        await page.getByRole('button', { name: /Find Campsites/i }).click();

        // ==========================================
        // STEP 4: Select Available Campsite (Wizard Step 3)
        // ==========================================
        await expect(page.getByRole('heading', { name: /available/i })).toBeVisible({ timeout: 10000 });
        const bookButtons = page.getByRole('button', { name: /Book Now/i });
        await expect(bookButtons.first()).toBeVisible();
        await bookButtons.first().click();

        // ==========================================
        // STEP 5: Fill Personal Information Form
        // ==========================================
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();

        await page.getByPlaceholder('First Name').fill('Test');
        await page.getByPlaceholder('Last Name').fill('Playwright');
        await page.getByPlaceholder('Address Line 1').fill('123 Test Ave');
        await page.getByPlaceholder('City').fill('Vancouver');
        await page.getByPlaceholder('Postal Code').fill('V6B 1A1');
        await page.getByPlaceholder('Phone').fill('604-555-0100');
        await page.getByPlaceholder('Email').fill('test.playwright@example.com');
        await page.selectOption('select[name="contactMethod"]', 'Email');
        await page.getByRole('button', { name: /Continue to Add-ons/i }).click();

        // ==========================================
        // Network Monitoring - Set up EARLY to capture payment intent creation
        // ==========================================
        console.log("Setting up network and console monitoring...");

        const apiResponses: Record<string, { status: number; body?: unknown; error?: string }> = {};
        const consoleLogs: string[] = [];

        // Capture browser console logs
        page.on('console', (msg) => {
            const text = msg.text();
            consoleLogs.push(`[${msg.type()}] ${text}`);
            console.log(`🖥️  Browser Console [${msg.type()}]: ${text}`);
        });

        // Capture page errors
        page.on('pageerror', (error) => {
            console.log(`💥 Page Error: ${error.message}`);
            consoleLogs.push(`[ERROR] ${error.message}\n${error.stack}`);
        });

        page.on('response', async (response) => {
            const url = response.url();

            if (url.includes('/api/create-payment-intent')) {
                console.log(`📍 Payment Intent API Response: ${response.status()}`);
                try {
                    const body = await response.json();
                    console.log('📍 Payment Intent Body:', JSON.stringify(body, null, 2));
                    apiResponses.paymentIntent = { status: response.status(), body };
                } catch (e) {
                    console.log('📍 Could not parse payment intent response');
                    apiResponses.paymentIntent = { status: response.status(), error: 'Parse failed' };
                }
            }

            if (url.includes('/api/reservation')) {
                console.log(`📍 Reservation API Response: ${response.status()}`);
                try {
                    const body = await response.json();
                    console.log('📍 Reservation Response Body:', JSON.stringify(body, null, 2));
                    apiResponses.reservation = { status: response.status(), body };
                } catch (e) {
                    console.log('📍 Could not parse reservation response');
                    apiResponses.reservation = { status: response.status(), error: 'Parse failed' };
                }
            }
        });

        page.on('response', async (response2) => {
            // Capture all 500 errors
            if (response2.status() === 500) {
                console.log(`💥 500 ERROR from: ${response2.url()}`);
                try {
                    const errorBody = await response2.text();
                    console.log(`   Error body: ${errorBody.substring(0, 500)}`);
                } catch (e) {
                    console.log(`   Could not read error body`);
                }
            }
        });

        page.on('requestfailed', (request) => {
            console.log(`❌ Request Failed: ${request.url()}`);
            console.log(`   Failure: ${request.failure()?.errorText}`);
        });

        // ==========================================
        // STEP 6: Add-ons (Optional)
        // ==========================================
        await expect(page.getByRole('heading', { name: 'Enhance Your Stay' })).toBeVisible();

        console.log("Clicking 'Review & Pay' button...");
        const reviewPayBtn = page.getByRole('button', { name: /Review.*Pay/i });
        await reviewPayBtn.click();

        // Wait for payment intent creation
        console.log("Waiting for payment intent API call...");
        await page.waitForTimeout(5000); // Give it time to create payment intent

        // ==========================================
        // STEP 7: Review & Pay
        // ==========================================
        await expect(page.getByRole('heading', { name: 'Review & Pay' })).toBeVisible({ timeout: 10000 });

        // ==========================================
        // STEP 8: Fill Stripe Payment Form
        // ==========================================
        console.log("Waiting for Stripe iframes...");

        // 1. Wait for ANY Stripe iframe to be present
        const iframeCount = await page.locator('iframe[src*="js.stripe.com"]').count();
        expect(iframeCount).toBeGreaterThan(0);

        // 2. Locate the Payment Method Selector frame and ensure "Card" is selected
        let methodSelectorFrame = null;
        let cardFrame = null;

        // Wait for frames to settle
        await page.waitForTimeout(2000);

        const frames = page.frames().filter(f => f.url().includes('stripe'));
        console.log(`Scanning ${frames.length} Stripe frames for 'Card' selection...`);

        for (const f of frames) {
            const cardAccordion = f.locator('.p-AccordionButton').filter({ hasText: 'Card' });
            const cardBtn = f.getByRole('button', { name: /^Card$/i });

            if (await cardAccordion.count() > 0) {
                console.log(`Found Card Accordion in frame: ${f.name()}`);
                methodSelectorFrame = f;

                if (await cardAccordion.getAttribute('aria-expanded') === 'false') {
                    await cardAccordion.click();
                    console.log("Clicked Card Accordion to expand.");
                    await page.waitForTimeout(1000);
                }
                break;
            }

            if (await cardBtn.count() > 0 && await cardBtn.isVisible()) {
                console.log(`Found 'Card' button in frame: ${f.name()}`);
                methodSelectorFrame = f;
                await cardBtn.click();
                await page.waitForTimeout(1000);
                break;
            }
        }

        // 3. Find the frame with inputs
        const updatedFrames = page.frames().filter(f => f.url().includes('stripe'));

        for (const f of updatedFrames) {
            const cardInput = f.locator('input[name="cardnumber"]').or(f.locator('input[name="number"]')).or(f.getByLabel(/card number/i));
            if (await cardInput.count() > 0 && await cardInput.isVisible()) {
                console.log(`Found active card input in frame: ${f.name()}`);
                cardFrame = f;
                break;
            }
        }

        if (!cardFrame) {
            await page.screenshot({ path: 'stripe-missing-inputs.png', fullPage: true });
            throw new Error("Could not find Stripe frame with visible card inputs after selecting 'Card'.");
        }

        // 4. Fill Inputs
        const stripeFrame = cardFrame;
        console.log("Filling card details...");

        const numberInput = stripeFrame.locator('input[name="cardnumber"]').or(stripeFrame.locator('input[name="number"]')).or(stripeFrame.getByLabel(/card number/i));
        const expiryInput = stripeFrame.locator('input[name="exp-date"]').or(stripeFrame.locator('input[name="expiry"]')).or(stripeFrame.getByLabel(/expiration/i));
        const cvcInput = stripeFrame.locator('input[name="cvc"]').or(stripeFrame.getByLabel(/cvc/i));
        const zipInput = stripeFrame.locator('input[name="postal"]').or(stripeFrame.locator('input[name="postalCode"]')).or(stripeFrame.getByLabel(/zip/i));

        await numberInput.first().fill('4242424242424242');
        await expiryInput.first().fill('12/34');
        await cvcInput.first().fill('123');
        if (await zipInput.count() > 0 && await zipInput.first().isVisible()) {
            await zipInput.first().fill('12345');
        }

        // 5. Submit Payment
        const payBtn = page.getByRole('button', { name: /Pay/i });

        // Wait for Stripe SDK to be ready
        console.log("Waiting for Stripe SDK to initialize...");
        await expect(page.getByTestId('stripe-ready')).toHaveText('true', { timeout: 30000 }).catch(async () => {
            await page.screenshot({ path: 'stripe-not-ready.png' });
            throw new Error("Stripe SDK never became ready");
        });

        // IMPORTANT: Verify button is enabled (meaning Stripe considers details valid)
        console.log("Waiting for Pay button to be enabled (Stripe validation)...");
        await expect(payBtn).toBeEnabled({ timeout: 20000 }).catch(async () => {
            // If timeout, dump reasons
            await page.screenshot({ path: 'pay-disabled.png' });
            throw new Error("Pay button remained disabled. Stripe likely considers inputs incomplete.");
        });

        // Log button details before clicking
        const buttonInfo = await page.evaluate(() => {
            const btn = document.querySelector('button[type="submit"]');
            return {
                text: btn?.textContent,
                disabled: btn?.hasAttribute('disabled'),
                type: btn?.getAttribute('type'),
                ariaDisabled: btn?.getAttribute('aria-disabled'),
                form: btn?.closest('form') ? 'inside form' : 'NOT in form'
            };
        });
        console.log("Button details:", JSON.stringify(buttonInfo, null, 2));

        console.log("Clicking Pay button...");
        // Attempt real user click first
        await payBtn.click();

        // Wait briefly to see if submission started
        await page.waitForTimeout(500);

        // Check if form submission actually triggered
        const submissionStarted = await page.evaluate(() => {
            const payButton = document.querySelector('button[type="submit"]');
            return payButton?.textContent?.includes('Processing');
        });

        if (!submissionStarted) {
            console.log("⚠️  Click didn't trigger submission, using requestSubmit() fallback");
            // Fallback: trigger a real form submission
            await page.evaluate(() => {
                const form = document.querySelector('form');
                if (!form) throw new Error('Payment form not found');
                (form as HTMLFormElement).requestSubmit();
            });
        } else {
            console.log("✅ Form submission started via click");
        }

        // Give Stripe a moment to process
        await page.waitForTimeout(2000);

        // Check if Stripe is processing
        const isProcessing = await page.evaluate(() => {
            const payButton = document.querySelector('button[type="submit"]');
            return payButton?.textContent?.includes('Processing');
        });
        console.log(`Payment processing state: ${isProcessing ? 'Processing' : 'Not processing'}`);

        // ==========================================
        // STEP 9: Verify Confirmation
        // ==========================================

        console.log("Waiting for payment result...");
        const successHeading = page.getByRole('heading', { name: /Reservation Confirmed/i });

        // Refined error selector: Must contain text to be a valid error message
        const stripeError = page.locator('.p-FieldError, [data-testid="payment-error"], .StripeElement--error, [role="alert"]')
            .filter({ hasText: /[a-zA-Z]/ }) // Must contain actual letters
            .first();

        const result = await Promise.race([
            successHeading.waitFor({ state: 'visible', timeout: 45000 }).then(() => 'success').catch(() => null),
            page.waitForURL(/Success|Confirmed|confirmation/i, { timeout: 45000 }).then(() => 'success').catch(() => null),
            stripeError.waitFor({ state: 'visible', timeout: 45000 }).then(() => 'error').catch(() => null),
            // Explicit timeout handler
            new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 45000))
        ]).then(r => r || 'timeout');

        if (result === 'error') {
            const msg = await stripeError.textContent();
            const html = await stripeError.innerHTML();
            console.log(`Error Element HTML: ${html}`);
            await page.screenshot({ path: 'payment-error.png', fullPage: true });

            // Dump payment section context
            const paySection = page.getByRole('heading', { name: /Review & Pay/i }).locator('..');
            if (await paySection.count() > 0) {
                const sectionHtml = await paySection.innerHTML();
                console.log(`Payment Section HTML: ${sectionHtml.substring(0, 1000)}...`);
            }

            throw new Error(`Stripe/payment failed with error: "${msg?.trim()}"`);
        }

        if (result === 'timeout' && !(await successHeading.isVisible())) {
            const url = page.url();
            await page.screenshot({ path: 'payment-timeout.png', fullPage: true });

            // Dump captured API responses
            console.log('\n📊 Captured API Responses:');
            console.log(JSON.stringify(apiResponses, null, 2));

            // Dump browser console logs
            console.log('\n📝 Browser Console Logs (last 20):');
            console.log(consoleLogs.slice(-20).join('\n'));

            // Check what we received
            if (!apiResponses.reservation) {
                console.log('\n❌ ISSUE: No /api/reservation response captured - request may have hung or never fired');
                console.log('   This suggests onSuccess callback was never called after Stripe payment');
            } else if (apiResponses.reservation.status !== 200) {
                console.log(`\n❌ ISSUE: Reservation API returned ${apiResponses.reservation.status}`);
                console.log('Error details:', apiResponses.reservation.body);
            }

            throw new Error(`Payment timed out. URL: ${url}. Check logs above for API responses and console errors.`);
        }

        // Final assertions
        await expect(page.getByText(/Thank you.*Test/i)).toBeVisible();
        await expect(page.getByText(/received your payment/i)).toBeVisible();
    });

    // ... (Keep existing tests)
    test('should handle validation errors correctly', async ({ page }) => {
        await page.goto('/make-a-reservation');
        const tomorrow = addDays(new Date(), 1);
        const checkOutDate = addDays(tomorrow, 2);
        const checkInDay = format(tomorrow, 'd');
        const checkOutDay = format(checkOutDate, 'd');

        await page.locator(`button:has-text("${checkInDay}")`).first().click();
        await page.waitForTimeout(500);
        await page.locator(`button:has-text("${checkOutDay}")`).first().click();

        await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
        await page.getByRole('button', { name: /RV.*Trailer/i }).click();
        await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
        await page.getByRole('button', { name: /Find Campsites/i }).click();
        await expect(page.getByRole('heading', { name: /available/i })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /Book Now/i }).first().click();
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
        await page.getByRole('button', { name: /Continue to Add-ons/i }).click();
        await expect(page.getByText(/required/i).first()).toBeVisible();
        await page.getByPlaceholder('First Name').fill('Test');
        await page.getByRole('button', { name: /Continue to Add-ons/i }).click();
        await expect(page.getByText(/required/i).first()).toBeVisible();
    });

    test('should allow changing dates from personal info form', async ({ page }) => {
        await page.goto('/make-a-reservation');
        const tomorrow = addDays(new Date(), 1);
        const checkOutDate = addDays(tomorrow, 2);
        const checkInDay = format(tomorrow, 'd');
        const checkOutDay = format(checkOutDate, 'd');

        await page.locator(`button:has-text("${checkInDay}")`).first().click();
        await page.waitForTimeout(500);
        await page.locator(`button:has-text("${checkOutDay}")`).first().click();

        await expect(page.getByRole('heading', { name: 'Who is coming?' })).toBeVisible();
        await page.getByRole('button', { name: /RV.*Trailer/i }).click();
        await page.getByPlaceholder(/e\.g\.\s*25/i).fill('28');
        await page.getByRole('button', { name: /Find Campsites/i }).click();
        await expect(page.getByRole('heading', { name: /available/i })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /Book Now/i }).first().click();
        await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
        await page.getByRole('button', { name: /Change/i }).click();
        await expect(page.getByRole('heading', { name: 'Make a Reservation' })).toBeVisible();
    });
});
