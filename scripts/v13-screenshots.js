// v13: capture Dashboard (About Stats) + About tab (Leadership/Services/Team) screenshots
const { chromium } = require('playwright');
const path = require('path');
const BASE = 'http://localhost:5500';
const OUT = path.join(__dirname, '..', 'docs', 'superpowers', 'plans', '.state',
    '2026-05-31-sealand-premium-redesign', 'screenshots');

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1400 } });
    const page = await ctx.newPage();

    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type="submit"]')]);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    await page.click('[data-section="dashboard"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, 'V13-dashboard-stats.png'), fullPage: true });

    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(OUT, 'V13-about-tab.png'), fullPage: true });

    await b.close();
    console.log('Screenshots saved to', OUT);
})();
