// F06 admin smoke: login → PUT settings with 2 new F06 keys → verify saved + audit log labels
const BASE = 'http://localhost:5500';
const u = process.env.ADMIN_USER || 'admin';
const p = process.env.ADMIN_PASS || 'admin123';

async function main() {
    // login
    const loginRes = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${u}&password=${p}`,
        redirect: 'manual'
    });
    const sid = (loginRes.headers.get('set-cookie') || '').split(';')[0];
    if (!sid) { console.error('login failed:', loginRes.status); process.exit(1); }
    console.log('LOGIN OK');

    // PUT settings with new F06 keys
    const payload = {
        logo: '/uploads/1779806261352-521765523.jpg',
        phone: '999',
        main_image: '/uploads/1779806261352-521765523.jpg',
        purpose_video_thumbnail: '/uploads/test-thumb.jpg',
        purpose_video_url: '/uploads/test-video.mp4'
    };
    const putRes = await fetch(`${BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify(payload)
    });
    const putBody = await putRes.json();
    console.log('PUT status:', putRes.status, putBody);
    if (!putBody.success) { console.error('PUT failed'); process.exit(1); }

    // GET back
    const getRes = await fetch(`${BASE}/api/public/settings`);
    const got = (await getRes.json()).data;
    console.log('GET back:');
    console.log('  purpose_video_thumbnail:', got.purpose_video_thumbnail);
    console.log('  purpose_video_url:', got.purpose_video_url);
    const matchThumb = got.purpose_video_thumbnail === payload.purpose_video_thumbnail;
    const matchUrl = got.purpose_video_url === payload.purpose_video_url;
    console.log(`  match: thumb=${matchThumb} url=${matchUrl}`);

    // Test invalid URL rejected
    const badRes = await fetch(`${BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie: sid },
        body: JSON.stringify({ purpose_video_url: 'javascript:alert(1)' })
    });
    const badBody = await badRes.json();
    console.log('Bad URL rejected:', badRes.status, badBody);
    const badRejected = badRes.status === 400 && !badBody.success;

    // Audit log
    const auditRes = await fetch(`${BASE}/api/admin/audit-log?action=SETTINGS_UPDATE&limit=3`, { headers: { cookie: sid } });
    const audit = await auditRes.json();
    const rows = audit.data || audit.logs || audit;
    if (Array.isArray(rows) && rows.length) {
        const latest = rows[0];
        console.log('AUDIT latest:', { action: latest.action, details: latest.details });
        const det = typeof latest.details === 'string' ? JSON.parse(latest.details) : latest.details;
        const hasNew = det && Array.isArray(det.fields) && (det.fields.includes('purpose_video_url') || det.fields.includes('purpose_video_thumbnail'));
        console.log(`  includes F06 keys: ${hasNew}`);
    }

    if (matchThumb && matchUrl && badRejected) {
        console.log('SMOKE PASS');
        process.exit(0);
    } else {
        console.log('SMOKE FAIL');
        process.exit(1);
    }
}
main().catch(e => { console.error(e); process.exit(1); });
