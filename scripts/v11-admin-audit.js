// v11 admin full audit — verify field presence, live preview reactivity,
// save round-trip, and tab switching.
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

const REPORT = {};

async function login(page) {
    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]')
    ]);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
}

async function probeDashboardFields(page) {
    const fields = [
        'setting-phone',
        'setting-footer-desc', 'setting-footer-address', 'setting-footer-copyright',
        'setting-footer-facebook', 'setting-footer-linkedin',
        'setting-footer-youtube', 'setting-footer-tiktok',
        'setting-purpose-video-url'
    ];
    const out = {};
    for (const id of fields) {
        const exists = await page.$('#' + id).then(Boolean);
        const val = exists ? await page.$eval('#' + id, el => el.value) : null;
        out[id] = { exists, currentVal: val };
    }
    REPORT.dashboard_fields = out;
    console.log('--- Dashboard fields ---');
    Object.entries(out).forEach(([k, v]) =>
        console.log(`  ${v.exists ? '✓' : '✗'} #${k}` + (v.exists ? ` = "${(v.currentVal||'').slice(0,40)}…"` : '')));
}

async function testLivePreview(page) {
    // Test footer_desc live update inside iframe
    const TEST_DESC = 'LIVE PREVIEW TEST — v11 ' + Date.now();
    await page.fill('#setting-footer-desc', TEST_DESC);
    await page.waitForTimeout(500); // debounce
    // Read footer-desc inside the preview iframe
    const iframe = await page.$('#preview-iframe-settings');
    const reflected = await iframe?.contentFrame().then(f => f?.$eval('#footer-desc', el => el.textContent.trim())).catch(() => null);
    REPORT.live_preview = {
        sent: TEST_DESC,
        reflected: reflected,
        match: reflected === TEST_DESC
    };
    console.log('--- Live preview footer_desc ---');
    console.log(`  sent:       "${TEST_DESC.slice(0,40)}…"`);
    console.log(`  reflected:  "${(reflected||'').slice(0,40)}…"`);
    console.log(`  ${reflected === TEST_DESC ? '✓ MATCH' : '✗ NO MATCH'}`);

    // Test phone live update too
    const ORIG = await page.$eval('#setting-phone', el => el.value);
    await page.fill('#setting-phone', '+61 999 LIVE');
    await page.waitForTimeout(400);
    const phoneReflected = await iframe?.contentFrame().then(f => f?.$eval('#site-phone', el => el.textContent.trim())).catch(() => null);
    REPORT.live_preview_phone = { reflected: phoneReflected, match: phoneReflected === '+61 999 LIVE' };
    console.log('--- Live preview phone ---');
    console.log(`  reflected: "${phoneReflected}"  ${phoneReflected === '+61 999 LIVE' ? '✓' : '✗'}`);
    // Restore phone
    await page.fill('#setting-phone', ORIG);
    await page.fill('#setting-footer-desc', 'Helping investors and homeowners across Australia build long-term wealth through trusted real-estate guidance.');
}

async function testSaveRoundTrip(page) {
    const VAL = '© ROUND-TRIP TEST ' + Date.now();
    await page.fill('#setting-footer-copyright', VAL);
    await page.click('#settings-form button[type="submit"]');
    await page.waitForTimeout(800);
    // Hit public API
    const v = await page.evaluate(async () => {
        const r = await fetch('/api/public/settings');
        const d = await r.json();
        return d.data.footer_copyright;
    });
    REPORT.save_roundtrip = { sent: VAL, retrieved: v, match: v === VAL };
    console.log('--- Save round-trip ---');
    console.log(`  sent: "${VAL}"`);
    console.log(`  GET:  "${v}"  ${v === VAL ? '✓' : '✗'}`);
    // Restore
    await page.fill('#setting-footer-copyright', '© 2026 Sealand Property. All rights reserved.');
    await page.click('#settings-form button[type="submit"]');
    await page.waitForTimeout(600);
}

async function testTabs(page) {
    const tabs = ['home-about', 'home-services', 'home-footer', 'projects', 'videos', 'news'];
    const results = {};
    for (const t of tabs) {
        await page.click(`[data-section="${t}"]`);
        await page.waitForTimeout(500);
        const visible = await page.$eval(`#${t}`, el => el.classList.contains('active'));
        // For each, probe at least one editable field
        let probe = null;
        if (t === 'home-about')    probe = await page.$$eval('#about-stats-grid input[data-slot]', els => els.length);
        if (t === 'home-services') probe = await page.$$eval('#home-services-cards .settings-panel', els => els.length);
        if (t === 'home-footer')   probe = await page.$$eval('#home-footer-cards .settings-panel', els => els.length);
        if (t === 'projects')      probe = await page.$$eval('.featured-card', els => els.length);
        if (t === 'videos')        probe = await page.$('button[onclick="openVideoModal()"]').then(Boolean);
        if (t === 'news')          probe = await page.$('button[onclick="openNewsModal()"]').then(Boolean);
        results[t] = { visible, probe };
    }
    REPORT.tabs = results;
    console.log('--- Tab switching ---');
    Object.entries(results).forEach(([k, v]) =>
        console.log(`  ${v.visible ? '✓' : '✗'} ${k}  probe=${JSON.stringify(v.probe)}`));
}

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));

    await login(page);
    await probeDashboardFields(page);
    await testLivePreview(page);
    await testSaveRoundTrip(page);
    await testTabs(page);

    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 5).forEach(e => console.log('  ' + e));
    await b.close();

    // Summary
    const sf = REPORT.dashboard_fields;
    const lp = REPORT.live_preview;
    const lp2 = REPORT.live_preview_phone;
    const sr = REPORT.save_roundtrip;
    const allFields = Object.values(sf).every(v => v.exists);
    const allTabs = Object.values(REPORT.tabs).every(v => v.visible && v.probe);
    console.log('\n=== SUMMARY ===');
    console.log(`  all 9 dashboard fields present: ${allFields ? '✓' : '✗'}`);
    console.log(`  live preview footer_desc:       ${lp.match ? '✓' : '✗'}`);
    console.log(`  live preview phone:             ${lp2.match ? '✓' : '✗'}`);
    console.log(`  save round-trip:                ${sr.match ? '✓' : '✗'}`);
    console.log(`  all tabs render content:        ${allTabs ? '✓' : '✗'}`);
    console.log(`  console clean:                  ${real.length === 0 ? '✓' : '✗'}`);
})();
