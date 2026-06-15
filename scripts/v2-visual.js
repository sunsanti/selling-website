// v2 visual smoke: snapshot key pages after refresh round
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';
const OUT  = 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots';

async function shoot(browser, name, url, w, h, scrollToId) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { sessionStorage.setItem('fillPopupShown','1'); } catch(_){} });
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const fp = document.getElementById('fill-popup'); if (fp) fp.style.display = 'none'; });
    if (scrollToId) {
        await page.evaluate(id => document.getElementById(id)?.scrollIntoView({ block: 'start' }), scrollToId);
        await page.waitForTimeout(400);
    }
    await page.screenshot({ path: `${OUT}/V2-${name}.png`, fullPage: false });
    const real = errors.filter(t => !/Failed to load resource/i.test(t));
    console.log(`${name}: ${real.length ? '❌ ' + real.join('|') : '✓ clean'}`);
    await ctx.close();
}

(async () => {
    const b = await chromium.launch({ headless: true });
    await shoot(b, 'main-hero',     '/main', 1440, 900, null);
    await shoot(b, 'main-about',    '/main', 1440, 900, 'about-us');
    await shoot(b, 'main-services', '/main', 1440, 900, 'services');
    await shoot(b, 'main-footer',   '/main', 1440, 900, 'footer');
    await shoot(b, 'projects',      '/projects', 1440, 900, null);
    await shoot(b, 'main-mobile',   '/main', 375,  812, null);
    await b.close();
})();
