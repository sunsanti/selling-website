// F09: /news/:id detail — fetch by ID, render plain-text content
(async function() {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const id = parseInt(segments[segments.length - 1], 10);
    const article = document.getElementById('news-article');
    const notFound = document.getElementById('news-not-found');

    function fail() {
        if (article) article.style.display = 'none';
        if (notFound) notFound.style.display = 'block';
    }
    if (!Number.isInteger(id) || id < 1) { fail(); return; }

    try {
        const res = await fetch('/api/public/news/' + id);
        if (!res.ok) { fail(); return; }
        const data = await res.json();
        if (!data || !data.success || !data.data) { fail(); return; }
        const n = data.data;
        document.title = `${n.title} — Sealand News`;
        const cover = document.getElementById('news-cover');
        cover.src = n.cover_image || '/uploads/main_image.jpg';
        cover.alt = n.title || '';
        document.getElementById('news-title').textContent = n.title || '';
        const d = n.created_at ? new Date(n.created_at) : null;
        document.getElementById('news-date').textContent = d ? d.toLocaleDateString('en-AU', { year:'numeric', month:'long', day:'numeric' }) : '';
        document.getElementById('news-summary').textContent = n.summary || '';
        // textContent + white-space:pre-line preserves \n while preventing HTML injection
        document.getElementById('news-content').textContent = n.content || '';
        article.style.display = 'block';
    } catch (e) {
        console.error('news detail:', e);
        fail();
    }
})();
