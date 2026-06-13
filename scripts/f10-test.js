// F10 Playwright test — Footer 2-tier + 3-col + form submission + admin recolor
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';
const OUT  = 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots';

function rgbToHex(rgb) {
    const m = rgb && rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return rgb;
    return '#' + [1,2,3].map(i => parseInt(m[i], 10).toString(16).padStart(2,'0')).join('');
}

async function probeFooter(browser, name, w, h, expectedCols) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { sessionStorage.setItem('fillPopupShown', '1'); } catch(_) {} });

    await page.goto(`${BASE}/main`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.evaluate(() => { const fp = document.getElementById('fill-popup'); if (fp) fp.style.display = 'none'; });
    await page.evaluate(() => document.getElementById('footer')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(400);

    // Footer should be navy
    const footerBg = rgbToHex(await page.$eval('#footer', el => getComputedStyle(el).backgroundColor));
    const hasForm = await page.$('#customer-contact-form').then(Boolean);
    const hasSubmit = await page.$('.btn-footer-submit').then(Boolean);
    const has3Cols = await page.$eval('.footer-bottom-inner', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    const hasCopyright = await page.$('#footer-copyright').then(Boolean);
    const socialLinks = await page.$$eval('#footer-social-links a', els => els.length);
    const navLinks = await page.$$eval('#footer-nav-list a', els => els.length);
    // Persons rendered into footer-container
    const persons = await page.$$eval('#footer-container .footer-person', els => els.length);
    const goldLogoColor = rgbToHex(await page.$eval('#footer-logo', el => getComputedStyle(el).color));

    await page.screenshot({ path: `${OUT}/F10-footer-${name}.png`, fullPage: false });

    console.log(`\n=== /main footer ${name} ${w}x${h} ===`);
    console.log(`  bg: ${footerBg} (expect #000342)`);
    console.log(`  has form: ${hasForm}  submit btn: ${hasSubmit}  copyright bar: ${hasCopyright}`);
    console.log(`  grid cols: ${has3Cols} (expect ${expectedCols})`);
    console.log(`  social links: ${socialLinks} (expect 4)  nav links: ${navLinks} (expect 6)`);
    console.log(`  team persons rendered: ${persons}`);
    console.log(`  brand logo color: ${goldLogoColor} (expect #ffcf00)`);

    // Test submit with empty name
    await page.click('.btn-footer-submit');
    await page.waitForTimeout(200);
    const errMsg1 = await page.$eval('#footer-form-status', el => el.textContent.trim());
    console.log(`  empty submit error: "${errMsg1}"`);

    // Fill name only → should fail "phone or email required"
    await page.fill('#customer-name', 'Playwright Tester');
    await page.click('.btn-footer-submit');
    await page.waitForTimeout(200);
    const errMsg2 = await page.$eval('#footer-form-status', el => el.textContent.trim());
    console.log(`  name-only submit error: "${errMsg2}"`);

    // Fill all → should succeed
    await page.fill('#customer-phone', '0400000000');
    await page.fill('#customer-email', 'test@example.com');
    await page.click('.btn-footer-submit');
    await page.waitForTimeout(800);
    const successMsg = await page.$eval('#footer-form-status', el => el.textContent.trim());
    const statusClass = await page.$eval('#footer-form-status', el => el.className);
    console.log(`  full submit status: "${successMsg}"  class: ${statusClass}`);

    const real = errors.filter(t => !/Failed to load resource/i.test(t));
    if (real.length) console.log('  ❌ errors:', real); else console.log('  ✓ console clean');
    await ctx.close();

    return footerBg === '#000342'
        && hasForm && hasSubmit && hasCopyright
        && has3Cols === expectedCols
        && socialLinks === 4 && navLinks === 6
        && persons >= 1
        && goldLogoColor === '#ffcf00'
        && /họ tên/i.test(errMsg1)
        && /điện thoại hoặc email/i.test(errMsg2)
        && /success/i.test(statusClass)
        && real.length === 0;
}

async function probeAdmin(browser) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    // Login first
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]')
    ]);
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const sidebarBg = rgbToHex(await page.$eval('.sidebar', el => getComputedStyle(el).backgroundColor));
    const bodyBg = rgbToHex(await page.$eval('body', el => getComputedStyle(el).backgroundColor));
    const headingFont = await page.$eval('.content-section h1, .section-header h1', el => getComputedStyle(el).fontFamily).catch(() => '');

    await page.screenshot({ path: `${OUT}/F10-admin.png`, fullPage: false });

    console.log(`\n=== /admin ===`);
    console.log(`  sidebar bg: ${sidebarBg} (expect #000342)`);
    console.log(`  body bg: ${bodyBg} (expect #fffff5)`);
    console.log(`  heading font: ${headingFont}`);
    const real = errors.filter(t => !/Failed to load resource/i.test(t));
    if (real.length) console.log('  ❌ errors:', real); else console.log('  ✓ console clean');
    await ctx.close();
    return sidebarBg === '#000342' && bodyBg === '#fffff5' && /Playfair/i.test(headingFont) && real.length === 0;
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const r = [];
    r.push(['footer desktop', await probeFooter(browser, 'desktop', 1440, 900, 3)]);
    r.push(['footer tablet',  await probeFooter(browser, 'tablet',  900,  1180, 2)]);
    r.push(['footer mobile',  await probeFooter(browser, 'mobile',  375,  812, 1)]);
    r.push(['admin recolor',  await probeAdmin(browser)]);
    await browser.close();
    console.log('\n=== SUMMARY ===');
    let ok = true;
    for (const [n, p] of r) { console.log(`  ${n}: ${p ? 'PASS' : 'FAIL'}`); if (!p) ok = false; }
    process.exit(ok ? 0 : 1);
})();
