// v22/v23: screenshot of admin Our Team sub-tab (visual check of 2-col grid layout + Add Member button)
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1300 } });
    const page = await ctx.newPage();

    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type="submit"]')]);

    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(600);
    await page.click('[data-subtab="about-team"]');
    await page.waitForTimeout(400);

    const panel = page.locator('.sub-tab-panel[data-subtab-panel="about-team"]');
    await panel.screenshot({ path: 'scripts/shots/v22-admin-team.png' });
    console.log('saved scripts/shots/v22-admin-team.png');

    await b.close();
})();
