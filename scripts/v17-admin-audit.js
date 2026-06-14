// v17 admin audit:
//  1. #about-content-form — reduced to 1 .form-section-divider (Hero & Mission)
//     + 1 .form-subsection-label (Offices); Mission textarea is .full-row, rows=6
//  2. #invest-content-form — reduced to 1 .form-section-divider (Why Invest in
//     Australia) + 1 .form-subsection-label (Video); Heading textarea is
//     .full-row, rows=3; thumbnail/caption/url grouped in .form-row-3
//  3. #footer-content-form — still 1 .form-section-divider; Description textarea
//     is .full-row, rows=4; Address + Copyright paired in a .form-row
//  4. .full-row fields actually span the full settings-form width (no dead
//     empty grid columns beside them)
//  5. 0 console errors across Dashboard/About/Services/Invest/Footer tabs
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

async function login(page) {
    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type="submit"]')]);
}

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));

    await login(page);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // === 1. About content form ===
    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(1200);
    const aboutInfo = await page.evaluate(() => {
        const form = document.getElementById('about-content-form');
        const mission = document.getElementById('setting-about-mission');
        const formRect = form.getBoundingClientRect();
        const missionGroup = mission.closest('.form-group');
        const missionRect = missionGroup.getBoundingClientRect();
        return {
            dividerCount: form.querySelectorAll('.form-section-divider').length,
            subsectionCount: form.querySelectorAll('.form-subsection-label').length,
            missionRows: mission.getAttribute('rows'),
            missionFullRow: missionGroup.classList.contains('full-row'),
            missionSpansWidth: (missionRect.width / formRect.width) > 0.9,
            officeCardCount: form.querySelectorAll('#about-offices-cards .office-card-admin').length
        };
    });
    console.log('\n--- 1. About content form ---');
    console.log('  ', JSON.stringify(aboutInfo));
    const aboutOk = aboutInfo.dividerCount === 1 && aboutInfo.subsectionCount === 1 &&
        aboutInfo.missionRows === '6' && aboutInfo.missionFullRow && aboutInfo.missionSpansWidth &&
        aboutInfo.officeCardCount >= 1;
    console.log(`  1 divider, 1 subsection label, mission textarea rows=6 + full-row + spans width: ${aboutOk ? '✓' : '✗'}`);

    // === 2. Invest content form ===
    await page.click('[data-section="invest"]');
    await page.waitForTimeout(1200);
    const investInfo = await page.evaluate(() => {
        const form = document.getElementById('invest-content-form');
        const heading = document.getElementById('setting-purpose-heading');
        const formRect = form.getBoundingClientRect();
        const headingGroup = heading.closest('.form-group');
        const headingRect = headingGroup.getBoundingClientRect();
        const row3 = form.querySelector('.form-row-3');
        const row3Rect = row3 ? row3.getBoundingClientRect() : null;
        return {
            dividerCount: form.querySelectorAll('.form-section-divider').length,
            subsectionCount: form.querySelectorAll('.form-subsection-label').length,
            headingRows: heading.getAttribute('rows'),
            headingFullRow: headingGroup.classList.contains('full-row'),
            headingSpansWidth: (headingRect.width / formRect.width) > 0.9,
            hasRow3: !!row3,
            row3SpansWidth: row3Rect ? (row3Rect.width / formRect.width) > 0.9 : false,
            row3FieldCount: row3 ? row3.querySelectorAll('.form-group').length : 0
        };
    });
    console.log('\n--- 2. Invest content form ---');
    console.log('  ', JSON.stringify(investInfo));
    const investOk = investInfo.dividerCount === 1 && investInfo.subsectionCount === 1 &&
        investInfo.headingRows === '3' && investInfo.headingFullRow && investInfo.headingSpansWidth &&
        investInfo.hasRow3 && investInfo.row3SpansWidth && investInfo.row3FieldCount === 3;
    console.log(`  1 divider, 1 subsection label, heading textarea rows=3 + full-row + spans width, video form-row-3 (3 fields, spans width): ${investOk ? '✓' : '✗'}`);

    // === 3. Footer content form ===
    await page.click('[data-section="home-footer"]');
    await page.waitForTimeout(1200);
    const footerInfo = await page.evaluate(() => {
        const form = document.getElementById('footer-content-form');
        const desc = document.getElementById('setting-footer-desc');
        const addr = document.getElementById('setting-footer-address');
        const copy = document.getElementById('setting-footer-copyright');
        const formRect = form.getBoundingClientRect();
        const descGroup = desc.closest('.form-group');
        const descRect = descGroup.getBoundingClientRect();
        const addrRow = addr.closest('.form-row');
        const copyRow = copy.closest('.form-row');
        return {
            dividerCount: form.querySelectorAll('.form-section-divider').length,
            descRows: desc.getAttribute('rows'),
            descFullRow: descGroup.classList.contains('full-row'),
            descSpansWidth: (descRect.width / formRect.width) > 0.9,
            addrCopyPaired: !!addrRow && addrRow === copyRow
        };
    });
    console.log('\n--- 3. Footer content form ---');
    console.log('  ', JSON.stringify(footerInfo));
    const footerOk = footerInfo.dividerCount === 1 && footerInfo.descRows === '4' &&
        footerInfo.descFullRow && footerInfo.descSpansWidth && footerInfo.addrCopyPaired;
    console.log(`  1 divider, description textarea rows=4 + full-row + spans width, address+copyright paired: ${footerOk ? '✓' : '✗'}`);

    // === 4. Other tabs — smoke check (no console errors) ===
    await page.click('[data-section="dashboard"]');
    await page.waitForTimeout(1000);
    await page.click('[data-section="home-services"]');
    await page.waitForTimeout(1000);

    // === Console errors across all visited tabs ===
    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 12).forEach(e => console.log('  ' + e));

    console.log('\n=== SUMMARY ===');
    console.log(`  1. About form: 1 divider + Offices label + full-row mission textarea:  ${aboutOk ? '✓' : '✗'}`);
    console.log(`  2. Invest form: 1 divider + Video label + full-row heading + 3-col video row: ${investOk ? '✓' : '✗'}`);
    console.log(`  3. Footer form: full-row description + address/copyright paired:        ${footerOk ? '✓' : '✗'}`);
    console.log(`  4. Console clean (0 non-404 errors):                                    ${real.length === 0 ? '✓' : '✗'}`);

    const allPass = aboutOk && investOk && footerOk && real.length === 0;
    console.log(`\n  OVERALL: ${allPass ? '4/4 PASS ✓' : 'FAIL ✗'}`);

    await b.close();
    process.exit(allPass ? 0 : 1);
})();
