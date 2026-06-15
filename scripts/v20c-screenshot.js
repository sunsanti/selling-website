const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

async function login(page) {
    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type="submit"]')]);
}

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
    const page = await ctx.newPage();

    await login(page);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'scripts/shots/dashboard-settings.png' });

    await page.click('#dashboard .sub-nav-item[data-subtab="dashboard-stats"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scripts/shots/dashboard-stats.png' });

    await page.click('[data-section="projects"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scripts/shots/projects-featured.png' });
    await page.click('#projects .sub-nav-item[data-subtab="projects-active"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scripts/shots/projects-active.png' });

    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scripts/shots/about-leadership.png', fullPage: true });
    await page.click('#home-about .sub-nav-item[data-subtab="about-content"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scripts/shots/about-content.png', fullPage: true });

    await b.close();
})();
