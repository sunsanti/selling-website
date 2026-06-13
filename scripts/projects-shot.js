const { chromium } = require('playwright');
const OUT = 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots';
(async () => {
    const browser = await chromium.launch({ headless: true });
    for (const vp of [['desktop',1440,900],['mobile',375,667]]) {
        const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }});
        const page = await ctx.newPage();
        // /projects list
        await page.goto('http://localhost:5500/projects', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/F05c-list-${vp[0]}.png`, fullPage: false });
        // /projects/8 detail
        await page.goto('http://localhost:5500/projects/8', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/F05c-detail-${vp[0]}.png`, fullPage: false });
        // /projects/99 not found
        await page.goto('http://localhost:5500/projects/99', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/F05c-notfound-${vp[0]}.png`, fullPage: false });
        await ctx.close();
    }
    await browser.close();
    console.log('F05c shots saved');
})();
