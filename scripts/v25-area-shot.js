const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();

    await page.goto(BASE + '/projects?area=sydney', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scripts/shots/v25-area-filter.png', fullPage: false });

    await b.close();
    console.log('done');
})();
