// F07 Playwright test — Services 5-card grid
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';
const OUT  = 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots';

async function probe(browser, name, w, h, expectedCols) {
    const errors = [];
    const failed = new Set();
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('response', r => { if (r.status() === 404) failed.add(r.url()); });
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { sessionStorage.setItem('fillPopupShown', '1'); } catch(_) {} });

    await page.goto(`${BASE}/main`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.evaluate(() => { const fp = document.getElementById('fill-popup'); if (fp) fp.style.display = 'none'; });
    await page.evaluate(() => document.getElementById('services')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);

    const cardCount = await page.$$eval('.service-card', els => els.length);
    const titles = await page.$$eval('.service-title', els => els.map(e => e.textContent.trim()));
    const icons = await page.$$eval('.service-icon', els => els.map(e => Array.from(e.classList).find(c => c.startsWith('fa-') && c !== 'fa-solid')));
    const cols = await page.$eval('.services-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    const noPopup = !(await page.$('.btn-get-in-touch'));   // legacy CTA must be gone

    await page.screenshot({ path: `${OUT}/F07-services-${name}.png`, fullPage: false });

    // Filter real errors — ignore expected "Failed to load resource" 404s for assets we know are missing
    const real = errors.filter(t => !/Failed to load resource/i.test(t));

    console.log(`\n=== ${name} ${w}x${h} ===`);
    console.log(`  cards: ${cardCount} (expect 5)`);
    console.log(`  titles: ${JSON.stringify(titles)}`);
    console.log(`  icons: ${JSON.stringify(icons)}`);
    console.log(`  grid cols: ${cols} (expect ${expectedCols})`);
    console.log(`  legacy CTA gone: ${noPopup}`);
    if (real.length) console.log(`  ❌ errors:`, real);
    else console.log(`  ✓ console clean`);

    await ctx.close();

    return cardCount === 5 && cols === expectedCols && noPopup && real.length === 0;
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const r = [];
    r.push(['desktop', await probe(browser, 'desktop', 1440, 900, 5)]);
    r.push(['tablet',  await probe(browser, 'tablet',  900,  1180, 3)]);
    r.push(['mobile',  await probe(browser, 'mobile',  375,  812, 1)]);
    await browser.close();
    console.log('\n=== SUMMARY ===');
    let ok = true;
    for (const [n, p] of r) { console.log(`  ${n}: ${p ? 'PASS' : 'FAIL'}`); if (!p) ok = false; }
    process.exit(ok ? 0 : 1);
})();
