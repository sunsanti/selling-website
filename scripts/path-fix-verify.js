// F10.fix verify: visit every page that renders media; assert no /images/ URLs
// hit the network and no 404s on /uploads/ paths.
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

async function check(browser, name, url) {
    const all = [];
    const fails = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('request', r => { all.push(r.url()); });
    page.on('response', r => { if (r.status() === 404) fails.push(r.url()); });
    await page.addInitScript(() => { try { sessionStorage.setItem('fillPopupShown', '1'); } catch(_) {} });
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const imagesRequests = all.filter(u => /\/images\//.test(u));
    const broken404 = fails.filter(u => /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(u));
    await ctx.close();

    console.log(`\n=== ${name} (${url}) ===`);
    console.log(`  total requests: ${all.length}`);
    console.log(`  /images/ requests: ${imagesRequests.length}  ${imagesRequests.length ? '❌ ' + imagesRequests.join(', ') : '✓'}`);
    console.log(`  broken 404 media: ${broken404.length}  ${broken404.length ? '❌ ' + broken404.join(', ') : '✓'}`);

    return imagesRequests.length === 0 && broken404.length === 0;
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const r = [];
    r.push(['main',          await check(browser, 'main',          '/main')]);
    r.push(['/projects',     await check(browser, 'projects list', '/projects')]);
    r.push(['/projects/8',   await check(browser, 'project detail',  '/projects/8')]);
    r.push(['/videos',       await check(browser, 'videos list',   '/videos')]);
    r.push(['/news',         await check(browser, 'news list',     '/news')]);
    r.push(['/news/1',       await check(browser, 'news detail',   '/news/1')]);
    await browser.close();
    console.log('\n=== SUMMARY ===');
    let ok = true;
    for (const [n, p] of r) { console.log(`  ${n}: ${p ? 'PASS' : 'FAIL'}`); if (!p) ok = false; }
    process.exit(ok ? 0 : 1);
})();
