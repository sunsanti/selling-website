// v25: test AREA filter (renamed from SUBURB) on /projects and /main search bar
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();

    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    // 1) /projects?area=sydney — should return the sydney-area projects (ids 8,9)
    await page.goto(BASE + '/projects?area=sydney', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const chipText = await page.locator('#projects-filter-chips').innerText();
    console.log('chip text (area=sydney):', JSON.stringify(chipText));
    const cardCount1 = await page.locator('.project-card').count();
    console.log('project card count (area=sydney):', cardCount1);
    const selectValue1 = await page.locator('#search-area').inputValue();
    console.log('search-area prefill value:', selectValue1);

    // 2) /projects?area=goldcoast — should return the goldcoast project (id 11)
    await page.goto(BASE + '/projects?area=goldcoast', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const chipText2 = await page.locator('#projects-filter-chips').innerText();
    console.log('chip text (area=goldcoast):', JSON.stringify(chipText2));
    const cardCount2 = await page.locator('.project-card').count();
    console.log('project card count (area=goldcoast):', cardCount2);

    // 3) use the search form on /projects to select Melbourne and submit
    await page.goto(BASE + '/projects', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.selectOption('#search-area', 'melbourne');
    await page.click('.btn-search-property');
    await page.waitForTimeout(500);
    console.log('url after submitting Melbourne:', page.url());
    const chipText3 = await page.locator('#projects-filter-chips').innerText();
    console.log('chip text (form submit melbourne):', JSON.stringify(chipText3));
    const cardCount3 = await page.locator('.project-card').count();
    console.log('project card count (area=melbourne):', cardCount3);

    // 4) /main search bar — select Brisbane, submit, should navigate to /projects?area=brisbane
    await page.goto(BASE + '/main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.selectOption('#search-area', 'brisbane');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('.btn-search-property')
    ]);
    console.log('url after /main search submit (brisbane):', page.url());
    const cardCount4 = await page.locator('.project-card').count();
    console.log('project card count (area=brisbane):', cardCount4);

    console.log('console errors:', errors.length, errors);

    await b.close();
    console.log('done');
})();
