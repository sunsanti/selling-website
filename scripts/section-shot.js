const { chromium } = require('playwright');
const path = require('path');
const SECTION = process.argv[2] || '#about-us';
const FEAT = process.argv[3] || 'F04';
const OUT = 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots';

(async () => {
    const browser = await chromium.launch({ headless: true });
    for (const vp of [['desktop',1440,900],['tablet',1024,768],['mobile',375,667]]) {
        const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }});
        const page = await ctx.newPage();
        await page.goto('http://localhost:5500/main/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2200); // wait for auto-popup + fetch + render
        const popup = await page.locator('#fill-popup').isVisible().catch(() => false);
        if (popup) await page.locator('#fill-popup .close-btn').click().catch(() => {});
        await page.locator(SECTION).scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        const el = await page.locator(SECTION);
        await el.screenshot({ path: `${OUT}/${FEAT}-${vp[0]}-section.png` });
        await ctx.close();
    }
    await browser.close();
    console.log('Section shots saved');
})();
