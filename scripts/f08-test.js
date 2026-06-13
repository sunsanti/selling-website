// F08 Playwright test — Video section on /main + /videos list page
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';
const OUT  = 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots';

async function probeMain(browser, name, w, h, expectedCols) {
    const errors = [];
    const failed = new Set();
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('response', r => { if (r.status() === 404) failed.add(r.url()); });
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { sessionStorage.setItem('fillPopupShown', '1'); } catch(_) {} });

    await page.goto(`${BASE}/main`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.evaluate(() => { const fp = document.getElementById('fill-popup'); if (fp) fp.style.display = 'none'; });
    await page.evaluate(() => document.getElementById('video')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);

    const cards = await page.$$eval('.video-item', els => els.length);
    const titles = await page.$$eval('.video-title', els => els.map(e => e.textContent.trim()));
    const links = await page.$$eval('.video-item', els => els.map(e => ({ href: e.getAttribute('href'), rel: e.getAttribute('rel'), target: e.getAttribute('target') })));
    const trackCols = await page.$eval('.video-track', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    const allTiktok = links.every(l => /tiktok\.com/i.test(l.href || ''));
    const allNoopener = links.every(l => l.target === '_blank' && /noopener/i.test(l.rel || ''));

    await page.screenshot({ path: `${OUT}/F08-main-${name}.png`, fullPage: false });

    const real = errors.filter(t => !/Failed to load resource/i.test(t));

    console.log(`\n=== main ${name} ${w}x${h} ===`);
    console.log(`  cards: ${cards} (expect 3)  cols: ${trackCols} (expect ${expectedCols})`);
    console.log(`  titles: ${JSON.stringify(titles)}`);
    console.log(`  all tiktok URL: ${allTiktok}, all _blank+noopener: ${allNoopener}`);
    if (real.length) console.log(`  ❌ errors:`, real); else console.log(`  ✓ console clean`);
    await ctx.close();
    return cards === 3 && trackCols === expectedCols && allTiktok && allNoopener && real.length === 0;
}

async function probeVideosPage(browser, name, w, h) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(`${BASE}/videos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const cards = await page.$$eval('.video-item', els => els.length);
    const heading = await page.$eval('.videos-page-title', el => el.textContent.trim()).catch(() => '');
    await page.screenshot({ path: `${OUT}/F08-videos-${name}.png`, fullPage: false });
    const real = errors.filter(t => !/Failed to load resource/i.test(t));

    console.log(`\n=== /videos ${name} ${w}x${h} ===  heading: "${heading}"  cards: ${cards}`);
    if (real.length) console.log(`  ❌ errors:`, real); else console.log(`  ✓ console clean`);
    await ctx.close();
    return cards === 3 && heading.includes('All Videos') && real.length === 0;
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const r = [];
    r.push(['main desktop', await probeMain(browser, 'desktop', 1440, 900, 6)]);
    r.push(['main tablet',  await probeMain(browser, 'tablet',  900,  1180, 3)]);
    r.push(['main mobile',  await probeMain(browser, 'mobile',  375,  812, 2)]);
    r.push(['/videos desktop', await probeVideosPage(browser, 'desktop', 1440, 900)]);
    r.push(['/videos mobile',  await probeVideosPage(browser, 'mobile',  375, 812)]);
    await browser.close();
    console.log('\n=== SUMMARY ===');
    let ok = true;
    for (const [n, p] of r) { console.log(`  ${n}: ${p ? 'PASS' : 'FAIL'}`); if (!p) ok = false; }
    process.exit(ok ? 0 : 1);
})();
