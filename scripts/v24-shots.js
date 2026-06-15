// v24: screenshots of current /projects filter chips + project detail gallery
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();

    await page.goto(BASE + '/projects?state=NSW&type=apartment&price=500k-800k', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scripts/shots/v24-filter-chips.png', fullPage: false });
    const chipsHandle = page.locator('#projects-filter-chips');
    await chipsHandle.screenshot({ path: 'scripts/shots/v24-filter-chips-zoom.png' });

    // project detail gallery — id 8 has 4 images
    await page.goto(BASE + '/projects/8', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const gallery = page.locator('#detail-gallery');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await gallery.screenshot({ path: 'scripts/shots/v24-gallery.png' });

    await b.close();
    console.log('done');
})();
