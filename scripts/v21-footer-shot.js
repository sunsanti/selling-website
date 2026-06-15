const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
    const page = await ctx.newPage();

    await page.goto(BASE + '/main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
        const el = document.getElementById('fill-popup');
        if (el) el.style.display = 'none';
        const p = document.getElementById('popup');
        if (p) p.style.display = 'none';
    });
    await page.waitForTimeout(300);

    const contact = await page.$('#footer-col-contact');
    await contact.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scripts/shots/footer-contact-col.png', clip: await contact.boundingBox() });

    // computed styles of both .footer-person blocks
    const info = await page.evaluate(() => {
        const persons = Array.from(document.querySelectorAll('#footer-col-contact .footer-person'));
        return persons.map(p => {
            const cs = getComputedStyle(p);
            const r = p.getBoundingClientRect();
            return {
                padding: cs.padding,
                border: cs.border,
                borderBottom: cs.borderBottom,
                borderRadius: cs.borderRadius,
                background: cs.background,
                height: r.height,
                width: r.width
            };
        });
    });
    console.log(JSON.stringify(info, null, 2));

    await b.close();
})();
