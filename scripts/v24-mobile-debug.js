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

    const info = await page.evaluate(() => {
        const lb = document.getElementById('gallery-lightbox');
        const rect = lb.getBoundingClientRect();
        const cs = getComputedStyle(lb);
        return {
            classList: [...lb.classList],
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            position: cs.position,
            display: cs.display,
            background: cs.background,
            zIndex: cs.zIndex,
            bodyOverflow: getComputedStyle(document.body).overflow,
            viewport: { w: window.innerWidth, h: window.innerHeight }
        };
    });
    console.log(JSON.stringify(info, null, 2));

    await b.close();
})();
