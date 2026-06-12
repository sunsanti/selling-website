const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    for (const vp of [['desktop',1440,900],['mobile',375,667]]) {
        const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }});
        const page = await ctx.newPage();
        await page.goto('http://localhost:5500/login', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots/F03-login-' + vp[0] + '.png' });
        await ctx.close();
    }
    await browser.close();
    console.log('Login shots saved');
})();
