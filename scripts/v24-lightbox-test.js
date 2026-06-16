// v24: test gallery lightbox on /projects/8 (4 images)
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();

    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(BASE + '/projects/8', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const gallery = page.locator('#detail-gallery');
    await gallery.scrollIntoViewIfNeeded();

    // click second image (index 1)
    const imgs = page.locator('#detail-gallery-grid img');
    const count = await imgs.count();
    console.log('gallery image count:', count);
    await imgs.nth(1).click();
    await page.waitForTimeout(400);

    const lightbox = page.locator('#gallery-lightbox');
    const isOpen = await lightbox.evaluate(el => el.classList.contains('is-open'));
    console.log('lightbox open after click:', isOpen);

    const mainSrc1 = await page.locator('#gallery-lightbox-image').getAttribute('src');
    console.log('main image src (should match images[1]):', mainSrc1);

    const thumbCount = await page.locator('#gallery-lightbox-thumbs img').count();
    console.log('thumb count:', thumbCount);

    const activeThumbIdx = await page.evaluate(() => {
        const thumbs = [...document.querySelectorAll('#gallery-lightbox-thumbs img')];
        return thumbs.findIndex(t => t.classList.contains('is-active'));
    });
    console.log('active thumb index (should be 1):', activeThumbIdx);

    await page.screenshot({ path: 'scripts/shots/v24-lightbox-open.png' });

    // click next arrow
    await page.click('#gallery-lightbox-next');
    await page.waitForTimeout(300);
    const mainSrc2 = await page.locator('#gallery-lightbox-image').getAttribute('src');
    console.log('main image src after next (should be images[2]):', mainSrc2);
    const activeThumbIdx2 = await page.evaluate(() => {
        const thumbs = [...document.querySelectorAll('#gallery-lightbox-thumbs img')];
        return thumbs.findIndex(t => t.classList.contains('is-active'));
    });
    console.log('active thumb index after next (should be 2):', activeThumbIdx2);

    // click prev arrow twice (wrap to last)
    await page.click('#gallery-lightbox-prev');
    await page.click('#gallery-lightbox-prev');
    await page.waitForTimeout(300);
    const activeThumbIdx3 = await page.evaluate(() => {
        const thumbs = [...document.querySelectorAll('#gallery-lightbox-thumbs img')];
        return thumbs.findIndex(t => t.classList.contains('is-active'));
    });
    console.log('active thumb index after 2 prev from index 2 (should be 0):', activeThumbIdx3);

    // click a thumbnail directly
    await page.click('#gallery-lightbox-thumbs img:nth-child(4)');
    await page.waitForTimeout(300);
    const activeThumbIdx4 = await page.evaluate(() => {
        const thumbs = [...document.querySelectorAll('#gallery-lightbox-thumbs img')];
        return thumbs.findIndex(t => t.classList.contains('is-active'));
    });
    console.log('active thumb index after clicking thumb 4 (should be 3):', activeThumbIdx4);

    // close via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isOpenAfterEsc = await lightbox.evaluate(el => el.classList.contains('is-open'));
    console.log('lightbox open after Escape (should be false):', isOpenAfterEsc);

    // re-open and close via backdrop click
    await imgs.nth(0).click();
    await page.waitForTimeout(300);
    await page.mouse.click(10, 10); // click near top-left corner (backdrop)
    await page.waitForTimeout(300);
    const isOpenAfterBackdrop = await lightbox.evaluate(el => el.classList.contains('is-open'));
    console.log('lightbox open after backdrop click (should be false):', isOpenAfterBackdrop);

    console.log('console errors:', errors.length, errors);

    await b.close();
    console.log('done');
})();
