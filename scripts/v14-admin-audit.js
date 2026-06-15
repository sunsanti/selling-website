// v14 admin audit:
//  1. Dashboard "About Stats" grid visible on initial load (no tab click)
//  2. About tab layout — section dividers render full-width (not scrambled grid cells)
//  3. Leadership (Director/Co-Founder) avatar picker — preview + pick + remove + save round-trip
//  4. Our Team avatar picker — media library only (no raw path/url input) + save round-trip
//  5. Dashboard "Why Invest in Australia" content editor — live preview on /main + save round-trip
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

    // === 1. Initial load (NO tab click) — Dashboard is default-active ===
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const dashStatsOnLoad = await page.$$eval('#about-stats-grid input[data-slot]', els => els.length);
    console.log('\n--- 1. Dashboard on initial load (no tab click) ---');
    console.log(`  #about-stats-grid inputs: ${dashStatsOnLoad}  ${dashStatsOnLoad === 8 ? '✓' : '✗'}`);

    // === 2. About tab layout — dividers full width ===
    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(1500);
    const dividerWidths = await page.$$eval('#home-about .form-section-divider', els =>
        els.map(el => ({ text: el.textContent.trim(), width: el.getBoundingClientRect().width })));
    const formWidth = await page.$eval('#about-content-form', el => el.getBoundingClientRect().width).catch(() => 0);
    console.log('\n--- 2. About tab — section dividers full-width ---');
    dividerWidths.forEach(d => console.log(`  "${d.text.slice(0, 40)}" width=${Math.round(d.width)} (form width ~${Math.round(formWidth)})`));
    const dividersFullWidth = dividerWidths.length > 0 && dividerWidths.every(d => d.width > formWidth * 0.9);
    console.log(`  All dividers ~full width: ${dividersFullWidth ? '✓' : '✗'}`);

    // === 3. Leadership — avatar picker present ===
    const leadershipAvatars = await page.$$eval('#about-leadership-cards .settings-panel', els =>
        els.map(el => ({
            slot: el.dataset.slot,
            heading: el.querySelector('h2')?.textContent.trim(),
            hasPicker: !!el.querySelector('.avatar-pick-btn'),
            hasPreview: !!el.querySelector('.settings-avatar-preview')
        })));
    console.log('\n--- 3. About tab — Leadership avatar pickers ---');
    leadershipAvatars.forEach(c => console.log(`  slot ${c.slot} "${c.heading}": picker=${c.hasPicker} preview=${c.hasPreview}`));
    const leadershipAvatarsOk = leadershipAvatars.length === 2 && leadershipAvatars.every(c => c.hasPicker && c.hasPreview);
    console.log(`  Both Director & Co-Founder have avatar picker: ${leadershipAvatarsOk ? '✓' : '✗'}`);

    // Director avatar pick + save round-trip via media library
    const directorCard = page.locator('#about-leadership-cards .settings-panel[data-slot="1"]');
    await directorCard.locator('.avatar-pick-btn').click();
    await page.waitForTimeout(800);
    const mlImages = page.locator('#media-grid .media-item');
    const mlCount = await mlImages.count();
    let directorAvatarSaved = false;
    let directorAvatarPath = '';
    if (mlCount > 0) {
        await mlImages.first().click();
        await page.click('#media-confirm-btn');
        await page.waitForTimeout(500);
        directorAvatarPath = await directorCard.evaluate(el => el.dataset.avatarPath || '');
        await directorCard.locator('.al-save-btn').click();
        await page.waitForTimeout(800);
        const persisted = await page.evaluate(async () => {
            const r = await fetch('/api/public/footer-persons');
            const d = await r.json();
            return d.data.find(p => p.slot === 1)?.avatar_path || '';
        });
        directorAvatarSaved = !!persisted && persisted === directorAvatarPath;
        console.log(`\n--- Director avatar: picked="${directorAvatarPath}" persisted="${persisted}"  ${directorAvatarSaved ? '✓' : '✗'}`);
    } else {
        console.log('\n--- Director avatar: media library empty, skipping pick test ---');
    }

    // === 4. Our Team — no raw path/url input, has media library picker ===
    const teamCards = await page.$$eval('#about-team-cards .settings-panel', els =>
        els.map(el => ({
            slot: el.dataset.slot,
            hasOldInput: !!el.querySelector('.at-avatar'),
            hasPicker: !!el.querySelector('.avatar-pick-btn')
        })));
    console.log('\n--- 4. About tab — Our Team avatar fields ---');
    teamCards.forEach(c => console.log(`  slot ${c.slot}: old text input=${c.hasOldInput}  media-library picker=${c.hasPicker}`));
    const teamOk = teamCards.length === 6 && teamCards.every(c => !c.hasOldInput && c.hasPicker);
    console.log(`  6 team cards, all use media-library picker (no raw input): ${teamOk ? '✓' : '✗'}`);

    // Team member 1 avatar pick + save round-trip
    const member1Card = page.locator('#about-team-cards .settings-panel[data-slot="1"]');
    await member1Card.locator('.avatar-pick-btn').click();
    await page.waitForTimeout(800);
    let teamAvatarSaved = false;
    let teamAvatarPath = '';
    const mlCount2 = await mlImages.count();
    if (mlCount2 > 0) {
        await mlImages.first().click();
        await page.click('#media-confirm-btn');
        await page.waitForTimeout(500);
        teamAvatarPath = await member1Card.evaluate(el => el.dataset.avatarPath || '');
        await member1Card.locator('.at-save-btn').click();
        await page.waitForTimeout(800);
        const persisted = await page.evaluate(async () => {
            const r = await fetch('/api/public/team');
            const d = await r.json();
            return d.data.find(t => t.slot === 1)?.avatar_path || '';
        });
        teamAvatarSaved = !!persisted && persisted === teamAvatarPath;
        console.log(`\n--- Team member 1 avatar: picked="${teamAvatarPath}" persisted="${persisted}"  ${teamAvatarSaved ? '✓' : '✗'}`);
    } else {
        console.log('\n--- Team member 1 avatar: media library empty, skipping pick test ---');
    }

    // === 5. Dashboard — "Why Invest in Australia" content editor ===
    await page.click('[data-section="dashboard"]');
    await page.waitForTimeout(1800);

    const purposeFields = await page.evaluate(() => ({
        tagline: document.getElementById('setting-purpose-tagline')?.value,
        heading: document.getElementById('setting-purpose-heading')?.value,
        list1: document.getElementById('setting-purpose-list-1')?.value,
        list4: document.getElementById('setting-purpose-list-4')?.value,
        cta: document.getElementById('setting-purpose-cta-text')?.value,
        caption: document.getElementById('setting-purpose-video-caption')?.value
    }));
    console.log('\n--- 5. Dashboard — "Why Invest in Australia" fields populated ---');
    console.log('  ' + JSON.stringify(purposeFields));
    const fieldsPopulated = Object.values(purposeFields).every(v => !!v);
    console.log(`  All fields populated from DB: ${fieldsPopulated ? '✓' : '✗'}`);

    // Live preview: edit tagline → reflected in /main settings-scope iframe
    await page.waitForTimeout(800);
    const TEST_TAGLINE = 'AUDIT INVEST TAGLINE ' + Date.now();
    await page.fill('#setting-purpose-tagline', TEST_TAGLINE);
    await page.waitForTimeout(700);
    const settingsIframe = await page.$('#preview-iframe-settings');
    const purposeVisible = await settingsIframe?.contentFrame().then(f => f?.$eval('#purpose-invest', el => getComputedStyle(el).display)).catch(() => null);
    const taglineReflected = await settingsIframe?.contentFrame().then(f => f?.$eval('#purpose-tagline-text', el => el.textContent.trim())).catch(() => null);
    console.log('\n--- Live preview: #purpose-invest visible in settings scope ---');
    console.log(`  display: ${purposeVisible}  ${purposeVisible && purposeVisible !== 'none' ? '✓' : '✗'}`);
    console.log(`  tagline sent="${TEST_TAGLINE}" reflected="${taglineReflected}"  ${taglineReflected === TEST_TAGLINE ? '✓' : '✗'}`);

    // Save round-trip
    const origTagline = purposeFields.tagline;
    await page.click('#settings-form button[type="submit"]');
    await page.waitForTimeout(800);
    const persistedTagline = await page.evaluate(async () => {
        const r = await fetch('/api/public/settings');
        const d = await r.json();
        return d.data.purpose_tagline;
    });
    console.log('\n--- Save round-trip: purpose_tagline ---');
    console.log(`  persisted: "${persistedTagline}"  ${persistedTagline === TEST_TAGLINE ? '✓' : '✗'}`);

    // Restore
    await page.fill('#setting-purpose-tagline', origTagline);
    await page.click('#settings-form button[type="submit"]');
    await page.waitForTimeout(600);

    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 8).forEach(e => console.log('  ' + e));

    console.log('\n=== SUMMARY ===');
    console.log(`  1. Dashboard about-stats visible on initial load: ${dashStatsOnLoad === 8 ? '✓' : '✗'}`);
    console.log(`  2. About tab dividers full-width:                 ${dividersFullWidth ? '✓' : '✗'}`);
    console.log(`  3. Leadership avatar pickers present:             ${leadershipAvatarsOk ? '✓' : '✗'}`);
    console.log(`     Director avatar save round-trip:               ${directorAvatarSaved ? '✓' : (mlCount === 0 ? 'SKIP' : '✗')}`);
    console.log(`  4. Team avatar via media library (no raw input):  ${teamOk ? '✓' : '✗'}`);
    console.log(`     Team member 1 avatar save round-trip:          ${teamAvatarSaved ? '✓' : (mlCount2 === 0 ? 'SKIP' : '✗')}`);
    console.log(`  5. Invest section fields populated:               ${fieldsPopulated ? '✓' : '✗'}`);
    console.log(`     #purpose-invest visible in settings preview:   ${purposeVisible && purposeVisible !== 'none' ? '✓' : '✗'}`);
    console.log(`     Live preview tagline reflected:                ${taglineReflected === TEST_TAGLINE ? '✓' : '✗'}`);
    console.log(`     Save round-trip purpose_tagline:               ${persistedTagline === TEST_TAGLINE ? '✓' : '✗'}`);
    console.log(`  Console clean:                                    ${real.length === 0 ? '✓' : '✗'}`);

    await b.close();
})();
