// F09 admin smoke: CRUD + validation + XSS-safe render + audit log
const BASE = 'http://localhost:5500';

async function login() {
    const r = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=admin&password=admin123',
        redirect: 'manual'
    });
    const sid = (r.headers.get('set-cookie') || '').split(';')[0];
    if (!sid) throw new Error('login failed: ' + r.status);
    return sid;
}

async function main() {
    const sid = await login();
    console.log('LOGIN OK');

    // Empty title rejected
    let r = await fetch(`${BASE}/api/admin/news`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ title: '', summary: '' })
    });
    const emptyBody = await r.json();
    console.log('CREATE empty title:', r.status, emptyBody);
    const emptyRejected = r.status === 400 && !emptyBody.success;

    // Too-long title rejected (256 chars)
    r = await fetch(`${BASE}/api/admin/news`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ title: 'a'.repeat(256), summary: 'ok' })
    });
    const longBody = await r.json();
    console.log('CREATE long title:', r.status, longBody);
    const longRejected = r.status === 400 && !longBody.success;

    // Create with XSS payload — server stores raw; client renders via textContent
    r = await fetch(`${BASE}/api/admin/news`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({
            title: '<script>alert(1)</script> F09 XSS',
            summary: '<img src=x onerror=alert(2)>',
            content: 'Line 1\nLine 2\n\nLine 4 with <script>evil()</script>',
            cover_image: '/uploads/main_image.jpg'
        })
    });
    const xssBody = await r.json();
    console.log('CREATE xss payload:', r.status, xssBody);
    if (!xssBody.success) { console.log('FAIL'); process.exit(1); }
    const xssId = xssBody.id;

    // Read back — verify content stored verbatim
    r = await fetch(`${BASE}/api/admin/news/${xssId}`, { headers: { cookie: sid } });
    const xssRead = (await r.json()).data;
    console.log('XSS stored title:', xssRead.title);
    console.log('XSS stored content len:', xssRead.content.length);

    // Update
    r = await fetch(`${BASE}/api/admin/news/${xssId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ summary: 'Updated summary', display_order: 99 })
    });
    const updBody = await r.json();
    console.log('UPDATE:', r.status, updBody);

    // Soft-delete → not in public list
    r = await fetch(`${BASE}/api/admin/news/${xssId}/soft-delete`, { method: 'PUT', headers: { cookie: sid } });
    await r.json();
    r = await fetch(`${BASE}/api/public/news`);
    const pubList = (await r.json()).data;
    const inPublic = pubList.find(n => n.id === xssId);
    console.log('Public list excludes soft-deleted:', !inPublic);

    // Restore
    r = await fetch(`${BASE}/api/admin/news/${xssId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ status: 'active' })
    });
    await r.json();

    // Hard delete
    r = await fetch(`${BASE}/api/admin/news/${xssId}`, { method: 'DELETE', headers: { cookie: sid } });
    await r.json();
    r = await fetch(`${BASE}/api/admin/news/${xssId}`, { headers: { cookie: sid } });
    const gone = r.status === 404;
    console.log('Hard deleted (404):', gone);

    // Search
    r = await fetch(`${BASE}/api/admin/news?q=Sydney`, { headers: { cookie: sid } });
    const search = (await r.json()).data;
    console.log('Search "Sydney" results:', search.length);

    // Audit log includes NEWS_CREATE
    r = await fetch(`${BASE}/api/admin/audit-log?action=NEWS_CREATE&limit=3`, { headers: { cookie: sid } });
    const audit = await r.json();
    const rows = audit.data || audit.logs || audit;
    const hasCreate = Array.isArray(rows) && rows.some(x => x.action === 'NEWS_CREATE');
    console.log('Audit NEWS_CREATE present:', hasCreate);

    // 404 detail public
    r = await fetch(`${BASE}/api/public/news/99999`);
    const det404 = r.status === 404;
    console.log('Public detail 404:', det404);

    if (emptyRejected && longRejected && !inPublic && gone && hasCreate && det404 && search.length >= 1) {
        console.log('SMOKE PASS'); process.exit(0);
    } else {
        console.log('SMOKE FAIL'); process.exit(1);
    }
}
main().catch(e => { console.error(e); process.exit(1); });
