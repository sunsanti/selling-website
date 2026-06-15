const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    let allOk = true;

    for (const vp of [{ w: 1600, h: 1100, tag: 'desktop' }, { w: 768, h: 1024, tag: 'tablet' }, { w: 390, h: 844, tag: 'mobile' }]) {
        const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
        const page = await ctx.newPage();
        const errs = [];
        page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        page.on('pageerror', e => errs.push('pageerror: ' + e.message));

        for (const url of ['/main', '/about']) {
            await page.goto(BASE + url, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000);
            await page.evaluate(() => {
                const el = document.getElementById('fill-popup');
                if (el) el.style.display = 'none';
            });

            const info = await page.evaluate(() => {
                const persons = Array.from(document.querySelectorAll('#footer-col-contact .footer-person'));
                return persons.map(p => {
                    const cs = getComputedStyle(p);
                    const r = p.getBoundingClientRect();
                    return {
                        padding: cs.padding, border: cs.border,
                        borderRadius: cs.borderRadius, background: cs.backgroundColor,
                        height: Math.round(r.height), width: Math.round(r.width)
                    };
                });
            });

            const identical = info.length === 2 && JSON.stringify(info[0]) === JSON.stringify(info[1]);
            console.log(`${vp.tag} ${url}:`, JSON.stringify(info), identical ? '✓ identical' : '✗ MISMATCH');
            allOk = allOk && identical;
        }
        await ctx.close();
        const real = errs.filter(t => !/Failed to load resource/i.test(t));
        if (real.length) { console.log(`${vp.tag} console errors:`, real); allOk = false; }
    }

    console.log(`\n=== OVERALL: ${allOk ? 'PASS ✓' : 'FAIL ✗'} ===`);
    await b.close();
    process.exit(allOk ? 0 : 1);
})();
