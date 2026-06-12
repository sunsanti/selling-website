/**
 * Responsive + auth-state visual smoke test for F01 + F02.
 *
 * Usage:
 *   node scripts/test-responsive.js [feature-id]   # default F02
 *
 * Prereq:
 *   - Server running at http://localhost:5500 (node app.js)
 *   - Default admin credentials in DB (admin / admin123)
 *
 * Output:
 *   - Screenshots: docs/superpowers/plans/.state/<slug>/screenshots/
 *       <F>-{desktop,tablet,mobile}-{logged-out,logged-in}.png
 *       <F>-{tablet,mobile}-drawer-open-{logged-out,logged-in}.png
 *   - JSON report: <F>-report.json
 * Exit 0 if all checks pass, 1 otherwise.
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

const REQUIRED_SELECTORS = [
    '.header-zone-left',
    '.header-zone-right',
    '.navbar',
    'a.nav-item.nav-active',
    '.btn-book-consultation',
    '.btn-header-phone',
    '.logo-text',
    '.menu-btn'
];

async function loginIfNeeded(page) {
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
    const userInput = page.locator('input[name="username"]').first();
    const passInput = page.locator('input[name="password"]').first();
    if (await userInput.count() === 0) throw new Error('Login form not found');
    await userInput.fill('admin');
    await passInput.fill('admin123');
    await Promise.all([
        page.waitForURL(/\/main/, { timeout: 5000 }).catch(() => {}),
        page.locator('form button[type="submit"], form input[type="submit"]').first().click()
    ]);
    await page.waitForTimeout(1000);
    // Verify login succeeded via /check-auth
    const auth = await page.evaluate(async () => {
        try {
            const r = await fetch('/check-auth');
            return await r.json();
        } catch (e) { return { loggedIn: false }; }
    });
    if (!auth.loggedIn) throw new Error('Login failed — /check-auth says not logged in');
    return auth;
}

async function dismissFillPopup(page) {
    await page.waitForTimeout(1700); // 1.5s auto-popup delay + buffer
    const popupVisible = await page.locator('#fill-popup').isVisible().catch(() => false);
    if (popupVisible) {
        await page.locator('#fill-popup .close-btn').click().catch(() => {});
        await page.waitForTimeout(300);
    }
}

async function runViewportAuth(browser, vp, authState, report) {
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
    page.on('response', resp => {
        const status = resp.status();
        if (status >= 400) vpErrors.push(`[HTTP ${status}] ${resp.url()}`);
    });

    try {
        if (authState === 'logged-in') {
            await loginIfNeeded(page);
        }
        await page.goto(BASE + '/main/', { waitUntil: 'networkidle', timeout: 15000 });
        await dismissFillPopup(page);
    } catch (e) {
        vpErrors.push(`[NAV FAIL] ${e.message}`);
    }

    // Required selectors
    const missing = [];
    for (const sel of REQUIRED_SELECTORS) {
        if ((await page.locator(sel).count()) === 0) missing.push(sel);
    }

    const hamburgerVisible = await page.locator('.menu-btn').isVisible().catch(() => false);
    const ctaLogOut = await page.locator('.logged-out-cta').isVisible().catch(() => false);
    const ctaLogIn = await page.locator('.logged-in-cta').isVisible().catch(() => false);
    const expectHamburger = vp.width <= 1024;
    const expectCtaLogOut = vp.width > 1024 && authState === 'logged-out';
    const expectCtaLogIn = vp.width > 1024 && authState === 'logged-in';

    const layoutMismatch = [];
    if (expectHamburger !== hamburgerVisible) layoutMismatch.push(`hamburger expected ${expectHamburger}, got ${hamburgerVisible}`);
    if (expectCtaLogOut !== ctaLogOut) layoutMismatch.push(`logged-out CTA expected ${expectCtaLogOut}, got ${ctaLogOut}`);
    if (expectCtaLogIn !== ctaLogIn) layoutMismatch.push(`logged-in CTA expected ${expectCtaLogIn}, got ${ctaLogIn}`);

    const closedShot = path.join(OUT_DIR, `${FEATURE}-${vp.name}-${authState}.png`);
    await page.screenshot({ path: closedShot, fullPage: false });

    let drawerToggled = null;
    let drawerBox = null;
    let mobileAccountVisible = null;
    if (vp.width <= 1024) {
        try {
            await page.locator('.menu-btn').click();
            await page.waitForTimeout(600);
            const drawerOpen = await page.locator('.navbar.open').count();
            drawerToggled = drawerOpen > 0;
            drawerBox = await page.evaluate(() => {
                const n = document.querySelector('.navbar.open') || document.querySelector('.navbar');
                if (!n) return null;
                const r = n.getBoundingClientRect();
                return {
                    x: +r.x.toFixed(1), width: +r.width.toFixed(1), right: +r.right.toFixed(1),
                    viewport_w: window.innerWidth, gap_right: +(window.innerWidth - r.right).toFixed(1)
                };
            });
            mobileAccountVisible = await page.locator('#mobile-account').isVisible().catch(() => false);
            const drawerShot = path.join(OUT_DIR, `${FEATURE}-${vp.name}-drawer-open-${authState}.png`);
            await page.screenshot({ path: drawerShot, fullPage: false });
        } catch (e) {
            drawerToggled = `error: ${e.message}`;
        }

        // Verify mobile-account visibility matches auth state
        const expectAccountVisible = (authState === 'logged-in');
        if (mobileAccountVisible !== expectAccountVisible) {
            layoutMismatch.push(`#mobile-account expected ${expectAccountVisible ? 'visible' : 'hidden'}, got ${mobileAccountVisible ? 'visible' : 'hidden'}`);
        }
    }

    const failed = missing.length > 0 || layoutMismatch.length > 0 || vpErrors.length > 0;
    const key = `${vp.name}_${authState}`;
    report.viewports[key] = {
        viewport: `${vp.width}x${vp.height}`,
        auth_state: authState,
        missing_selectors: missing,
        hamburger_visible: hamburgerVisible,
        cta_logged_out_visible: ctaLogOut,
        cta_logged_in_visible: ctaLogIn,
        mobile_account_visible: mobileAccountVisible,
        layout_mismatch: layoutMismatch,
        drawer_toggled: drawerToggled,
        drawer_box: drawerBox,
        console_errors: vpErrors,
        screenshot: closedShot
    };

    console.log(`\n[${vp.name} ${vp.width}x${vp.height} · ${authState}] ${failed ? '❌ FAIL' : '✅ PASS'}`);
    if (missing.length) console.log('  missing:', missing.join(', '));
    if (layoutMismatch.length) console.log('  layout:', layoutMismatch.join('; '));
    if (drawerBox) console.log(`  drawer: x=${drawerBox.x} w=${drawerBox.width} right=${drawerBox.right} viewport=${drawerBox.viewport_w} gap=${drawerBox.gap_right}px`);
    if (drawerToggled !== null) console.log('  drawer toggle:', drawerToggled);
    if (mobileAccountVisible !== null) console.log('  #mobile-account visible:', mobileAccountVisible);
    if (vpErrors.length) console.log('  errors:\n    ' + vpErrors.slice(0, 5).join('\n    '));

    await context.close();
    return failed ? 1 : 0;
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const report = { feature: FEATURE, viewports: {} };
    let failures = 0;

    for (const authState of ['logged-out', 'logged-in']) {
        for (const vp of VIEWPORTS) {
            failures += await runViewportAuth(browser, vp, authState, report);
        }
    }

    fs.writeFileSync(
        path.join(OUT_DIR, `${FEATURE}-report.json`),
        JSON.stringify(report, null, 2),
        'utf8'
    );
    await browser.close();

    const total = VIEWPORTS.length * 2;
    console.log('\n=================================');
    console.log(failures === 0 ? `✅ ALL ${total} CHECKS PASSED` : `❌ ${failures}/${total} CHECKS FAILED`);
    console.log('Report:', path.join(OUT_DIR, `${FEATURE}-report.json`));
    console.log('=================================');

    process.exit(failures > 0 ? 1 : 0);
})().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
