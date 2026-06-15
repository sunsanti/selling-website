const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    await page.goto(BASE + '/main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
        const el = document.getElementById('fill-popup');
        if (el) el.style.display = 'none';
    });
    await page.waitForTimeout(300);

    const contact = await page.$('#footer-col-contact');
    await contact.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scripts/shots/footer-contact-mobile.png', clip: await contact.boundingBox() });

    await b.close();
})();
