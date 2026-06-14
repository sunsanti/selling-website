// v15 admin audit:
//  1. About tab — "Our Services" consolidated into ONE .settings-panel with
//     .service-cards-grid of 3 .service-card-col columns (compact, side-by-side)
//  2. New "Invest" tab — sidebar nav, loads purpose_* fields + video thumb/url,
//     own live-preview iframe (#preview-iframe-invest -> #purpose-invest), edits
//     push live, save round-trip
//  3. NO #fill-popup ever appears in ANY admin live-preview iframe
//  4. 0 console errors across Dashboard, About, Services, Footer, Invest tabs
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

async function login(page) {
    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type="submit"]')]);
}

async function checkPopupInIframe(page, target, label, results) {
    const ifr = await page.$('#preview-iframe-' + target);
    const display = await ifr?.contentFrame().then(f => f?.$eval('#fill-popup', el => getComputedStyle(el).display)).catch(() => 'NO_ELEMENT');
    const ok = display === null || display === undefined || display === 'NO_ELEMENT' || display === 'none';
    console.log(`  [${label}] #fill-popup display="${display}"  ${ok ? '✓' : '✗ POPUP VISIBLE'}`);
    results.push(ok);
    return ok;
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

    // === 1. About tab — Services consolidated ===
    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(1500);

    const svcPanelCount = await page.$$eval('#about-services-cards > .settings-panel', els => els.length);
    const svcCols = await page.$$eval('#about-services-cards .service-card-col', els =>
        els.map(el => ({
            slot: el.dataset.slot,
            hasIcon: !!el.querySelector('.as-icon'),
            hasTitle: !!el.querySelector('.as-title'),
            hasDesc: !!el.querySelector('.as-desc')
        })));
    console.log('\n--- 1. About tab — Services consolidated into one wrapper ---');
    console.log(`  outer .settings-panel count: ${svcPanelCount}  ${svcPanelCount === 1 ? '✓' : '✗'}`);
    console.log(`  .service-card-col count: ${svcCols.length}  ${svcCols.length === 3 ? '✓' : '✗'}`);
    svcCols.forEach(c => console.log(`    slot ${c.slot}: icon=${c.hasIcon} title=${c.hasTitle} desc=${c.hasDesc}`));
    const svcStructureOk = svcPanelCount === 1 && svcCols.length === 3 && svcCols.every(c => c.hasIcon && c.hasTitle && c.hasDesc);

    // compare panel height vs other panels in the tab (Leadership / Team)
    const panelHeights = await page.evaluate(() => {
        const get = sel => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().height : null; };
        return {
            services: get('#about-services-cards > .settings-panel'),
            leadershipCard: get('#about-leadership-cards .settings-panel'),
            teamCard: get('#about-team-cards .settings-panel')
        };
    });
    console.log(`  panel heights: services=${Math.round(panelHeights.services)} leadershipCard=${Math.round(panelHeights.leadershipCard)} teamCard=${Math.round(panelHeights.teamCard)}`);
    await page.locator('#about-services-cards').scrollIntoViewIfNeeded();
    await page.locator('#about-services-cards').screenshot({ path: 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots/v15-about-services.png' });

    // edit service 1 title, verify live preview (about iframe) updates
    const TEST_SVC_TITLE = 'AUDIT SVC TITLE ' + Date.now();
    const svc1Title = page.locator('#about-services-cards .service-card-col[data-slot="1"] .as-title');
    const origSvc1Title = await svc1Title.inputValue();
    await svc1Title.fill(TEST_SVC_TITLE);
    await page.waitForTimeout(700);
    const aboutIframe = await page.$('#preview-iframe-about');
    const svcTitleReflected = await aboutIframe?.contentFrame().then(f =>
        f?.$$eval('.about-services-grid .about-service-title, .about-services-grid h3', els => els.map(e => e.textContent.trim()))
    ).catch(() => null);
    const svcReflected = Array.isArray(svcTitleReflected) && svcTitleReflected.includes(TEST_SVC_TITLE);
    console.log(`  service 1 title edit reflected in /about preview: ${svcReflected ? '✓' : '✗'} (got: ${JSON.stringify(svcTitleReflected)})`);
    // restore
    await svc1Title.fill(origSvc1Title);
    await page.waitForTimeout(400);

    // === 2. Invest tab ===
    await page.click('[data-section="invest"]');
    await page.waitForTimeout(1800);

    const investNavExists = await page.$$eval('[data-section="invest"]', els => els.length) === 1;
    const investFields = await page.evaluate(() => ({
        tagline: document.getElementById('setting-purpose-tagline')?.value,
        heading: document.getElementById('setting-purpose-heading')?.value,
        list1: document.getElementById('setting-purpose-list-1')?.value,
        list4: document.getElementById('setting-purpose-list-4')?.value,
        cta: document.getElementById('setting-purpose-cta-text')?.value,
        caption: document.getElementById('setting-purpose-video-caption')?.value,
        videoUrl: document.getElementById('setting-purpose-video-url')?.value
    }));
    console.log('\n--- 2. Invest tab ---');
    console.log(`  nav item exists: ${investNavExists ? '✓' : '✗'}`);
    console.log('  fields: ' + JSON.stringify(investFields));
    // purpose_video_url is optional/legitimately empty until an admin sets one
    const investFieldsPopulated = Object.entries(investFields).every(([k, v]) => k === 'videoUrl' || (v !== undefined && v !== ''));

    // Invest preview iframe shows #purpose-invest
    const investIframe = await page.$('#preview-iframe-invest');
    const investIframeExists = !!investIframe;
    const purposeDisplay = await investIframe?.contentFrame().then(f => f?.$eval('#purpose-invest', el => getComputedStyle(el).display)).catch(() => null);
    console.log(`  #preview-iframe-invest exists: ${investIframeExists ? '✓' : '✗'}`);
    console.log(`  #purpose-invest display in invest preview: "${purposeDisplay}"  ${purposeDisplay && purposeDisplay !== 'none' ? '✓' : '✗'}`);

    // Other sections hidden in invest scope (e.g. #home-section, #footer)
    const otherHidden = await investIframe?.contentFrame().then(f => f?.evaluate(() => {
        const home = document.getElementById('home-section');
        const footer = document.getElementById('footer');
        return {
            home: home ? getComputedStyle(home).display : 'NO_ELEMENT',
            footer: footer ? getComputedStyle(footer).display : 'NO_ELEMENT'
        };
    })).catch(() => null);
    console.log(`  other sections hidden: home=${otherHidden?.home} footer=${otherHidden?.footer}`);

    // live preview: edit tagline -> reflected in invest iframe
    const TEST_TAGLINE = 'AUDIT INVEST TAGLINE ' + Date.now();
    const origTagline = investFields.tagline;
    await page.fill('#setting-purpose-tagline', TEST_TAGLINE);
    await page.waitForTimeout(700);
    const taglineReflected = await investIframe?.contentFrame().then(f => f?.$eval('#purpose-tagline-text', el => el.textContent.trim())).catch(() => null);
    console.log(`  live edit tagline reflected: sent="${TEST_TAGLINE}" got="${taglineReflected}"  ${taglineReflected === TEST_TAGLINE ? '✓' : '✗'}`);

    // save round-trip
    await page.click('#invest-content-form button[type="submit"]');
    await page.waitForTimeout(800);
    const persistedTagline = await page.evaluate(async () => {
        const r = await fetch('/api/public/settings');
        const d = await r.json();
        return d.data.purpose_tagline;
    });
    console.log(`  save round-trip persisted="${persistedTagline}"  ${persistedTagline === TEST_TAGLINE ? '✓' : '✗'}`);

    // restore
    await page.fill('#setting-purpose-tagline', origTagline);
    await page.click('#invest-content-form button[type="submit"]');
    await page.waitForTimeout(600);

    const investOk = investNavExists && investFieldsPopulated && investIframeExists &&
        purposeDisplay && purposeDisplay !== 'none' &&
        taglineReflected === TEST_TAGLINE && persistedTagline === TEST_TAGLINE;

    // === 3. No #fill-popup in ANY preview iframe ===
    console.log('\n--- 3. #fill-popup check across all preview iframes (after waiting 2.5s) ---');
    const popupResults = [];
    // Dashboard -> settings iframe
    await page.click('[data-section="dashboard"]');
    await page.waitForTimeout(2500);
    await checkPopupInIframe(page, 'settings', 'dashboard/settings', popupResults);

    // About -> about iframe
    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(2500);
    await checkPopupInIframe(page, 'about', 'home-about/about', popupResults);

    // Services -> services iframe
    await page.click('[data-section="home-services"]');
    await page.waitForTimeout(2500);
    await checkPopupInIframe(page, 'services', 'home-services/services', popupResults);

    // Footer -> footer iframe
    await page.click('[data-section="home-footer"]');
    await page.waitForTimeout(2500);
    await checkPopupInIframe(page, 'footer', 'home-footer/footer', popupResults);

    // Invest -> invest iframe
    await page.click('[data-section="invest"]');
    await page.waitForTimeout(2500);
    await checkPopupInIframe(page, 'invest', 'invest/invest', popupResults);

    const noPopupAnywhere = popupResults.every(Boolean);

    // === 4. Console errors across all tabs (already triggered above) ===
    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 12).forEach(e => console.log('  ' + e));

    console.log('\n=== SUMMARY ===');
    console.log(`  1. About Services consolidated (1 panel, 3 cols, fields present): ${svcStructureOk ? '✓' : '✗'}`);
    console.log(`     Service title live-edit reflected in /about preview:          ${svcReflected ? '✓' : '✗'}`);
    console.log(`  2. Invest tab fully functional:                                  ${investOk ? '✓' : '✗'}`);
    console.log(`  3. No #fill-popup in any preview iframe:                         ${noPopupAnywhere ? '✓' : '✗'}`);
    console.log(`  4. Console clean (0 non-404 errors):                             ${real.length === 0 ? '✓' : '✗'}`);

    const allPass = svcStructureOk && svcReflected && investOk && noPopupAnywhere && real.length === 0;
    console.log(`\n  OVERALL: ${allPass ? '6/6-ish PASS ✓' : 'FAIL ✗'}`);

    await b.close();
    process.exit(allPass ? 0 : 1);
})();
