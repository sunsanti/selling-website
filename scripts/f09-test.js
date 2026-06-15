// F09 Playwright test — News section main + /news list + /news/:id detail + 404 fallback
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';
const OUT  = 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots';

function makeCtxPage(browser, w, h, errors) {
    return browser.newContext({ viewport: { width: w, height: h } }).then(async ctx => {
        const page = await ctx.newPage();
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('pageerror', e => errors.push('pageerror: ' + e.message));
        await page.addInitScript(() => { try { sessionStorage.setItem('fillPopupShown', '1'); } catch(_) {} });
        return { ctx, page };
    });
}

async function probeMain(browser, name, w, h, expectedCols) {
    const errors = [];
    const { ctx, page } = await makeCtxPage(browser, w, h, errors);
    await page.goto(`${BASE}/main`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const fp = document.getElementById('fill-popup'); if (fp) fp.style.display = 'none'; });
    await page.evaluate(() => document.getElementById('news')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);

    const cards = await page.$$eval('.news-item', els => els.length);
    const titles = await page.$$eval('.news-title', els => els.map(e => e.textContent.trim()));
    const cols = await page.$eval('.news-track', el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    const cardIds = await page.$$eval('.news-item', els => els.map(e => e.dataset.id));
    // Nav buttons hidden when total <= NEWS_PER_VIEW (we have 3)
    const prevDisplay = await page.$eval('#btn-news-prev', el => getComputedStyle(el).display);
    const nextDisplay = await page.$eval('#btn-news-next', el => getComputedStyle(el).display);
    const navHidden = prevDisplay === 'none' && nextDisplay === 'none';

    await page.screenshot({ path: `${OUT}/F09-main-${name}.png`, fullPage: false });

    // Hover first card and verify summary becomes visible (opacity > 0)
    await page.hover('.news-item:first-child');
    await page.waitForTimeout(500);
    const summaryOpacity = await page.$eval('.news-item:first-child .news-summary', el => parseFloat(getComputedStyle(el).opacity));
    await page.screenshot({ path: `${OUT}/F09-main-hover-${name}.png`, fullPage: false });

    const real = errors.filter(t => !/Failed to load resource/i.test(t));
    console.log(`\n=== main ${name} ${w}x${h} ===`);
    console.log(`  cards: ${cards} (expect 3)  cols: ${cols} (expect ${expectedCols})`);
    console.log(`  titles: ${JSON.stringify(titles)}`);
    console.log(`  ids: ${JSON.stringify(cardIds)}`);
    console.log(`  nav hidden (3 items only): ${navHidden}`);
    console.log(`  hover summary opacity: ${summaryOpacity} (>0.5 expected)`);
    if (real.length) console.log('  ❌ errors:', real); else console.log('  ✓ console clean');
    await ctx.close();
    return cards === 3 && cols === expectedCols && navHidden && summaryOpacity > 0.5 && real.length === 0;
}

async function probeList(browser, w, h) {
    const errors = [];
    const { ctx, page } = await makeCtxPage(browser, w, h, errors);
    await page.goto(`${BASE}/news`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const heading = await page.$eval('.news-page-title', el => el.textContent.trim()).catch(() => '');
    const cards = await page.$$eval('.news-item', els => els.length);
    await page.screenshot({ path: `${OUT}/F09-list-${w}x${h}.png`, fullPage: false });
    const real = errors.filter(t => !/Failed to load resource/i.test(t));
    console.log(`\n=== /news (${w}x${h}) heading: "${heading}"  cards: ${cards}`);
    if (real.length) console.log('  ❌ errors:', real); else console.log('  ✓ console clean');
    await ctx.close();
    return cards === 3 && /All News/i.test(heading) && real.length === 0;
}

async function probeDetail(browser, id, expectFound) {
    const errors = [];
    const { ctx, page } = await makeCtxPage(browser, 1440, 900, errors);
    await page.goto(`${BASE}/news/${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const articleVisible = await page.$eval('#news-article', el => getComputedStyle(el).display !== 'none');
    const notFoundVisible = await page.$eval('#news-not-found', el => getComputedStyle(el).display !== 'none');
    const title = await page.$eval('#news-title', el => el.textContent.trim()).catch(() => '');
    const content = await page.$eval('#news-content', el => el.textContent.trim()).catch(() => '');
    await page.screenshot({ path: `${OUT}/F09-detail-${id}.png`, fullPage: false });
    const real = errors.filter(t => !/Failed to load resource/i.test(t));
    console.log(`\n=== /news/${id} (expectFound=${expectFound})`);
    console.log(`  article visible: ${articleVisible}  not-found visible: ${notFoundVisible}`);
    console.log(`  title: "${title.slice(0,60)}"  content len: ${content.length}`);
    if (real.length) console.log('  ❌ errors:', real); else console.log('  ✓ console clean');
    await ctx.close();
    if (expectFound) return articleVisible && !notFoundVisible && title.length > 0 && content.length > 0 && real.length === 0;
    return !articleVisible && notFoundVisible && real.length === 0;
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const r = [];
    r.push(['main desktop', await probeMain(browser, 'desktop', 1440, 900, 3)]);
    r.push(['main tablet',  await probeMain(browser, 'tablet',  900,  1180, 2)]);
    r.push(['main mobile',  await probeMain(browser, 'mobile',  375,  812, 1)]);
    r.push(['/news desktop', await probeList(browser, 1440, 900)]);
    r.push(['/news mobile',  await probeList(browser, 375,  812)]);
    r.push(['/news/1 detail', await probeDetail(browser, 1, true)]);
    r.push(['/news/9999 404', await probeDetail(browser, 9999, false)]);
    await browser.close();
    console.log('\n=== SUMMARY ===');
    let ok = true;
    for (const [n, p] of r) { console.log(`  ${n}: ${p ? 'PASS' : 'FAIL'}`); if (!p) ok = false; }
    process.exit(ok ? 0 : 1);
})();
