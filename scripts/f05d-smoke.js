// F05d smoke test: admin login → PUT project with 8 new fields → verify in DB + audit log
const BASE = 'http://localhost:5500';

async function main() {
    // 1. Login as admin (env-provided)
    const u = process.env.ADMIN_USER || 'admin';
    const p = process.env.ADMIN_PASS || 'admin123';
    const loginRes = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}`,
        redirect: 'manual'
    });
    const cookie = loginRes.headers.get('set-cookie');
    if (!cookie) {
        console.error('LOGIN FAIL — no set-cookie. Status:', loginRes.status);
        console.error(await loginRes.text());
        process.exit(1);
    }
    const sid = cookie.split(';')[0];
    console.log('LOGIN OK:', sid.slice(0, 30) + '...');

    // 2. Get projects list, find first id
    const listRes = await fetch(`${BASE}/api/admin/projects`, { headers: { cookie: sid } });
    const list = await listRes.json();
    const projects = list.data || list.projects || list;
    if (!Array.isArray(projects) || !projects.length) {
        console.error('NO PROJECTS in DB to test against:', list);
        process.exit(1);
    }
    const target = projects[0];
    console.log('TARGET project id =', target.id, 'name =', target.name);

    // 3. PUT with 8 new fields
    const payload = {
        price: 'From $999,000',
        beds: '2-3',
        baths: '2',
        cars: '1',
        address: '99 Smoke Test Ave, Sydney',
        state: 'NSW',
        property_type: 'apartment',
        area_label: 'F05D-SMOKE'
    };
    const putRes = await fetch(`${BASE}/api/admin/projects/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify(payload)
    });
    const putBody = await putRes.json();
    console.log('PUT status:', putRes.status, 'body:', putBody);
    if (!putBody.success) {
        console.error('UPDATE FAIL');
        process.exit(1);
    }

    // 4. GET back and verify
    const getRes = await fetch(`${BASE}/api/admin/projects/${target.id}`, { headers: { cookie: sid } });
    const got = await getRes.json();
    const data = got.data || got;
    console.log('GET back fields:');
    for (const k of Object.keys(payload)) {
        const match = String(data[k] || '') === String(payload[k]);
        console.log(`  ${match ? 'OK' : 'MISMATCH'}: ${k} = ${JSON.stringify(data[k])} (expected ${JSON.stringify(payload[k])})`);
    }

    // 5. Check audit log for PROJECT_UPDATE on this id
    const auditRes = await fetch(`${BASE}/api/admin/audit-log?action=PROJECT_UPDATE&limit=5`, { headers: { cookie: sid } });
    const audit = await auditRes.json();
    const rows = audit.data || audit.logs || audit;
    if (!Array.isArray(rows) || !rows.length) {
        console.log('AUDIT: no rows returned (maybe needs admin role)');
    } else {
        const latest = rows[0];
        console.log('AUDIT latest:', { action: latest.action, target_id: latest.target_id, details: latest.details });
    }
    console.log('SMOKE DONE');
}

main().catch(e => { console.error('SMOKE ERROR:', e); process.exit(1); });
