const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();

    await page.goto(BASE + '/projects/8', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const imgs = page.locator('#detail-gallery-grid img');
    await imgs.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'scripts/shots/v24-lightbox-mobile.png' });

    // check overflow
    const overflow = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
            .filter(el => el.scrollWidth > document.documentElement.clientWidth + 1)
            .map(el => el.tagName + '.' + (el.className || '').toString().slice(0, 40));
    });
    console.log('overflow elements:', overflow);

    await b.close();
    console.log('done');
})();
