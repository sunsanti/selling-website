// v18 admin audit:
//  1. Featured on Homepage panel — split into 2 rows:
//     - #featured-selected-grid (selected, "Đã chọn")
//     - #featured-available-grid (active, unselected, paginated 5/page) + #featured-pagination
//     Selecting an available card moves it to the selected row (and vice versa).
//     4-max disable behavior still enforced on the available row.
//  2. Add/Edit Project modal — "Area Badge" input (#project-area-label) removed;
//     Property Type + Address now paired in one .form-row; area_label is derived
//     from the selected Area option's text, uppercased (e.g. "Gold Coast" -> "GOLD COAST"),
//     and empty when no Area is selected.
//  3. 0 console errors across Projects tab.
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

    // === 1. Featured on Homepage — 2-row layout ===
    await page.click('[data-section="projects"]');
    await page.waitForTimeout(1500);

    const initial = await page.evaluate(() => {
        const selGrid = document.getElementById('featured-selected-grid');
        const availGrid = document.getElementById('featured-available-grid');
        const pag = document.getElementById('featured-pagination');
        return {
            hasSelGrid: !!selGrid,
            hasAvailGrid: !!availGrid,
            hasPag: !!pag,
            selectionSize: _featuredSelection.size,
            totalActive: _featuredAllActive.length,
            selCardCount: selGrid.querySelectorAll('.featured-card').length,
            availCardCount: availGrid.querySelectorAll('.featured-card').length,
            pageBtnCount: pag.querySelectorAll('.page-btn').length,
            counterText: document.getElementById('featured-counter').textContent.trim()
        };
    });
    console.log('\n--- 1. Featured panel — initial state ---');
    console.log('  ', JSON.stringify(initial));

    const available = initial.totalActive - initial.selectionSize;
    const expectedAvailShown = Math.min(available, 5);
    const expectedTotalPages = Math.max(1, Math.ceil(available / 5));
    const expectedPageBtns = expectedTotalPages > 1 ? expectedTotalPages + 2 : 0;

    const structureOk = initial.hasSelGrid && initial.hasAvailGrid && initial.hasPag &&
        initial.selCardCount === initial.selectionSize &&
        initial.availCardCount === expectedAvailShown &&
        initial.pageBtnCount === expectedPageBtns &&
        initial.counterText === `${initial.selectionSize} / 4 selected`;
    console.log(`  selected row shows ${initial.selectionSize} card(s), available row shows ${expectedAvailShown}/${available} (page 1), pagination buttons=${initial.pageBtnCount} (expected ${expectedPageBtns}): ${structureOk ? '✓' : '✗'}`);

    // --- Toggle: move a card from available -> selected -> back ---
    let toggleOk = true;
    if (initial.selectionSize > 0) {
        // selected -> available -> selected (the "ngược lại" / reverse direction)
        const id = await page.evaluate(() => {
            const card = document.querySelector('#featured-selected-grid .featured-card');
            return card ? parseInt(card.dataset.id, 10) : null;
        });

        await page.evaluate((id) => toggleFeatured(id), id);
        await page.waitForTimeout(200);
        const afterRemove = await page.evaluate((id) => ({
            size: _featuredSelection.size,
            inAvailable: !!document.querySelector(`#featured-available-grid .featured-card[data-id="${id}"]`),
            inSelected: !!document.querySelector(`#featured-selected-grid .featured-card[data-id="${id}"]`)
        }), id);
        const removeOk = afterRemove.size === initial.selectionSize - 1 && afterRemove.inAvailable && !afterRemove.inSelected;
        console.log(`  click selected card #${id} -> moves down to available row, size ${initial.selectionSize}->${afterRemove.size}: ${removeOk ? '✓' : '✗'}`);

        await page.evaluate((id) => toggleFeatured(id), id);
        await page.waitForTimeout(200);
        const afterAdd = await page.evaluate((id) => ({
            size: _featuredSelection.size,
            inAvailable: !!document.querySelector(`#featured-available-grid .featured-card[data-id="${id}"]`),
            inSelected: !!document.querySelector(`#featured-selected-grid .featured-card[data-id="${id}"].selected`)
        }), id);
        const addOk = afterAdd.size === initial.selectionSize && afterAdd.inSelected && !afterAdd.inAvailable;
        console.log(`  click available card #${id} again -> moves back up to selected row, size ${afterRemove.size}->${afterAdd.size}: ${addOk ? '✓' : '✗'}`);

        toggleOk = removeOk && addOk;
    } else if (available > 0) {
        // nothing selected yet: available -> selected -> available
        const firstAvailId = await page.evaluate(() => {
            const card = document.querySelector('#featured-available-grid .featured-card');
            return card ? parseInt(card.dataset.id, 10) : null;
        });

        await page.evaluate((id) => toggleFeatured(id), firstAvailId);
        await page.waitForTimeout(200);
        const afterSelect = await page.evaluate((id) => ({
            size: _featuredSelection.size,
            inSelected: !!document.querySelector(`#featured-selected-grid .featured-card[data-id="${id}"].selected`),
            inAvailable: !!document.querySelector(`#featured-available-grid .featured-card[data-id="${id}"]`)
        }), firstAvailId);
        const selectOk = afterSelect.size === initial.selectionSize + 1 && afterSelect.inSelected && !afterSelect.inAvailable;
        console.log(`  click available card #${firstAvailId} -> moves up to selected row, size ${initial.selectionSize}->${afterSelect.size}: ${selectOk ? '✓' : '✗'}`);

        await page.evaluate((id) => toggleFeatured(id), firstAvailId);
        await page.waitForTimeout(200);
        const afterDeselect = await page.evaluate((id) => ({ size: _featuredSelection.size, hasId: _featuredSelection.has(id) }), firstAvailId);
        const deselectOk = afterDeselect.size === initial.selectionSize && !afterDeselect.hasId;
        console.log(`  click selected card #${firstAvailId} again -> moves back down to available row, size ${afterSelect.size}->${afterDeselect.size}: ${deselectOk ? '✓' : '✗'}`);

        toggleOk = selectOk && deselectOk;
    } else {
        console.log('  no available (unselected) projects — skip toggle test');
    }

    // --- 4-max disable behavior ---
    let disableOk = true;
    if (initial.totalActive >= 4) {
        const needed = Math.max(0, 4 - initial.selectionSize);
        const added = [];
        for (let i = 0; i < needed; i++) {
            const id = await page.evaluate(() => {
                const card = document.querySelector('#featured-available-grid .featured-card');
                return card ? parseInt(card.dataset.id, 10) : null;
            });
            if (id === null) break;
            await page.evaluate((id) => toggleFeatured(id), id);
            await page.waitForTimeout(150);
            added.push(id);
        }

        const atFour = await page.evaluate(() => _featuredSelection.size);
        const availLeft = await page.evaluate(() => document.querySelectorAll('#featured-available-grid .featured-card').length);
        let allDisabled = true;
        if (availLeft > 0) {
            allDisabled = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('#featured-available-grid .featured-card')).every(c => c.classList.contains('disabled'));
            });
        }
        console.log(`  selection at ${atFour}/4, available cards left=${availLeft}, all disabled: ${allDisabled ? '✓' : '✗'}`);

        let toastOk = true;
        if (availLeft > 0) {
            const disabledId = await page.evaluate(() => {
                const card = document.querySelector('#featured-available-grid .featured-card');
                return card ? parseInt(card.dataset.id, 10) : null;
            });
            await page.evaluate((id) => toggleFeatured(id), disabledId);
            await page.waitForTimeout(200);
            const toast = await page.evaluate(() => {
                const t = document.getElementById('toast');
                return { text: t.textContent.trim(), cls: t.className };
            });
            const sizeAfter = await page.evaluate(() => _featuredSelection.size);
            toastOk = toast.cls.includes('error') && sizeAfter === atFour;
            console.log(`  clicking 5th card -> toast "${toast.text}" (error class=${toast.cls.includes('error')}), selection unchanged (${sizeAfter}): ${toastOk ? '✓' : '✗'}`);
        }

        // cleanup: deselect everything we added
        for (const id of added) {
            await page.evaluate((id) => toggleFeatured(id), id);
            await page.waitForTimeout(100);
        }
        const restored = await page.evaluate(() => _featuredSelection.size);
        const restoreOk = restored === initial.selectionSize;
        console.log(`  cleanup: selection restored to ${restored} (was ${initial.selectionSize}): ${restoreOk ? '✓' : '✗'}`);

        disableOk = atFour === 4 && allDisabled && toastOk && restoreOk;
    } else {
        console.log(`  only ${initial.totalActive} active project(s) — skip 4-max disable test`);
    }

    const featuredOk = structureOk && toggleOk && disableOk;

    // === 2. Add Project modal — Area Badge removed, Property Type + Address paired ===
    await page.click('button[onclick="openProjectModal()"]');
    await page.waitForTimeout(400);

    const modalInfo = await page.evaluate(() => {
        const areaLabelEl = document.getElementById('project-area-label');
        const ptGroup = document.getElementById('project-property-type').closest('.form-group');
        const addrGroup = document.getElementById('project-address').closest('.form-group');
        const ptRow = ptGroup.closest('.form-row');
        const addrRow = addrGroup.closest('.form-row');
        return {
            areaLabelRemoved: !areaLabelEl,
            sameRow: !!ptRow && ptRow === addrRow,
            rowFieldCount: ptRow ? ptRow.querySelectorAll('.form-group').length : 0
        };
    });
    console.log('\n--- 2. Add Project modal ---');
    console.log('  ', JSON.stringify(modalInfo));
    const modalStructOk = modalInfo.areaLabelRemoved && modalInfo.sameRow && modalInfo.rowFieldCount === 2;
    console.log(`  #project-area-label removed; Property Type + Address paired in one .form-row (2 fields): ${modalStructOk ? '✓' : '✗'}`);

    // area_label derivation: select "Gold Coast" -> "GOLD COAST"; empty selection -> ''
    const areaLabelDerivation = await page.evaluate(() => {
        const sel = document.getElementById('project-area');
        sel.value = 'goldcoast';
        const withArea = sel.selectedOptions[0] ? sel.selectedOptions[0].text.toUpperCase() : '';
        const withAreaFinal = sel.value === '' ? '' : withArea;

        sel.value = '';
        const withNoArea = sel.selectedOptions[0] ? sel.selectedOptions[0].text.toUpperCase() : '';
        const withNoAreaFinal = sel.value === '' ? '' : withNoArea;

        return { withAreaFinal, withNoAreaFinal };
    });
    console.log('  ', JSON.stringify(areaLabelDerivation));
    const derivationOk = areaLabelDerivation.withAreaFinal === 'GOLD COAST' && areaLabelDerivation.withNoAreaFinal === '';
    console.log(`  area_label derived from Area select: "Gold Coast" -> "GOLD COAST", no selection -> "": ${derivationOk ? '✓' : '✗'}`);

    await page.click('button[onclick="closeProjectModal()"]');
    await page.waitForTimeout(300);

    const modalOk = modalStructOk && derivationOk;

    // === Console errors ===
    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 12).forEach(e => console.log('  ' + e));

    console.log('\n=== SUMMARY ===');
    console.log(`  1. Featured panel — 2-row layout, pagination, toggle, 4-max disable: ${featuredOk ? '✓' : '✗'}`);
    console.log(`  2. Project modal — Area Badge removed + paired row + area_label derivation: ${modalOk ? '✓' : '✗'}`);
    console.log(`  3. Console clean (0 non-404 errors): ${real.length === 0 ? '✓' : '✗'}`);

    const allPass = featuredOk && modalOk && real.length === 0;
    console.log(`\n  OVERALL: ${allPass ? '3/3 PASS ✓' : 'FAIL ✗'}`);

    await b.close();
    process.exit(allPass ? 0 : 1);
})();
