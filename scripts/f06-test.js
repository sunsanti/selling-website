// F06 Playwright smoke test — Purpose-Invest section + video modal
// Covers: section render, empty-URL alert, Play→modal, X close, Escape close,
// backdrop close, console errors, 3 viewports.
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';
const OUT  = 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots';

async function probeViewport(browser, name, w, h) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    // Track network requests so we can correlate "Failed to load resource" lines to their URL
    const failedUrls = new Set();
    page.on('requestfailed', r => failedUrls.add(r.url()));
    page.on('response', r => { if (r.status() === 404) failedUrls.add(r.url()); });

    page.on('console', m => {
        if (m.type() !== 'error') return;
        const t = m.text();
        // Skip the expected test.mp4 404 — we deliberately point <video> at it
        if (/Failed to load resource/i.test(t)) {
            // Defer judgment until end: check failedUrls
            errors.push({ pending: true, text: `[${name}] ${t}` });
        } else {
            errors.push({ pending: false, text: `[${name}] ${t}` });
        }
    });
    page.on('pageerror', e => errors.push({ pending: false, text: `[${name}] pageerror: ${e.message}` }));

    // Suppress alert popup (would block test)
    page.on('dialog', d => d.dismiss().catch(() => {}));

    // Pre-suppress the fill-popup (auto-opens 7s after load via sessionStorage gate)
    await page.addInitScript(() => {
        try { sessionStorage.setItem('fillPopupShown', '1'); } catch (_) {}
    });
    await page.goto(`${BASE}/main`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    // Belt + braces — force-hide if it slipped through
    await page.evaluate(() => {
        const fp = document.getElementById('fill-popup');
        if (fp) fp.style.display = 'none';
    });

    // 1. Section exists
    const sectionVisible = await page.$eval('#purpose-invest', el => {
        const r = el.getBoundingClientRect();
        return r.width > 100 && r.height > 100;
    }).catch(() => false);
    // 2. Heading text
    const heading = await page.$eval('.purpose-heading', el => el.innerText.trim()).catch(() => '');
    // 3. 4 list items
    const liCount = await page.$$eval('.purpose-list li', items => items.length).catch(() => 0);
    // 4. Play button + LEARN MORE
    const hasPlay = await page.$('#btn-play-video').then(Boolean);
    const hasLearn = await page.$$eval('.btn-learn-more', a => a.length > 0);
    // 5. Section background uses cream
    const sectionBg = await page.$eval('#purpose-invest', el => getComputedStyle(el).backgroundColor).catch(() => '');

    // Take screenshot of section
    await page.evaluate(() => document.getElementById('purpose-invest')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/F06-section-${name}.png`, fullPage: false });

    console.log(`\n=== ${name} ${w}x${h} ===`);
    console.log(`  section visible: ${sectionVisible}`);
    console.log(`  heading: "${heading}"`);
    console.log(`  list items: ${liCount} (expect 4)`);
    console.log(`  play btn: ${hasPlay}, learn btn: ${hasLearn}`);
    console.log(`  section bg: ${sectionBg}`);

    // 6. Empty URL → alert
    const purposeUrl = await page.evaluate(() => document.body.dataset.purposeVideoUrl);
    console.log(`  body[data-purpose-video-url]: "${purposeUrl}"`);

    let alertFired = false;
    page.removeAllListeners('dialog');
    page.on('dialog', async d => {
        alertFired = true;
        console.log(`  alert (empty URL): "${d.message()}"`);
        await d.dismiss();
    });
    await page.click('#btn-play-video').catch(e => console.log('  play click err:', e.message));
    await page.waitForTimeout(500);
    console.log(`  empty URL alert fired: ${alertFired} (expect true since no video set)`);

    // 7. Set a URL via JS then test modal open + close
    await page.evaluate(() => { document.body.dataset.purposeVideoUrl = '/uploads/test.mp4'; });
    page.removeAllListeners('dialog');
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await page.click('#btn-play-video');
    await page.waitForTimeout(400);
    const modalOpen = await page.$eval('#video-modal', el => getComputedStyle(el).display !== 'none');
    console.log(`  modal open after play: ${modalOpen}`);
    await page.screenshot({ path: `${OUT}/F06-modal-open-${name}.png`, fullPage: false });

    // Close via X button
    await page.click('#btn-close-video').catch(() => {});
    await page.waitForTimeout(300);
    const modalClosed = await page.$eval('#video-modal', el => getComputedStyle(el).display === 'none');
    console.log(`  modal closed via X: ${modalClosed}`);

    // Re-open and close via Escape
    await page.click('#btn-play-video');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const modalClosedEsc = await page.$eval('#video-modal', el => getComputedStyle(el).display === 'none');
    console.log(`  modal closed via Escape: ${modalClosedEsc}`);

    // Re-open and close via backdrop click
    await page.click('#btn-play-video');
    await page.waitForTimeout(300);
    // Click on modal backdrop itself (force, since video-wrapper covers most)
    const box = await page.$eval('#video-modal', el => {
        const r = el.getBoundingClientRect();
        return { x: r.x + 10, y: r.y + 10 };
    });
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(300);
    const modalClosedBd = await page.$eval('#video-modal', el => getComputedStyle(el).display === 'none');
    console.log(`  modal closed via backdrop: ${modalClosedBd}`);

    await ctx.close();

    // Resolve pending "Failed to load resource" errors against captured failed URLs
    const realErrors = [];
    for (const e of errors) {
        if (e.pending) {
            // Skip if the only failed URL is the test fixture
            const offendingUrls = [...failedUrls].filter(u => !/\/uploads\/test\.mp4$/.test(u));
            if (offendingUrls.length > 0) realErrors.push(`${e.text} (urls=${offendingUrls.join(', ')})`);
        } else {
            realErrors.push(e.text);
        }
    }

    const pass =
        sectionVisible &&
        liCount === 4 &&
        hasPlay &&
        hasLearn &&
        alertFired &&
        modalOpen &&
        modalClosed &&
        modalClosedEsc &&
        modalClosedBd &&
        realErrors.length === 0;

    if (realErrors.length) {
        console.log(`  ❌ console errors:`);
        realErrors.forEach(e => console.log(`     ${e}`));
    } else {
        console.log(`  ✓ console clean (ignored ${failedUrls.size} expected test.mp4 404s)`);
    }
    console.log(`  → ${pass ? 'PASS' : 'FAIL'}`);
    return pass;
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const results = [];
    for (const vp of [['desktop', 1440, 900], ['tablet', 820, 1180], ['mobile', 375, 812]]) {
        results.push([vp[0], await probeViewport(browser, vp[0], vp[1], vp[2])]);
    }
    await browser.close();
    console.log('\n=== SUMMARY ===');
    let allPass = true;
    for (const [n, p] of results) {
        console.log(`  ${n}: ${p ? 'PASS' : 'FAIL'}`);
        if (!p) allPass = false;
    }
    process.exit(allPass ? 0 : 1);
})();
