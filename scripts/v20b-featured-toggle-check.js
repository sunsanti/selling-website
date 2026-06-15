// v20b: confirm Featured Videos/News toggle+save still work correctly now that
// the panels live inside .sub-tab-panel (v20 restructuring). State-aware
// (current DB already has real featured selections from admin use), unlike v19.
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

    await login(page);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    let allOk = true;

    // ===== Videos =====
    await page.click('[data-section="videos"]');
    await page.waitForTimeout(1000);

    const before = await fetch(BASE + '/api/public/videos/featured').then(r => r.json());
    const beforeIds = before.data.map(v => v.id).sort();
    console.log('videos featured before:', JSON.stringify(beforeIds));

    const targetId = beforeIds[0];
    await page.evaluate((id) => toggleFeaturedVideo(id), targetId);
    await page.evaluate(() => saveFeaturedVideos());
    await page.waitForTimeout(300);

    const afterRemove = await fetch(BASE + '/api/public/videos/featured').then(r => r.json());
    const afterRemoveIds = afterRemove.data.map(v => v.id).sort();
    const removeOk = !afterRemoveIds.includes(targetId) && JSON.stringify(afterRemoveIds) === JSON.stringify(beforeIds.filter(i => i !== targetId));
    console.log('videos featured after removing #' + targetId + ':', JSON.stringify(afterRemoveIds), removeOk ? '✓' : '✗');

    await page.evaluate((id) => toggleFeaturedVideo(id), targetId);
    await page.evaluate(() => saveFeaturedVideos());
    await page.waitForTimeout(300);

    const afterRestore = await fetch(BASE + '/api/public/videos/featured').then(r => r.json());
    const afterRestoreIds = afterRestore.data.map(v => v.id).sort();
    const restoreOk = JSON.stringify(afterRestoreIds) === JSON.stringify(beforeIds);
    console.log('videos featured restored:', JSON.stringify(afterRestoreIds), restoreOk ? '✓' : '✗');

    allOk = allOk && removeOk && restoreOk;

    // ===== News =====
    await page.click('[data-section="news"]');
    await page.waitForTimeout(1000);

    const beforeN = await fetch(BASE + '/api/public/news/featured').then(r => r.json());
    const beforeNIds = beforeN.data.map(n => n.id).sort();
    console.log('news featured before:', JSON.stringify(beforeNIds));

    const targetNId = beforeNIds[0];
    await page.evaluate((id) => toggleFeaturedNews(id), targetNId);
    await page.evaluate(() => saveFeaturedNews());
    await page.waitForTimeout(300);

    const afterRemoveN = await fetch(BASE + '/api/public/news/featured').then(r => r.json());
    const afterRemoveNIds = afterRemoveN.data.map(n => n.id).sort();
    const removeNOk = !afterRemoveNIds.includes(targetNId) && JSON.stringify(afterRemoveNIds) === JSON.stringify(beforeNIds.filter(i => i !== targetNId));
    console.log('news featured after removing #' + targetNId + ':', JSON.stringify(afterRemoveNIds), removeNOk ? '✓' : '✗');

    await page.evaluate((id) => toggleFeaturedNews(id), targetNId);
    await page.evaluate(() => saveFeaturedNews());
    await page.waitForTimeout(300);

    const afterRestoreN = await fetch(BASE + '/api/public/news/featured').then(r => r.json());
    const afterRestoreNIds = afterRestoreN.data.map(n => n.id).sort();
    const restoreNOk = JSON.stringify(afterRestoreNIds) === JSON.stringify(beforeNIds);
    console.log('news featured restored:', JSON.stringify(afterRestoreNIds), restoreNOk ? '✓' : '✗');

    allOk = allOk && removeNOk && restoreNOk;

    console.log(`\n=== OVERALL: ${allOk ? 'PASS ✓' : 'FAIL ✗'} ===`);
    await b.close();
    process.exit(allOk ? 0 : 1);
})();
