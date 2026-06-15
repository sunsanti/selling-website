// v22: Our Team dynamic add/remove — verify admin can add a new team member,
// edit it, see it reflected on /about, then remove it and the page returns
// to its original state. Also checks for 0 console errors.
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

    const consoleErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    let allOk = true;

    await login(page);
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(600);
    await page.click('[data-subtab="about-team"]');
    await page.waitForTimeout(300);

    // ===== Baseline =====
    const before = await page.evaluate(() => fetch('/api/admin/team').then(r => r.json()));
    const beforeCount = before.data.length;
    console.log('baseline team members:', beforeCount);

    const cardsBefore = await page.locator('#about-team-cards > .office-card-admin').count();
    console.log('admin cards before:', cardsBefore, cardsBefore === beforeCount ? '✓' : '✗');
    allOk = allOk && (cardsBefore === beforeCount);

    // ===== Add member =====
    await page.click('button[onclick="addAboutTeamMember()"]');
    await page.waitForTimeout(600);

    const cardsAfterAdd = await page.locator('#about-team-cards > .office-card-admin').count();
    console.log('admin cards after add:', cardsAfterAdd, cardsAfterAdd === beforeCount + 1 ? '✓' : '✗');
    allOk = allOk && (cardsAfterAdd === beforeCount + 1);

    // Fill in the new (last) card
    const newCard = page.locator('#about-team-cards > .office-card-admin').last();
    await newCard.locator('.at-name').fill('Playwright Test');
    await newCard.locator('.at-role').fill('QA Tester');
    await newCard.locator('.at-save-btn').click();
    await page.waitForTimeout(500);

    const afterSave = await page.evaluate(() => fetch('/api/admin/team').then(r => r.json()));
    const newMember = afterSave.data.find(m => m.name === 'Playwright Test' && m.role === 'QA Tester');
    console.log('new member saved:', newMember ? `id=${newMember.id} ✓` : '✗');
    allOk = allOk && !!newMember;

    // ===== /about reflects the new member =====
    await page.goto(BASE + '/about', { waitUntil: 'networkidle' });
    await page.evaluate(() => { const p = document.getElementById('fill-popup'); if (p) p.style.display = 'none'; });
    await page.waitForTimeout(500);

    const teamMembersAfterAdd = await page.locator('#about-team-grid .team-member').count();
    console.log('/about team members after add:', teamMembersAfterAdd, teamMembersAfterAdd === beforeCount + 1 ? '✓' : '✗');
    allOk = allOk && (teamMembersAfterAdd === beforeCount + 1);

    const newMemberOnPage = await page.locator('#about-team-grid .team-member h4', { hasText: 'Playwright Test' }).count();
    console.log('new member visible on /about:', newMemberOnPage === 1 ? '✓' : '✗');
    allOk = allOk && (newMemberOnPage === 1);

    // ===== Remove the new member =====
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.click('[data-section="home-about"]');
    await page.waitForTimeout(600);
    await page.click('[data-subtab="about-team"]');
    await page.waitForTimeout(300);

    const cardToRemove = page.locator(`#about-team-cards > .office-card-admin[data-id="${newMember.id}"]`);
    await cardToRemove.locator('.ao-remove').click();
    await page.waitForTimeout(300);
    await page.click('#confirm-btn');
    await page.waitForTimeout(600);

    const afterRemove = await page.evaluate(() => fetch('/api/admin/team').then(r => r.json()));
    console.log('team members after remove:', afterRemove.data.length, afterRemove.data.length === beforeCount ? '✓' : '✗');
    allOk = allOk && (afterRemove.data.length === beforeCount);

    const cardsAfterRemove = await page.locator('#about-team-cards > .office-card-admin').count();
    console.log('admin cards after remove:', cardsAfterRemove, cardsAfterRemove === beforeCount ? '✓' : '✗');
    allOk = allOk && (cardsAfterRemove === beforeCount);

    // ===== /about restored =====
    await page.goto(BASE + '/about', { waitUntil: 'networkidle' });
    await page.evaluate(() => { const p = document.getElementById('fill-popup'); if (p) p.style.display = 'none'; });
    await page.waitForTimeout(500);

    const teamMembersRestored = await page.locator('#about-team-grid .team-member').count();
    console.log('/about team members restored:', teamMembersRestored, teamMembersRestored === beforeCount ? '✓' : '✗');
    allOk = allOk && (teamMembersRestored === beforeCount);

    console.log('console errors:', consoleErrors.length === 0 ? '0 ✓' : consoleErrors.join('\n'));
    allOk = allOk && (consoleErrors.length === 0);

    console.log(`\n=== OVERALL: ${allOk ? 'PASS ✓' : 'FAIL ✗'} ===`);
    await b.close();
    process.exit(allOk ? 0 : 1);
})();
