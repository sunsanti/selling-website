// v13 admin audit: about-stats moved to Dashboard (with live preview on /main),
// About tab gains Leadership (Director/Co-Founder), Our Services (3 cards),
// Our Team (6 members) editors — each with live preview on /about.
//
// NOTE: switchSection() re-fetches+rebuilds dynamic cards every time a nav
// item is clicked (even if already active), so each edit+save cycle below
// avoids re-clicking the same tab between filling a field and saving it.
const { chromium } = require('playwright');
const BASE = 'http://localhost:5500';

async function login(page) {
    await page.goto(BASE + '/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.click('button[type="submit"]')]);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
}

(async () => {
    const b = await chromium.launch({ headless: true });
    const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));

    await login(page);

    // === 1. Dashboard tab has About-Stats grid (4 inputs) + iframe → /main ===
    await page.click('[data-section="dashboard"]'); await page.waitForTimeout(1200);
    const dashStats = await page.$$eval('#about-stats-grid input[data-slot]', els => els.length);
    console.log(`\n--- Dashboard: About Stats ---`);
    console.log(`  #about-stats-grid inputs: ${dashStats}  ${dashStats === 8 ? '✓ (4 slots x 2 fields)' : '✗'}`);
    const dashIframe = await page.$eval('#preview-iframe-settings', el => el.src).catch(() => '');
    console.log(`  settings iframe → /main: ${dashIframe.includes('/main?preview=1') ? '✓' : '✗'}  (${dashIframe.slice(0,70)}…)`);

    // Capture originals for restore
    const origStat1 = await page.evaluate(() => ({
        num: document.querySelector('#about-stats-grid input[data-slot="1"][data-field="num"]').value,
        label: document.querySelector('#about-stats-grid input[data-slot="1"][data-field="label"]').value
    }));

    // === 2. Live preview: editing a stat in Dashboard reflects in /main's #about-stats-info ===
    await page.waitForTimeout(1000);
    const TEST_NUM = String(Date.now()).slice(-4);
    const TEST_LABEL = 'AUDIT STAT ' + Date.now();
    await page.fill('#about-stats-grid input[data-slot="1"][data-field="num"]', TEST_NUM);
    await page.fill('#about-stats-grid input[data-slot="1"][data-field="label"]', TEST_LABEL);
    await page.waitForTimeout(700);
    const settingsIframe = await page.$('#preview-iframe-settings');
    const statReflected = await settingsIframe?.contentFrame().then(f => f?.$$eval('#about-stats-info .block-num', els =>
        els.map(el => ({ num: el.querySelector('.content-num1')?.textContent.trim(), label: el.querySelector('.detail-content')?.textContent.trim() }))
    )).catch(() => null);
    const firstBlock = statReflected ? statReflected[0] : null;
    console.log(`\n--- Live preview: Dashboard stat → /main ---`);
    console.log(`  sent num="${TEST_NUM}" label="${TEST_LABEL.slice(0,20)}…"`);
    console.log(`  reflected: ${JSON.stringify(firstBlock)}`);
    const statMatch = firstBlock && firstBlock.num === TEST_NUM && firstBlock.label === TEST_LABEL;
    console.log(`  ${statMatch ? '✓ MATCH' : '✗ NO MATCH'}`);

    // === 2b. Save round-trip: Dashboard stats (same tab, no reload in between) ===
    await page.click('#home-about-form button[type="submit"]');
    await page.waitForTimeout(800);
    const statsPersisted = await page.evaluate(async () => {
        const r = await fetch('/api/public/about');
        const d = await r.json();
        return d.data.stats.find(s => s.slot === 1);
    });
    console.log('\n--- Save round-trip: Dashboard stats ---');
    console.log(`  persisted slot1: ${JSON.stringify(statsPersisted)}`);
    const statsSaved = statsPersisted && String(statsPersisted.num) === TEST_NUM && statsPersisted.label === TEST_LABEL;
    console.log(`  ${statsSaved ? '✓' : '✗'}`);

    // Restore stat1 (same tab, no reload)
    await page.fill('#about-stats-grid input[data-slot="1"][data-field="num"]', origStat1.num);
    await page.fill('#about-stats-grid input[data-slot="1"][data-field="label"]', origStat1.label);
    await page.click('#home-about-form button[type="submit"]');
    await page.waitForTimeout(600);

    // === 3. About tab — Leadership cards (Director/Co-Founder) ===
    await page.click('[data-section="home-about"]'); await page.waitForTimeout(1200);
    const leadershipCards = await page.$$eval('#about-leadership-cards .settings-panel', els =>
        els.map(el => ({ slot: el.dataset.slot, heading: el.querySelector('h2')?.textContent.trim(), name: el.querySelector('.al-name')?.value })));
    console.log('\n--- About tab: Leadership ---');
    leadershipCards.forEach(c => console.log(`  slot ${c.slot}: "${c.heading}"  name="${c.name}"`));
    const leadershipOk = leadershipCards.length === 2 &&
        /director/i.test(leadershipCards.find(c => c.slot === '1')?.heading || '') &&
        /co-founder/i.test(leadershipCards.find(c => c.slot === '2')?.heading || '');
    console.log(`  Director/Co-Founder cards present: ${leadershipOk ? '✓' : '✗'}`);
    const origDirector = leadershipCards.find(c => c.slot === '1')?.name || '';

    // === 4. About tab — Our Services (3 cards: icon select + title + desc) ===
    const serviceCards = await page.$$eval('#about-services-cards .settings-panel', els =>
        els.map(el => ({ slot: el.dataset.slot, icon: el.querySelector('.as-icon')?.value, title: el.querySelector('.as-title')?.value, desc: el.querySelector('.as-desc')?.value })));
    console.log('\n--- About tab: Our Services ---');
    serviceCards.forEach(c => console.log(`  slot ${c.slot}: icon=${c.icon}  title="${c.title}"  desc="${c.desc.slice(0,30)}…"`));
    console.log(`  3 service cards present: ${serviceCards.length === 3 ? '✓' : '✗'}`);
    const origSvc1 = serviceCards.find(c => c.slot === '1');

    // === 5. About tab — Our Team (6 cards: name/role/avatar) ===
    const teamCards = await page.$$eval('#about-team-cards .settings-panel', els =>
        els.map(el => ({ slot: el.dataset.slot, name: el.querySelector('.at-name')?.value, role: el.querySelector('.at-role')?.value })));
    console.log('\n--- About tab: Our Team ---');
    teamCards.forEach(c => console.log(`  slot ${c.slot}: "${c.name}" — ${c.role}`));
    console.log(`  6 team cards present: ${teamCards.length === 6 ? '✓' : '✗'}`);
    const origMember1 = teamCards.find(c => c.slot === '1');

    // iframe → /about
    const aboutIframe = await page.$eval('#preview-iframe-about', el => el.src);
    const pointsToAbout = aboutIframe.includes('/about?preview=1');
    console.log(`\nAbout preview iframe → /about: ${pointsToAbout ? '✓' : '✗'}  (${aboutIframe.slice(0,70)}…)`);
    await page.waitForTimeout(1200);
    const aboutIfr = await page.$('#preview-iframe-about');

    // === 6. Leadership: live preview + save round-trip ===
    const TEST_DIRECTOR = 'Audit Director ' + Date.now();
    await page.fill('#about-leadership-cards .settings-panel[data-slot="1"] .al-name', TEST_DIRECTOR);
    await page.waitForTimeout(700);
    const leadershipReflected = await aboutIfr?.contentFrame().then(f => f?.$eval('#about-leadership .leadership-name', el => el.textContent.trim())).catch(() => null);
    console.log('\n--- Live preview: Leadership name → /about ---');
    console.log(`  sent: "${TEST_DIRECTOR}"`);
    console.log(`  reflected: "${leadershipReflected}"  ${leadershipReflected === TEST_DIRECTOR ? '✓' : '✗'}`);

    await page.click('#about-leadership-cards .settings-panel[data-slot="1"] .al-save-btn');
    await page.waitForTimeout(800);
    const leaderPersisted = await page.evaluate(async () => {
        const r = await fetch('/api/public/footer-persons');
        const d = await r.json();
        return d.data.find(p => p.slot === 1)?.name;
    });
    console.log('\n--- Save round-trip: Leadership (Director) ---');
    console.log(`  persisted: "${leaderPersisted}"  ${leaderPersisted === TEST_DIRECTOR ? '✓' : '✗'}`);

    // Restore Director (same tab, no reload)
    await page.fill('#about-leadership-cards .settings-panel[data-slot="1"] .al-name', origDirector);
    await page.click('#about-leadership-cards .settings-panel[data-slot="1"] .al-save-btn');
    await page.waitForTimeout(600);

    // === 7. Team: live preview + save round-trip ===
    const TEST_MEMBER_NAME = 'Audit Member ' + Date.now();
    const TEST_MEMBER_ROLE = 'Audit Role';
    await page.fill('#about-team-cards .settings-panel[data-slot="1"] .at-name', TEST_MEMBER_NAME);
    await page.fill('#about-team-cards .settings-panel[data-slot="1"] .at-role', TEST_MEMBER_ROLE);
    await page.waitForTimeout(700);
    const teamReflected = await aboutIfr?.contentFrame().then(f => f?.$eval('#about-team-grid .team-member', el => ({
        name: el.querySelector('h4')?.textContent.trim(), role: el.querySelector('p')?.textContent.trim()
    }))).catch(() => null);
    console.log('\n--- Live preview: Team member → /about ---');
    console.log(`  sent: name="${TEST_MEMBER_NAME}" role="${TEST_MEMBER_ROLE}"`);
    console.log(`  reflected: ${JSON.stringify(teamReflected)}`);
    const teamMatch = teamReflected && teamReflected.name === TEST_MEMBER_NAME && teamReflected.role === TEST_MEMBER_ROLE;
    console.log(`  ${teamMatch ? '✓ MATCH' : '✗ NO MATCH'}`);

    await page.click('#about-team-cards .settings-panel[data-slot="1"] .at-save-btn');
    await page.waitForTimeout(800);
    const teamPersisted = await page.evaluate(async () => {
        const r = await fetch('/api/public/team');
        const d = await r.json();
        const m = d.data.find(t => t.slot === 1);
        return { name: m.name, role: m.role };
    });
    console.log('\n--- Save round-trip: Team member 1 ---');
    console.log(`  persisted: ${JSON.stringify(teamPersisted)}`);
    const teamSaved = teamPersisted.name === TEST_MEMBER_NAME && teamPersisted.role === TEST_MEMBER_ROLE;
    console.log(`  ${teamSaved ? '✓' : '✗'}`);

    // Restore team member 1 (same tab, no reload)
    await page.fill('#about-team-cards .settings-panel[data-slot="1"] .at-name', origMember1.name);
    await page.fill('#about-team-cards .settings-panel[data-slot="1"] .at-role', origMember1.role);
    await page.click('#about-team-cards .settings-panel[data-slot="1"] .at-save-btn');
    await page.waitForTimeout(600);

    // === 8. Services: live preview + save round-trip ===
    const TEST_SVC_TITLE = 'Audit Service ' + Date.now();
    const TEST_SVC_DESC = 'Audit service description text.';
    await page.fill('#about-services-cards .settings-panel[data-slot="1"] .as-title', TEST_SVC_TITLE);
    await page.fill('#about-services-cards .settings-panel[data-slot="1"] .as-desc', TEST_SVC_DESC);
    await page.waitForTimeout(700);
    const svcReflected = await aboutIfr?.contentFrame().then(f => f?.$eval('#about-services-grid .about-service-card', el => ({
        title: el.querySelector('h3')?.textContent.trim(), desc: el.querySelector('p')?.textContent.trim()
    }))).catch(() => null);
    console.log('\n--- Live preview: Service → /about ---');
    console.log(`  sent: title="${TEST_SVC_TITLE}" desc="${TEST_SVC_DESC}"`);
    console.log(`  reflected: ${JSON.stringify(svcReflected)}`);
    const svcMatch = svcReflected && svcReflected.title === TEST_SVC_TITLE && svcReflected.desc === TEST_SVC_DESC;
    console.log(`  ${svcMatch ? '✓ MATCH' : '✗ NO MATCH'}`);

    await page.click('#about-services-form button[type="submit"]');
    await page.waitForTimeout(800);
    const svcPersisted = await page.evaluate(async () => {
        const r = await fetch('/api/public/settings');
        const d = await r.json();
        return { title: d.data.about_service_1_title, desc: d.data.about_service_1_desc };
    });
    console.log('\n--- Save round-trip: Service 1 ---');
    console.log(`  persisted: ${JSON.stringify(svcPersisted)}`);
    const svcSaved = svcPersisted.title === TEST_SVC_TITLE && svcPersisted.desc === TEST_SVC_DESC;
    console.log(`  ${svcSaved ? '✓' : '✗'}`);

    // Restore service 1 (same tab, no reload)
    await page.fill('#about-services-cards .settings-panel[data-slot="1"] .as-title', origSvc1.title);
    await page.fill('#about-services-cards .settings-panel[data-slot="1"] .as-desc', origSvc1.desc);
    await page.click('#about-services-form button[type="submit"]');
    await page.waitForTimeout(600);

    const real = errs.filter(t => !/Failed to load resource/i.test(t));
    console.log('\nconsole errors (non-404):', real.length);
    if (real.length) real.slice(0, 8).forEach(e => console.log('  ' + e));

    console.log('\n=== SUMMARY ===');
    console.log(`  Dashboard has About-Stats grid (8 inputs):  ${dashStats === 8 ? '✓' : '✗'}`);
    console.log(`  Settings iframe → /main:                    ${dashIframe.includes('/main?preview=1') ? '✓' : '✗'}`);
    console.log(`  Live preview: stat → /main:                 ${statMatch ? '✓' : '✗'}`);
    console.log(`  Save round-trip: Dashboard stats:           ${statsSaved ? '✓' : '✗'}`);
    console.log(`  About tab: Director/Co-Founder cards:       ${leadershipOk ? '✓' : '✗'}`);
    console.log(`  About tab: 3 Service cards:                 ${serviceCards.length === 3 ? '✓' : '✗'}`);
    console.log(`  About tab: 6 Team cards:                    ${teamCards.length === 6 ? '✓' : '✗'}`);
    console.log(`  About iframe → /about:                      ${pointsToAbout ? '✓' : '✗'}`);
    console.log(`  Live preview: leadership name → /about:     ${leadershipReflected === TEST_DIRECTOR ? '✓' : '✗'}`);
    console.log(`  Save round-trip: Leadership:                ${leaderPersisted === TEST_DIRECTOR ? '✓' : '✗'}`);
    console.log(`  Live preview: team member → /about:         ${teamMatch ? '✓' : '✗'}`);
    console.log(`  Save round-trip: Team:                      ${teamSaved ? '✓' : '✗'}`);
    console.log(`  Live preview: service → /about:             ${svcMatch ? '✓' : '✗'}`);
    console.log(`  Save round-trip: Services:                  ${svcSaved ? '✓' : '✗'}`);
    console.log(`  Console clean:                              ${real.length === 0 ? '✓' : '✗'}`);

    await b.close();
})();
