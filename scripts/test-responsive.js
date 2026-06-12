/**
 * Responsive visual smoke test for current feature (default F02).
 *
 * Usage:
 *   node scripts/test-responsive.js [feature-id]
 *
 * Prereq:
 *   - Server running at http://localhost:5500 (node app.js in another terminal)
 *   - playwright installed (npm install -D playwright && npx playwright install chromium)
 *
 * Output:
 *   - Screenshots: docs/superpowers/plans/.state/<slug>/screenshots/<feature>-{desktop,tablet,mobile}.png
 *   - Console log: same dir, console.log
 *   - Exit 0 if all checks pass, 1 if any selector missing or console error
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FEATURE = process.argv[2] || 'F02';
const SLUG = '2026-05-31-sealand-premium-redesign';
const BASE = 'http://localhost:5500';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'superpowers', 'plans', '.state', SLUG, 'screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet',  width: 1024, height: 768 },
    { name: 'mobile',  width: 375,  height: 667 }
];

// Selectors that MUST exist (asserted after F02)
const REQUIRED_SELECTORS = [
    '.header-zone-left',
    '.header-zone-right',
    '.navbar',
    'a.nav-item.nav-active',                // HOME active gold
    '.btn-book-consultation',
    '.btn-header-phone',
    '.logo-text',
    '.menu-btn'                              // hamburger (hidden on desktop, shown on tablet/mobile)
];

// Drawer-mode checks for tablet/mobile
const DRAWER_HIDDEN_INIT = '.navbar:not(.open)';

const consoleErrors = [];
const networkErrors = [];

async function run() {
    const browser = await chromium.launch({ headless: true });
    let totalErrors = 0;
    const report = { feature: FEATURE, viewports: {} };

    for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            userAgent: vp.name === 'mobile'
                ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
                : undefined
        });
        const page = await context.newPage();

        const vpErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') vpErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
            if (msg.type() === 'warning') vpErrors.push(`[CONSOLE WARN] ${msg.text()}`);
        });
        page.on('pageerror', err => vpErrors.push(`[PAGE ERROR] ${err.message}`));
        page.on('requestfailed', req => vpErrors.push(`[REQ FAIL] ${req.url()} — ${req.failure().errorText}`));
        // Track every HTTP non-2xx response to find the 404 source
        page.on('response', resp => {
            const status = resp.status();
            if (status >= 400) {
                vpErrors.push(`[HTTP ${status}] ${resp.url()}`);
            }
        });

        try {
            await page.goto(BASE + '/main/', { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(2000); // wait for fetch + render + auto-popup (1.5s)
            // Dismiss auto-opened fill-popup (overlays everything if not closed)
            const popupVisible = await page.locator('#fill-popup').isVisible().catch(() => false);
            if (popupVisible) {
                await page.locator('#fill-popup .close-btn').click().catch(() => {});
                await page.waitForTimeout(300);
            }
        } catch (e) {
            vpErrors.push(`[NAV FAIL] ${e.message}`);
        }

        // Required selectors check
        const missing = [];
        for (const sel of REQUIRED_SELECTORS) {
            const found = await page.locator(sel).count();
            if (found === 0) missing.push(sel);
        }

        // Hamburger visibility check
        const hamburgerVisible = await page.locator('.menu-btn').isVisible().catch(() => false);
        const ctaRightVisible = await page.locator('.header-zone-right').isVisible().catch(() => false);

        const expectHamburger = vp.width <= 1024;
        const expectCtaRight = vp.width > 1024;

        const layoutMismatch = [];
        if (expectHamburger !== hamburgerVisible) {
            layoutMismatch.push(`hamburger expected ${expectHamburger ? 'visible' : 'hidden'}, got ${hamburgerVisible ? 'visible' : 'hidden'}`);
        }
        if (expectCtaRight !== ctaRightVisible) {
            layoutMismatch.push(`CTA right zone expected ${expectCtaRight ? 'visible' : 'hidden'}, got ${ctaRightVisible ? 'visible' : 'hidden'}`);
        }

        // Take screenshot of closed-drawer state first
        const shot = path.join(OUT_DIR, `${FEATURE}-${vp.name}.png`);
        await page.screenshot({ path: shot, fullPage: false });

        // Test drawer open on mobile/tablet + screenshot of opened state
        let drawerToggled = null;
        let drawerBox = null;
        if (vp.width <= 1024) {
            try {
                await page.locator('.menu-btn').click();
                await page.waitForTimeout(600); // wait for slide animation
                const drawerOpen = await page.locator('.navbar.open').count();
                drawerToggled = drawerOpen > 0;
                // Measure actual drawer rendered position
                drawerBox = await page.evaluate(() => {
                    const n = document.querySelector('.navbar.open') || document.querySelector('.navbar');
                    if (!n) return null;
                    const r = n.getBoundingClientRect();
                    const cs = window.getComputedStyle(n);
                    const docCS = window.getComputedStyle(document.documentElement);
                    const bodyCS = window.getComputedStyle(document.body);
                    return {
                        x: r.x, y: r.y, width: r.width, height: r.height,
                        right: r.right, viewport_w: window.innerWidth,
                        client_w: document.documentElement.clientWidth,
                        gap_right_px: window.innerWidth - r.right,
                        scrollbar_gap_px: window.innerWidth - document.documentElement.clientWidth,
                        css_width: cs.width, css_transform: cs.transform,
                        html_overflow: docCS.overflow,
                        body_overflow: bodyCS.overflow,
                        html_scrollbar_width: docCS.scrollbarWidth
                    };
                });
                const drawerShot = path.join(OUT_DIR, `${FEATURE}-${vp.name}-drawer-open.png`);
                await page.screenshot({ path: drawerShot, fullPage: false });
            } catch (e) {
                drawerToggled = `error: ${e.message}`;
            }
        }
        if (drawerBox) report.viewports = report.viewports || {};

        report.viewports[vp.name] = {
            url: BASE + '/main/',
            viewport: `${vp.width}x${vp.height}`,
            missing_selectors: missing,
            hamburger_visible: hamburgerVisible,
            cta_right_visible: ctaRightVisible,
            layout_mismatch: layoutMismatch,
            drawer_toggled: drawerToggled,
            drawer_box: drawerBox,
            console_errors: vpErrors,
            screenshot: shot
        };
        if (drawerBox) {
            console.log('  drawer measured:', `x=${drawerBox.x.toFixed(1)} w=${drawerBox.width.toFixed(1)} right=${drawerBox.right.toFixed(1)} viewport_w=${drawerBox.viewport_w} gap_right=${drawerBox.gap_right_px.toFixed(1)}px`);
        }

        const failed = missing.length > 0 || layoutMismatch.length > 0 || vpErrors.length > 0;
        totalErrors += failed ? 1 : 0;

        console.log(`\n[${vp.name} ${vp.width}x${vp.height}] ${failed ? '❌ FAIL' : '✅ PASS'}`);
        if (missing.length) console.log('  missing selectors:', missing.join(', '));
        if (layoutMismatch.length) console.log('  layout:', layoutMismatch.join('; '));
        if (drawerToggled !== null) console.log('  drawer toggle:', drawerToggled);
        if (vpErrors.length) console.log('  console errors:\n   ', vpErrors.slice(0, 5).join('\n    '));
        console.log('  screenshot:', shot);

        await context.close();
    }

    fs.writeFileSync(
        path.join(OUT_DIR, `${FEATURE}-report.json`),
        JSON.stringify(report, null, 2),
        'utf8'
    );

    await browser.close();

    console.log('\n=================================');
    console.log(totalErrors === 0 ? '✅ ALL VIEWPORTS PASSED' : `❌ ${totalErrors}/${VIEWPORTS.length} VIEWPORTS HAVE ISSUES`);
    console.log('Report:', path.join(OUT_DIR, `${FEATURE}-report.json`));
    console.log('=================================');

    process.exit(totalErrors > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
