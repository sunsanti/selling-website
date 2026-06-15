// v20 admin audit:
//  Phase 3 — per-section secondary sub-navbar (.sub-nav / .sub-nav-item) toggling
//  .sub-tab-panel wrappers, with Live Preview / global controls staying always
//  visible OUTSIDE the sub-tab structure.
//  Sections: Dashboard, Projects, About, Footer, Videos, News.
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
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));

    await login(page);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const sections = [
        { section: 'dashboard', group: 'dashboard', subtabs: ['dashboard-settings', 'dashboard-stats'], alwaysVisible: ['.dashboard-stats', '.live-preview-panel'] },
        { section: 'projects', group: 'projects', subtabs: ['projects-featured', 'projects-active', 'projects-inactive'], alwaysVisible: ['.search-bar'] },
        { section: 'home-about', group: 'about', subtabs: ['about-leadership', 'about-content', 'about-services', 'about-team'], alwaysVisible: ['.live-preview-panel'] },
        { section: 'home-footer', group: 'footer', subtabs: ['footer-content', 'footer-team'], alwaysVisible: ['.live-preview-panel'] },
        { section: 'videos', group: 'videos', subtabs: ['videos-featured', 'videos-all'], alwaysVisible: [] },
        { section: 'news', group: 'news', subtabs: ['news-featured', 'news-all'], alwaysVisible: [] },
    ];

    let allOk = true;

    for (const cfg of sections) {
        await page.click(`[data-section="${cfg.section}"]`);
        await page.waitForTimeout(700);

        const result = await page.evaluate((cfg) => {
            const section = document.getElementById(cfg.section);
            const nav = section.querySelector(`.sub-nav[data-subtab-group="${cfg.group}"]`);
            const items = nav ? Array.from(nav.querySelectorAll('.sub-nav-item')) : [];
            const panels = Array.from(section.querySelectorAll(`.sub-tab-panel[data-subtab-group="${cfg.group}"]`));
            return {
                hasNav: !!nav,
                subtabs: items.map(i => i.dataset.subtab),
                panelIds: panels.map(p => p.dataset.subtabPanel),
                defaultActiveItem: (items.find(i => i.classList.contains('active')) || {}).dataset?.subtab,
                activePanels: panels.filter(p => p.classList.contains('active')).map(p => p.dataset.subtabPanel)
            };
        }, cfg);

        console.log(`\n--- ${cfg.section} ---`);
        console.log('  ', JSON.stringify(result));

        const navOk = result.hasNav
            && JSON.stringify(result.subtabs) === JSON.stringify(cfg.subtabs)
            && JSON.stringify([...result.panelIds].sort()) === JSON.stringify([...cfg.subtabs].sort())
            && result.defaultActiveItem === cfg.subtabs[0]
            && result.activePanels.length === 1 && result.activePanels[0] === cfg.subtabs[0];
        console.log(`  sub-nav structure + default active: ${navOk ? '✓' : '✗'}`);
        allOk = allOk && navOk;

        // click through each sub-tab and verify toggle (only one panel active/visible at a time)
        let toggleOk = true;
        for (const tab of cfg.subtabs) {
            await page.click(`#${cfg.section} .sub-nav-item[data-subtab="${tab}"]`);
            await page.waitForTimeout(150);
            const state = await page.evaluate(({ cfg, tab }) => {
                const section = document.getElementById(cfg.section);
                const items = Array.from(section.querySelectorAll(`.sub-nav[data-subtab-group="${cfg.group}"] .sub-nav-item`));
                const panels = Array.from(section.querySelectorAll(`.sub-tab-panel[data-subtab-group="${cfg.group}"]`));
                return {
                    activeItems: items.filter(i => i.classList.contains('active')).map(i => i.dataset.subtab),
                    activePanels: panels.filter(p => p.classList.contains('active')).map(p => p.dataset.subtabPanel),
                    visiblePanels: panels.filter(p => getComputedStyle(p).display !== 'none').map(p => p.dataset.subtabPanel)
                };
            }, { cfg, tab });
            const ok = state.activeItems.length === 1 && state.activeItems[0] === tab
                && state.activePanels.length === 1 && state.activePanels[0] === tab
                && state.visiblePanels.length === 1 && state.visiblePanels[0] === tab;
            if (!ok) { console.log(`  click "${tab}" -> ${JSON.stringify(state)}: ✗`); toggleOk = false; }
        }
        console.log(`  click-through all sub-tabs toggles correctly: ${toggleOk ? '✓' : '✗'}`);
        allOk = allOk && toggleOk;

        // always-visible elements (checked while the LAST sub-tab is active)
        if (cfg.alwaysVisible.length) {
            const visState = await page.evaluate((cfg) => {
                const section = document.getElementById(cfg.section);
                return cfg.alwaysVisible.map(sel => {
                    const el = section.querySelector(sel);
                    return {
                        sel, exists: !!el,
                        visible: el ? getComputedStyle(el).display !== 'none' : false,
                        insideSubTabPanel: el ? !!el.closest('.sub-tab-panel') : null
                    };
                });
            }, cfg);
            console.log('  always-visible elements:', JSON.stringify(visState));
            const visOk = visState.every(v => v.exists && v.visible && !v.insideSubTabPanel);
            console.log(`  always-visible elements stay visible + outside sub-tab-panel: ${visOk ? '✓' : '✗'}`);
            allOk = allOk && visOk;
        }

        // reset back to default sub-tab for cleanliness
        await page.click(`#${cfg.section} .sub-nav-item[data-subtab="${cfg.subtabs[0]}"]`);
        await page.waitForTimeout(100);
    }

    // sweep remaining tabs for console errors only
    for (const sec of ['invest', 'home-services', 'contacts', 'accounts', 'audit-log']) {
        await page.click(`[data-section="${sec}"]`);
        await page.waitForTimeout(500);
    }

    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 12).forEach(e => console.log('  ' + e));
    allOk = allOk && real.length === 0;

    console.log(`\n=== OVERALL: ${allOk ? 'PASS ✓' : 'FAIL ✗'} ===`);

    await b.close();
    process.exit(allOk ? 0 : 1);
})();
