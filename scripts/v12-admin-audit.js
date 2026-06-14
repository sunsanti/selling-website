// v12 admin audit: verify Footer-tab fields + About-tab fields + live preview points to /about
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

async function login(page) {
    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type="submit"]')]);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
}

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));

    await login(page);

    // === 1. Dashboard section markup no longer contains footer fields ===
    await page.click('[data-section="dashboard"]'); await page.waitForTimeout(400);
    const dashFooterPresent = await page.$$eval('#dashboard #setting-footer-desc', els => els.length > 0);
    console.log('Dashboard tab markup contains footer-desc:', dashFooterPresent ? '✗ (still there)' : '✓ (removed)');

    // === 2. Footer tab HAS footer fields ===
    await page.click('[data-section="home-footer"]'); await page.waitForTimeout(800);
    const footerTabHas = await page.evaluate(() => {
        const ids = ['setting-footer-desc','setting-footer-address','setting-footer-copyright',
                    'setting-footer-facebook','setting-footer-linkedin','setting-footer-youtube',
                    'setting-footer-tiktok'];
        return ids.map(id => ({ id, exists: !!document.getElementById(id),
                                val: (document.getElementById(id) || {}).value || '' }));
    });
    console.log('\n--- Footer tab fields ---');
    footerTabHas.forEach(f => console.log(`  ${f.exists ? '✓' : '✗'} #${f.id}  "${(f.val||'').slice(0,30)}…"`));

    // === 3. About tab — new /about content fields + iframe points to /about ===
    await page.click('[data-section="home-about"]'); await page.waitForTimeout(900);
    const aboutFields = await page.evaluate(() => {
        const ids = ['setting-about-hero-tag','setting-about-hero-title','setting-about-mission',
                    'setting-about-sydney-address','setting-about-sydney-phone','setting-about-sydney-email',
                    'setting-about-hcm-address','setting-about-hcm-phone','setting-about-hcm-email'];
        return ids.map(id => ({ id, exists: !!document.getElementById(id),
                                val: (document.getElementById(id) || {}).value || '' }));
    });
    console.log('\n--- About tab /about fields ---');
    aboutFields.forEach(f => console.log(`  ${f.exists ? '✓' : '✗'} #${f.id}  "${(f.val||'').slice(0,30)}…"`));

    // iframe URL
    const aboutIframe = await page.$eval('#preview-iframe-about', el => el.src);
    const pointsToAbout = aboutIframe.includes('/about?preview=1');
    console.log(`\nAbout preview iframe URL: ${aboutIframe.slice(0, 80)}…`);
    console.log(`  points to /about: ${pointsToAbout ? '✓' : '✗'}`);

    // === 4. Live preview reactivity on /about page ===
    await page.waitForTimeout(1500);   // give iframe + ready handshake
    const TEST_TITLE = 'AUDIT TITLE ' + Date.now();
    const TEST_MISSION = 'AUDIT MISSION ' + Date.now();
    await page.fill('#setting-about-hero-title', TEST_TITLE);
    await page.fill('#setting-about-mission', TEST_MISSION);
    await page.waitForTimeout(700);  // debounce + render
    const iframe = await page.$('#preview-iframe-about');
    const reflected = await iframe?.contentFrame().then(f => ({
        title: f?.$eval('#about-hero-title', el => el.textContent.trim()).catch(() => null),
        mission: f?.$eval('#about-mission-text', el => el.textContent.trim()).catch(() => null)
    }));
    const titleResolved = reflected ? await reflected.title : null;
    const missionResolved = reflected ? await reflected.mission : null;
    console.log('\n--- Live preview /about ---');
    console.log(`  hero-title reflected: "${titleResolved}"  ${titleResolved === TEST_TITLE ? '✓' : '✗'}`);
    console.log(`  mission reflected:    "${missionResolved}"  ${missionResolved === TEST_MISSION ? '✓' : '✗'}`);

    // Save round-trip
    await page.click('#about-content-form button[type="submit"]');
    await page.waitForTimeout(800);
    const persisted = await page.evaluate(async () => {
        const r = await fetch('/api/public/settings');
        const d = await r.json();
        return { title: d.data.about_hero_title, mission: d.data.about_mission };
    });
    console.log(`\n--- Save round-trip ---`);
    console.log(`  hero-title persisted: ${persisted.title === TEST_TITLE ? '✓' : '✗'}`);
    console.log(`  mission persisted:    ${persisted.mission === TEST_MISSION ? '✓' : '✗'}`);

    // Restore defaults
    await page.fill('#setting-about-hero-title', 'ABOUT US');
    await page.fill('#setting-about-mission', 'Our core mission is to become a trusted agency for buyers, sellers and investors looking to achieve property ownership in Australia — connecting people, knowledge and opportunity across Sydney, Melbourne, Brisbane and the Gold Coast.');
    await page.click('#about-content-form button[type="submit"]');
    await page.waitForTimeout(500);

    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 5).forEach(e => console.log('  ' + e));

    console.log('\n=== SUMMARY ===');
    const allFooter = footerTabHas.every(f => f.exists);
    const allAbout = aboutFields.every(f => f.exists);
    console.log(`  Dashboard tab no footer markup:  ${!dashFooterPresent ? '✓' : '✗'}`);
    console.log(`  Footer tab has 7 fields:         ${allFooter ? '✓' : '✗'}`);
    console.log(`  About tab has 9 /about fields:   ${allAbout ? '✓' : '✗'}`);
    console.log(`  About iframe → /about page:      ${pointsToAbout ? '✓' : '✗'}`);
    console.log(`  Live preview hero-title:         ${titleResolved === TEST_TITLE ? '✓' : '✗'}`);
    console.log(`  Live preview mission:            ${missionResolved === TEST_MISSION ? '✓' : '✗'}`);
    console.log(`  Save persists hero+mission:      ${persisted.title === TEST_TITLE && persisted.mission === TEST_MISSION ? '✓' : '✗'}`);
    console.log(`  Console clean:                   ${real.length === 0 ? '✓' : '✗'}`);

    await b.close();
})();
