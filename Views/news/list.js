// F09: /news list — fetch all active and render with same .news-item template
(async function() {
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        })[c]);
    }
    const grid = document.getElementById('news-list-grid');
    const empty = document.getElementById('news-empty');
    if (!grid) return;
    try {
        const res = await fetch('/api/public/news?limit=50');
        const data = await res.json();
        const news = (data && data.success && Array.isArray(data.data)) ? data.data : [];
        if (!news.length) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            return;
        }
        grid.innerHTML = news.map(n => {
            const id = parseInt(n.id, 10) || 0;
            const cover = esc(n.cover_image || '/uploads/main_image.jpg');
            const title = esc(n.title || '');
            const summary = esc(n.summary || '');
            const ext = (n.external_url || '').trim();
            const isExt = /^https?:\/\//i.test(ext);
            const href = isExt ? esc(ext) : `/news/${id}`;
            const target = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';
            const cardClick = isExt
                ? `window.open('${href}','_blank','noopener,noreferrer')`
                : `location.href='/news/${id}'`;
            return `
                <article class="news-item" data-id="${id}" onclick="${cardClick}">
                    <img class="news-bg" src="${cover}" alt="" onerror="this.style.visibility='hidden'">
                    <div class="news-overlay">
                        <h3 class="news-title">${title}</h3>
                        <p class="news-summary">${summary}</p>
                        <a class="news-read-more" href="${href}"${target} onclick="event.stopPropagation();">
                            <span>READ MORE</span>
                        </a>
                    </div>
                </article>`;
        }).join('');
    } catch (e) {
        console.error('news list:', e);
        grid.style.display = 'none';
        empty.style.display = 'block';
    }
})();
