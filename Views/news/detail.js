// F09: /news/:id detail — fetch by ID, render plain-text content
(function() {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const id = parseInt(segments[segments.length - 1], 10);
    const article = document.getElementById('news-article');
    const notFound = document.getElementById('news-not-found');
    let _newsData = null;

    function fail() {
        if (article) article.style.display = 'none';
        if (notFound) notFound.style.display = 'block';
    }

    function applyNews(n) {
        const td = window.i18n && window.i18n.td ? window.i18n.td.bind(window.i18n) : (obj, f) => obj[f] || '';
        const title = td(n, 'title') || '';
        document.title = `${title || n.title} — Sealand News`;
        const cover = document.getElementById('news-cover');
        cover.src = n.cover_image || '';
        cover.alt = title;
        document.getElementById('news-title').textContent = title;
        const d = n.created_at ? new Date(n.created_at) : null;
        document.getElementById('news-date').textContent = d ? d.toLocaleDateString('en-AU', { year:'numeric', month:'long', day:'numeric' }) : '';
        document.getElementById('news-summary').textContent = td(n, 'summary');
        // textContent + white-space:pre-line preserves \n while preventing HTML injection
        document.getElementById('news-content').textContent = td(n, 'content');
        article.style.display = 'block';
    }

    if (!Number.isInteger(id) || id < 1) { fail(); return; }

    fetch('/api/public/news/' + id).then(function(res) {
        if (!res.ok) { fail(); return null; }
        return res.json();
    }).then(function(data) {
        if (!data || !data.success || !data.data) { fail(); return; }
        _newsData = data.data;
        applyNews(_newsData);
    }).catch(function(e) {
        console.error('news detail:', e);
        fail();
    });

    window.addEventListener('langchange', function() {
        if (_newsData) applyNews(_newsData);
    });
})();
