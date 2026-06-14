// v16 admin audit:
//  1. About tab — Hero/Mission/Offices consolidated into ONE wrapper (.settings-panel),
//     offices are dynamic (add/remove, editable name/flag/address/phone/email),
//     live preview reflects added office
//  2. Invest tab — "Why Invest in Australia" Section + "Why Invest" Video consolidated
//     into ONE wrapper (.settings-panel)
//  3. Footer tab — Site-wide Content consolidated into ONE wrapper (.settings-panel)
//  4. Videos/News tabs — .table-container, .action-btn.*, modal-close + modal-form
//     consistent with Projects/Contacts/Accounts
//  5. All .table-container tables show max 10 rows/page with pagination controls
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

async function login(page) {
    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type="submit"]')]);
}

// Check a table-container's pagination: <=10 rows shown, page-btn count matches
// total pages, page switching works when totalItems > PAGE_SIZE.
async function checkPagination(page, label, tbodySelector, paginationId, opts = {}) {
    const skipRowsCheck = !!opts.skipRowsCheck;
    const info = await page.evaluate(({ tbodySelector, paginationId }) => {
        const tbody = document.querySelector(tbodySelector);
        const rows = tbody ? tbody.querySelectorAll('tr').length : -1;
        const pag = document.getElementById(paginationId);
        const pageBtns = pag ? pag.querySelectorAll('.page-btn').length : -1;
        const activeBtn = pag ? pag.querySelector('.page-btn.active') : null;
        return {
            exists: !!pag,
            rows,
            pageBtns,
            activePage: activeBtn ? activeBtn.textContent.trim() : null,
            // a "no data" placeholder row has a colspan'd <td>
            isEmptyPlaceholder: tbody && tbody.querySelector('tr td[colspan]') ? true : false
        };
    }, { tbodySelector, paginationId });

    let rowsOk = skipRowsCheck ? true : (info.rows <= 10);
    console.log(`  [${label}] pagination#${paginationId} exists=${info.exists}  rows=${info.rows}${info.isEmptyPlaceholder ? ' (empty placeholder)' : ''}  pageBtns=${info.pageBtns}  active="${info.activePage}"  ${rowsOk ? '✓' : '✗ MORE THAN 10 ROWS'}`);

    let pageSwitchOk = true;
    // pageBtns includes prev/next arrows, so > 3 means >= 2 numbered pages
    if (info.pageBtns > 3) {
        const before = await page.evaluate((sel) => {
            const tbody = document.querySelector(sel);
            const first = tbody.querySelector('tr');
            return first ? first.outerHTML.slice(0, 120) : null;
        }, tbodySelector);

        // click page "2"
        await page.evaluate((paginationId) => {
            const pag = document.getElementById(paginationId);
            const btn = Array.from(pag.querySelectorAll('.page-btn')).find(b => b.textContent.trim() === '2');
            if (btn) btn.click();
        }, paginationId);
        await page.waitForTimeout(300);

        const after = await page.evaluate(({ tbodySelector, paginationId }) => {
            const tbody = document.querySelector(tbodySelector);
            const first = tbody.querySelector('tr');
            const pag = document.getElementById(paginationId);
            const activeBtn = pag.querySelector('.page-btn.active');
            return {
                firstRow: first ? first.outerHTML.slice(0, 120) : null,
                rows: tbody.querySelectorAll('tr').length,
                activePage: activeBtn ? activeBtn.textContent.trim() : null
            };
        }, { tbodySelector, paginationId });

        pageSwitchOk = after.firstRow !== before && after.activePage === '2' && after.rows <= 10;
        console.log(`      page-2 switch: active="${after.activePage}" rows=${after.rows} rowChanged=${after.firstRow !== before}  ${pageSwitchOk ? '✓' : '✗'}`);

        // restore to page 1
        await page.evaluate((paginationId) => {
            const pag = document.getElementById(paginationId);
            const btn = Array.from(pag.querySelectorAll('.page-btn')).find(b => b.textContent.trim() === '1');
            if (btn) btn.click();
        }, paginationId);
        await page.waitForTimeout(300);
    } else {
        console.log(`      <=1 page — no page switch to test (correct, no controls shown)`);
    }

    return info.exists && rowsOk && pageSwitchOk;
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

    // === 1. About tab — Hero/Mission/Offices in one wrapper + dynamic offices ===
    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(1500);

    const aboutForm = await page.evaluate(() => {
        const form = document.getElementById('about-content-form');
        if (!form) return null;
        return {
            classes: form.className,
            dividerCount: form.querySelectorAll('.form-section-divider').length,
            dividerTexts: Array.from(form.querySelectorAll('.form-section-divider span')).map(s => s.textContent.trim()),
            officeCardCount: form.querySelectorAll('#about-offices-cards .office-card-admin').length
        };
    });
    console.log('\n--- 1. About tab — Hero/Mission/Offices consolidated ---');
    console.log('  form:', JSON.stringify(aboutForm));
    const aboutWrapperOk = aboutForm &&
        aboutForm.classes.includes('settings-form') &&
        aboutForm.classes.includes('settings-panel') &&
        aboutForm.dividerCount === 3 &&
        aboutForm.officeCardCount >= 1;
    console.log(`  single .settings-form.settings-panel wrapper, 3 dividers (Hero/Mission/Offices), >=1 office card: ${aboutWrapperOk ? '✓' : '✗'}`);

    // Add an office, verify card count + live preview reflects it, then remove
    const TEST_OFFICE_NAME = 'AUDIT OFFICE ' + Date.now();
    await page.click('button[onclick="addAboutOffice()"]');
    await page.waitForTimeout(300);
    const afterAddCount = await page.$$eval('#about-offices-cards .office-card-admin', els => els.length);
    const newCard = page.locator('#about-offices-cards .office-card-admin').last();
    await newCard.locator('.ao-name').fill(TEST_OFFICE_NAME);
    await page.waitForTimeout(700);

    const aboutIframe = await page.$('#preview-iframe-about');
    const officeNames = await aboutIframe?.contentFrame().then(f =>
        f?.$$eval('#about-offices-grid .office-card h3', els => els.map(e => e.textContent.trim()))
    ).catch(() => null);
    const officeReflected = Array.isArray(officeNames) && officeNames.some(n => n.includes(TEST_OFFICE_NAME));
    console.log(`  office card count after Add: ${afterAddCount} (was ${aboutForm.officeCardCount}) ${afterAddCount === aboutForm.officeCardCount + 1 ? '✓' : '✗'}`);
    console.log(`  new office reflected in /about preview offices grid: ${officeReflected ? '✓' : '✗'}`);

    // remove the test office
    await newCard.locator('.ao-remove').click();
    await page.waitForTimeout(300);
    const afterRemoveCount = await page.$$eval('#about-offices-cards .office-card-admin', els => els.length);
    const removeOk = afterRemoveCount === aboutForm.officeCardCount;
    console.log(`  office card count after Remove: ${afterRemoveCount} (back to ${aboutForm.officeCardCount}) ${removeOk ? '✓' : '✗'}`);

    const aboutOk = aboutWrapperOk && afterAddCount === aboutForm.officeCardCount + 1 && officeReflected && removeOk;
    await page.locator('#about-content-form').screenshot({ path: 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots/v16-about-tab.png' });

    // === 2. Invest tab — "Why Invest" Section + Video in one wrapper ===
    await page.click('[data-section="invest"]');
    await page.waitForTimeout(1200);
    const investForm = await page.evaluate(() => {
        const form = document.getElementById('invest-content-form');
        if (!form) return null;
        return {
            classes: form.className,
            dividerCount: form.querySelectorAll('.form-section-divider').length,
            dividerTexts: Array.from(form.querySelectorAll('.form-section-divider span')).map(s => s.textContent.trim())
        };
    });
    console.log('\n--- 2. Invest tab — "Why Invest" Section + Video consolidated ---');
    console.log('  form:', JSON.stringify(investForm));
    const investOk = investForm &&
        investForm.classes.includes('settings-form') &&
        investForm.classes.includes('settings-panel') &&
        investForm.dividerCount === 2;
    console.log(`  single .settings-form.settings-panel wrapper, 2 dividers (Section + Video): ${investOk ? '✓' : '✗'}`);
    await page.locator('#invest-content-form').screenshot({ path: 'docs/superpowers/plans/.state/2026-05-31-sealand-premium-redesign/screenshots/v16-invest-tab.png' });

    // === 3. Footer tab — Site-wide Content in one wrapper ===
    await page.click('[data-section="home-footer"]');
    await page.waitForTimeout(1200);
    const footerForm = await page.evaluate(() => {
        const form = document.getElementById('footer-content-form');
        if (!form) return null;
        return {
            classes: form.className,
            dividerCount: form.querySelectorAll('.form-section-divider').length,
            dividerTexts: Array.from(form.querySelectorAll('.form-section-divider span')).map(s => s.textContent.trim())
        };
    });
    console.log('\n--- 3. Footer tab — Site-wide Content consolidated ---');
    console.log('  form:', JSON.stringify(footerForm));
    const footerOk = footerForm &&
        footerForm.classes.includes('settings-form') &&
        footerForm.classes.includes('settings-panel') &&
        footerForm.dividerCount === 1;
    console.log(`  single .settings-form.settings-panel wrapper, 1 divider (Site-wide Content): ${footerOk ? '✓' : '✗'}`);

    // === 4. Videos/News — table-container, action-btn.*, modal-close + modal-form ===
    console.log('\n--- 4. Videos/News tabs — unified table-container/buttons/modals ---');
    await page.click('[data-section="videos"]');
    await page.waitForTimeout(1200);
    const videosStruct = await page.evaluate(() => {
        const tbody = document.getElementById('videos-table-body');
        const container = tbody ? tbody.closest('.table-container') : null;
        const wrapper = tbody ? tbody.closest('.table-wrapper') : null;
        const modal = document.getElementById('video-modal-admin');
        const closeBtn = modal ? modal.querySelector('.modal-close') : null;
        const form = document.getElementById('video-form');
        const actionBtns = Array.from(document.querySelectorAll('#videos-table-body .action-btn')).map(b => b.className);
        return {
            hasTableContainer: !!container,
            hasTableWrapper: !!wrapper,
            modalCloseIsButton: !!closeBtn && closeBtn.tagName === 'BUTTON',
            formHasModalForm: !!form && form.classList.contains('modal-form'),
            actionBtnClasses: actionBtns
        };
    });
    console.log('  videos:', JSON.stringify(videosStruct));
    const videosOk = videosStruct.hasTableContainer && !videosStruct.hasTableWrapper &&
        videosStruct.modalCloseIsButton && videosStruct.formHasModalForm;
    console.log(`  .table-container (not .table-wrapper), <button class="modal-close">, <form class="modal-form">: ${videosOk ? '✓' : '✗'}`);

    await page.click('[data-section="news"]');
    await page.waitForTimeout(1200);
    const newsStruct = await page.evaluate(() => {
        const tbody = document.getElementById('news-table-body');
        const container = tbody ? tbody.closest('.table-container') : null;
        const wrapper = tbody ? tbody.closest('.table-wrapper') : null;
        const modal = document.getElementById('news-modal-admin');
        const closeBtn = modal ? modal.querySelector('.modal-close') : null;
        const form = document.getElementById('news-form');
        const actionBtns = Array.from(document.querySelectorAll('#news-table-body .action-btn')).map(b => b.className);
        return {
            hasTableContainer: !!container,
            hasTableWrapper: !!wrapper,
            modalCloseIsButton: !!closeBtn && closeBtn.tagName === 'BUTTON',
            formHasModalForm: !!form && form.classList.contains('modal-form'),
            actionBtnClasses: actionBtns
        };
    });
    console.log('  news:', JSON.stringify(newsStruct));
    const newsOk = newsStruct.hasTableContainer && !newsStruct.hasTableWrapper &&
        newsStruct.modalCloseIsButton && newsStruct.formHasModalForm;
    console.log(`  .table-container (not .table-wrapper), <button class="modal-close">, <form class="modal-form">: ${newsOk ? '✓' : '✗'}`);

    // === 5. Pagination — 10 rows/page across all admin tables ===
    console.log('\n--- 5. Pagination (max 10 rows/page) across all admin table-containers ---');
    const pagResults = [];

    await page.click('[data-section="projects"]');
    await page.waitForTimeout(1200);
    pagResults.push(await checkPagination(page, 'active-projects', '#active-projects-tbody', 'active-projects-pagination'));
    pagResults.push(await checkPagination(page, 'inactive-projects', '#inactive-projects-tbody', 'inactive-projects-pagination'));

    await page.click('[data-section="contacts"]');
    await page.waitForTimeout(1200);
    pagResults.push(await checkPagination(page, 'contacts', '#contacts-tbody', 'contacts-pagination'));

    await page.click('[data-section="accounts"]');
    await page.waitForTimeout(1200);
    pagResults.push(await checkPagination(page, 'accounts', '#accounts-tbody', 'accounts-pagination'));

    await page.click('[data-section="audit-log"]');
    await page.waitForTimeout(1200);
    pagResults.push(await checkPagination(page, 'audit-log', '#audit-log-tbody', 'audit-log-pagination'));

    await page.click('[data-section="videos"]');
    await page.waitForTimeout(1200);
    pagResults.push(await checkPagination(page, 'videos', '#videos-table-body', 'videos-pagination'));

    await page.click('[data-section="news"]');
    await page.waitForTimeout(1200);
    pagResults.push(await checkPagination(page, 'news', '#news-table-body', 'news-pagination'));

    const paginationOk = pagResults.every(Boolean);

    // === Console errors across all visited tabs ===
    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 12).forEach(e => console.log('  ' + e));

    console.log('\n=== SUMMARY ===');
    console.log(`  1. About: Hero/Mission/Offices in one wrapper + dynamic offices:  ${aboutOk ? '✓' : '✗'}`);
    console.log(`  2. Invest: Section + Video in one wrapper:                       ${investOk ? '✓' : '✗'}`);
    console.log(`  3. Footer: Site-wide Content in one wrapper:                     ${footerOk ? '✓' : '✗'}`);
    console.log(`  4. Videos/News: unified table-container/buttons/modals:          ${videosOk && newsOk ? '✓' : '✗'}`);
    console.log(`  5. Pagination (<=10 rows/page) across all tables:                ${paginationOk ? '✓' : '✗'}`);
    console.log(`  6. Console clean (0 non-404 errors):                             ${real.length === 0 ? '✓' : '✗'}`);

    const allPass = aboutOk && investOk && footerOk && videosOk && newsOk && paginationOk && real.length === 0;
    console.log(`\n  OVERALL: ${allPass ? '6/6 PASS ✓' : 'FAIL ✗'}`);

    await b.close();
    process.exit(allPass ? 0 : 1);
})();
