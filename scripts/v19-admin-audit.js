// v19 admin audit:
//  A1. Area select is required; area_label derives directly from selected option text (no empty-ternary)
//  A2. Price field is number-only; parsePriceNumber/formatPriceFromNumber round-trip "From $X,XXX"
//  B.  Media Library accepts video uploads (accept attr incl. video/mp4); Invest tab Video field
//      is now a Media Library picker (#purpose-video-pick-btn, #current-purpose-video), no raw URL input
//  C.  Videos & News tabs: "Display Order" removed (from modal + table), replaced with
//      Featured-on-Homepage panels (#featured-videos-*, #featured-news-*) mirroring Projects' pattern
//  0 console errors across Projects / Videos / News / Invest tabs
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

    // === A1 + A2: Add Project modal — Area required + Price number-only/format helpers ===
    await page.click('[data-section="projects"]');
    await page.waitForTimeout(800);
    await page.click('button[onclick="openProjectModal()"]');
    await page.waitForTimeout(400);

    const a1 = await page.evaluate(() => {
        const sel = document.getElementById('project-area');
        sel.value = 'goldcoast';
        const areaLabel = sel.selectedOptions[0] ? sel.selectedOptions[0].text.toUpperCase() : '';
        return { required: sel.required, areaLabel };
    });
    console.log('\n--- A1. Area select required + area_label derivation ---');
    console.log('  ', JSON.stringify(a1));
    const a1Ok = a1.required === true && a1.areaLabel === 'GOLD COAST';
    console.log(`  #project-area required=true, area_label("Gold Coast")="GOLD COAST": ${a1Ok ? '✓' : '✗'}`);

    const a2 = await page.evaluate(() => {
        const priceInput = document.getElementById('project-price');
        const formatted = formatPriceFromNumber('699000');
        const parsedBack = parsePriceNumber(formatted);
        const emptyFormatted = formatPriceFromNumber('');
        return { type: priceInput.type, formatted, parsedBack, emptyFormatted };
    });
    console.log('\n--- A2. Price field number-only + auto-format ---');
    console.log('  ', JSON.stringify(a2));
    const a2Ok = a2.type === 'number' && a2.formatted === 'From $699,000' && a2.parsedBack === '699000' && a2.emptyFormatted === '';
    console.log(`  #project-price type=number, "699000" -> "From $699,000" -> "699000", "" -> "": ${a2Ok ? '✓' : '✗'}`);

    await page.click('button[onclick="closeProjectModal()"]');
    await page.waitForTimeout(300);

    // === B: Media Library accepts video + Invest tab video picker ===
    await page.click('[data-section="invest"]');
    await page.waitForTimeout(800);

    const b1 = await page.evaluate(() => {
        const input = document.getElementById('media-upload-input');
        return {
            hasInput: !!input,
            accept: input ? input.accept : '',
            hasUrlInput: !!document.getElementById('setting-purpose-video-url'),
            hasPickBtn: !!document.getElementById('purpose-video-pick-btn'),
            hasVideoEl: !!document.getElementById('current-purpose-video'),
            hasRemoveBtn: !!document.getElementById('purpose-video-remove-btn'),
            removeFnExists: typeof removePurposeVideo === 'function'
        };
    });
    console.log('\n--- B. Media Library video upload + Invest video picker ---');
    console.log('  ', JSON.stringify(b1));
    const bOk = b1.hasInput && /video\/mp4/i.test(b1.accept) && !b1.hasUrlInput &&
        b1.hasPickBtn && b1.hasVideoEl && b1.hasRemoveBtn && b1.removeFnExists;
    console.log(`  #media-upload-input accepts video/mp4; raw URL input removed; picker+preview+remove present: ${bOk ? '✓' : '✗'}`);

    // === C: Videos tab — Display Order removed + Featured panel ===
    await page.click('[data-section="videos"]');
    await page.waitForTimeout(1200);

    const videosStruct = await page.evaluate(() => {
        const theadCells = Array.from(document.querySelectorAll('#videos .data-table thead th')).map(th => th.textContent.trim());
        return {
            theadCells,
            hasOrderInModal: !!document.getElementById('video-order'),
            hasFeaturedSel: !!document.getElementById('featured-videos-selected-grid'),
            hasFeaturedAvail: !!document.getElementById('featured-videos-available-grid'),
            hasFeaturedPag: !!document.getElementById('featured-videos-pagination'),
            counterText: document.getElementById('featured-videos-counter') ? document.getElementById('featured-videos-counter').textContent.trim() : null,
            selectionSize: typeof _featuredVideosSelection !== 'undefined' ? _featuredVideosSelection.size : -1,
            totalActive: typeof _featuredVideosAllActive !== 'undefined' ? _featuredVideosAllActive.length : -1
        };
    });
    console.log('\n--- C. Videos tab — Display Order removed, Featured panel ---');
    console.log('  ', JSON.stringify(videosStruct));
    const videosOk = !videosStruct.theadCells.includes('Order') && !videosStruct.hasOrderInModal &&
        videosStruct.hasFeaturedSel && videosStruct.hasFeaturedAvail && videosStruct.hasFeaturedPag &&
        videosStruct.counterText === `${videosStruct.selectionSize} / 4 selected`;
    console.log(`  "Order" column + #video-order removed; featured panel present + counter correct: ${videosOk ? '✓' : '✗'}`);

    // toggle a video card and verify it moves between rows
    let videoToggleOk = true;
    if (videosStruct.totalActive > 0) {
        const firstId = await page.evaluate(() => {
            const card = document.querySelector('#featured-videos-selected-grid .featured-card, #featured-videos-available-grid .featured-card');
            return card ? parseInt(card.dataset.id, 10) : null;
        });
        const before = await page.evaluate((id) => ({
            inSel: !!document.querySelector(`#featured-videos-selected-grid .featured-card[data-id="${id}"]`)
        }), firstId);
        await page.evaluate((id) => toggleFeaturedVideo(id), firstId);
        await page.waitForTimeout(200);
        const after = await page.evaluate((id) => ({
            inSel: !!document.querySelector(`#featured-videos-selected-grid .featured-card[data-id="${id}"]`)
        }), firstId);
        videoToggleOk = before.inSel !== after.inSel;
        console.log(`  toggle video #${firstId}: in selected row ${before.inSel} -> ${after.inSel}: ${videoToggleOk ? '✓' : '✗'}`);

        // persist + verify public endpoint reflects the new selection
        await page.evaluate(() => saveFeaturedVideos());
        await page.waitForTimeout(300);
        const pubAfterSave = await page.evaluate(() => fetch('/api/public/videos/featured').then(r => r.json()));
        const persistOk = pubAfterSave.success && pubAfterSave.data.some(v => v.id === firstId);
        console.log(`  saveFeaturedVideos() -> /api/public/videos/featured includes #${firstId}: ${persistOk ? '✓' : '✗'}`);

        // toggle back + persist restore to original (empty) selection
        await page.evaluate((id) => toggleFeaturedVideo(id), firstId);
        await page.evaluate(() => saveFeaturedVideos());
        await page.waitForTimeout(300);
        const pubAfterRestore = await page.evaluate(() => fetch('/api/public/videos/featured').then(r => r.json()));
        const restoreOk = pubAfterRestore.success && pubAfterRestore.data.length === 0;
        console.log(`  restore selection -> /api/public/videos/featured empty again: ${restoreOk ? '✓' : '✗'}`);

        videoToggleOk = videoToggleOk && persistOk && restoreOk;
    } else {
        console.log('  no active videos — skip toggle test');
    }

    // === C: News tab — Display Order removed + Featured panel ===
    await page.click('[data-section="news"]');
    await page.waitForTimeout(1200);

    const newsStruct = await page.evaluate(() => {
        const theadCells = Array.from(document.querySelectorAll('#news .data-table thead th')).map(th => th.textContent.trim());
        return {
            theadCells,
            hasOrderInModal: !!document.getElementById('news-form-order'),
            hasFeaturedSel: !!document.getElementById('featured-news-selected-grid'),
            hasFeaturedAvail: !!document.getElementById('featured-news-available-grid'),
            hasFeaturedPag: !!document.getElementById('featured-news-pagination'),
            counterText: document.getElementById('featured-news-counter') ? document.getElementById('featured-news-counter').textContent.trim() : null,
            selectionSize: typeof _featuredNewsSelection !== 'undefined' ? _featuredNewsSelection.size : -1,
            totalActive: typeof _featuredNewsAllActive !== 'undefined' ? _featuredNewsAllActive.length : -1
        };
    });
    console.log('\n--- C. News tab — Display Order removed, Featured panel ---');
    console.log('  ', JSON.stringify(newsStruct));
    const newsOk = !newsStruct.theadCells.includes('Order') && !newsStruct.hasOrderInModal &&
        newsStruct.hasFeaturedSel && newsStruct.hasFeaturedAvail && newsStruct.hasFeaturedPag &&
        newsStruct.counterText === `${newsStruct.selectionSize} / 4 selected`;
    console.log(`  "Order" column + #news-form-order removed; featured panel present + counter correct: ${newsOk ? '✓' : '✗'}`);

    let newsToggleOk = true;
    if (newsStruct.totalActive > 0) {
        const firstId = await page.evaluate(() => {
            const card = document.querySelector('#featured-news-selected-grid .featured-card, #featured-news-available-grid .featured-card');
            return card ? parseInt(card.dataset.id, 10) : null;
        });
        const before = await page.evaluate((id) => ({
            inSel: !!document.querySelector(`#featured-news-selected-grid .featured-card[data-id="${id}"]`)
        }), firstId);
        await page.evaluate((id) => toggleFeaturedNews(id), firstId);
        await page.waitForTimeout(200);
        const after = await page.evaluate((id) => ({
            inSel: !!document.querySelector(`#featured-news-selected-grid .featured-card[data-id="${id}"]`)
        }), firstId);
        newsToggleOk = before.inSel !== after.inSel;
        console.log(`  toggle news #${firstId}: in selected row ${before.inSel} -> ${after.inSel}: ${newsToggleOk ? '✓' : '✗'}`);

        // persist + verify public endpoint reflects the new selection
        await page.evaluate(() => saveFeaturedNews());
        await page.waitForTimeout(300);
        const pubAfterSave = await page.evaluate(() => fetch('/api/public/news/featured').then(r => r.json()));
        const persistOk = pubAfterSave.success && pubAfterSave.data.some(n => n.id === firstId);
        console.log(`  saveFeaturedNews() -> /api/public/news/featured includes #${firstId}: ${persistOk ? '✓' : '✗'}`);

        // toggle back + persist restore to original (empty) selection
        await page.evaluate((id) => toggleFeaturedNews(id), firstId);
        await page.evaluate(() => saveFeaturedNews());
        await page.waitForTimeout(300);
        const pubAfterRestore = await page.evaluate(() => fetch('/api/public/news/featured').then(r => r.json()));
        const restoreOk = pubAfterRestore.success && pubAfterRestore.data.length === 0;
        console.log(`  restore selection -> /api/public/news/featured empty again: ${restoreOk ? '✓' : '✗'}`);

        newsToggleOk = newsToggleOk && persistOk && restoreOk;
    } else {
        console.log('  no active news — skip toggle test');
    }

    // === Console errors ===
    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 12).forEach(e => console.log('  ' + e));

    console.log('\n=== SUMMARY ===');
    console.log(`  A1. Area required + area_label derivation: ${a1Ok ? '✓' : '✗'}`);
    console.log(`  A2. Price number-only + auto-format round-trip: ${a2Ok ? '✓' : '✗'}`);
    console.log(`  B.  Media Library video upload + Invest video picker: ${bOk ? '✓' : '✗'}`);
    console.log(`  C1. Videos — Order removed + Featured panel + toggle: ${(videosOk && videoToggleOk) ? '✓' : '✗'}`);
    console.log(`  C2. News — Order removed + Featured panel + toggle: ${(newsOk && newsToggleOk) ? '✓' : '✗'}`);
    console.log(`  D.  Console clean (0 non-404 errors): ${real.length === 0 ? '✓' : '✗'}`);

    const allPass = a1Ok && a2Ok && bOk && videosOk && videoToggleOk && newsOk && newsToggleOk && real.length === 0;
    console.log(`\n  OVERALL: ${allPass ? '6/6 PASS ✓' : 'FAIL ✗'}`);

    await b.close();
    process.exit(allPass ? 0 : 1);
})();
