#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
from pathlib import Path

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto('http://localhost:3000/admin/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1000)

    reports_dir = Path('./accessibility-reports')
    reports_dir.mkdir(exist_ok=True)

    screenshot_path = reports_dir / 'admin-login-fixed.png'
    page.screenshot(path=str(screenshot_path), full_page=True)

    print(f"✓ Screenshot saved: {screenshot_path}")
    browser.close()
