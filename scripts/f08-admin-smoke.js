// F08 admin smoke: login → CRUD on videos → audit log → bad URL rejection
const BASE = 'http://localhost:5500';

async function login(u='admin', p='admin123') {
    const r = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${u}&password=${p}`,
        redirect: 'manual'
    });
    const sid = (r.headers.get('set-cookie') || '').split(';')[0];
    if (!sid) throw new Error('login failed: ' + r.status);
    return sid;
}

async function main() {
    const sid = await login();
    console.log('LOGIN OK');

    // 1. CREATE valid
    let r = await fetch(`${BASE}/api/admin/videos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({
            title: 'F08 SMOKE TEST',
            tiktok_url: 'https://www.tiktok.com/@sealand/video/9999',
            views_count: '99',
            display_order: 10,
            thumbnail_path: '/uploads/main_image.jpg'
        })
    });
    let body = await r.json();
    console.log('CREATE:', r.status, body);
    if (!body.success) { console.log('FAIL'); process.exit(1); }
    const id = body.id;

    // 2. CREATE invalid URL (rejected)
    r = await fetch(`${BASE}/api/admin/videos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ title: 'BAD', tiktok_url: 'javascript:alert(1)' })
    });
    const badBody = await r.json();
    console.log('CREATE bad URL:', r.status, badBody);
    const badRejected = r.status === 400 && !badBody.success;

    // 3. CREATE non-tiktok URL (rejected)
    r = await fetch(`${BASE}/api/admin/videos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ title: 'phish', tiktok_url: 'http://malicious.example.com/tiktok.com/x' })
    });
    const phishBody = await r.json();
    console.log('CREATE phish URL:', r.status, phishBody);
    const phishRejected = r.status === 400 && !phishBody.success;

    // 4. UPDATE
    r = await fetch(`${BASE}/api/admin/videos/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ title: 'F08 SMOKE UPDATED', views_count: '100' })
    });
    body = await r.json();
    console.log('UPDATE:', r.status, body);

    // 5. SOFT-DELETE
    r = await fetch(`${BASE}/api/admin/videos/${id}/soft-delete`, { method: 'PUT', headers: { cookie: sid } });
    body = await r.json();
    console.log('SOFT-DELETE:', r.status, body);

    // 6. Verify public list does NOT include inactive
    r = await fetch(`${BASE}/api/public/videos`);
    const pub = await r.json();
    const inPublic = pub.data.find(v => v.id === id);
    console.log('Public list includes soft-deleted:', !!inPublic, '(expect false)');

    // 7. Restore
    r = await fetch(`${BASE}/api/admin/videos/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ status: 'active' })
    });
    body = await r.json();
    console.log('RESTORE:', r.status, body);

    // 8. HARD DELETE
    r = await fetch(`${BASE}/api/admin/videos/${id}`, { method: 'DELETE', headers: { cookie: sid } });
    body = await r.json();
    console.log('HARD-DELETE:', r.status, body);

    // 9. Verify gone
    r = await fetch(`${BASE}/api/admin/videos/${id}`, { headers: { cookie: sid } });
    const goneBody = await r.json();
    console.log('GET after hard delete:', r.status, goneBody);
    const isGone = r.status === 404;

    // 10. Audit log includes VIDEO_* entries
    r = await fetch(`${BASE}/api/admin/audit-log?action=VIDEO_CREATE&limit=3`, { headers: { cookie: sid } });
    const audit = await r.json();
    const rows = audit.data || audit.logs || audit;
    const hasCreate = Array.isArray(rows) && rows.length > 0;
    console.log('Audit VIDEO_CREATE present:', hasCreate);

    if (badRejected && phishRejected && isGone && !inPublic && hasCreate) {
        console.log('SMOKE PASS'); process.exit(0);
    } else {
        console.log('SMOKE FAIL'); process.exit(1);
    }
}
main().catch(e => { console.error(e); process.exit(1); });
