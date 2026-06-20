// /news list — client-side pagination, 12 items per page
(function () {
    const PAGE_SIZE = 12;
    let _allNews = [];
    let _currentPage = 1;

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function renderPage(page) {
        _currentPage = page;
        const grid  = document.getElementById('news-list-grid');
        const empty = document.getElementById('news-empty');
        if (!grid) return;

        if (_allNews.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            renderPagination();
            return;
        }

        empty.style.display = 'none';
        grid.style.display  = '';

        const start = (page - 1) * PAGE_SIZE;
        const slice = _allNews.slice(start, start + PAGE_SIZE);

        grid.innerHTML = slice.map(n => {
            const id      = parseInt(n.id, 10) || 0;
            const cover   = esc(n.cover_image || '/uploads/main_image.jpg');
            const title   = esc(n.title   || '');
            const summary = esc(n.summary  || '');
            const ext     = (n.external_url || '').trim();
            const isExt   = /^https?:\/\//i.test(ext);
            const href    = isExt ? esc(ext) : `/news/${id}`;
            const target  = isExt ? ' target="_blank" rel="noopener noreferrer"' : '';
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

        renderPagination();
        if (page > 1) {
            const wrapper = document.querySelector('.news-grid-wrapper');
            if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function renderPagination() {
        const bar = document.getElementById('news-pagination');
        if (!bar) return;
        const totalPages = Math.ceil(_allNews.length / PAGE_SIZE);
        if (totalPages <= 1) { bar.innerHTML = ''; return; }

        const btns = [];
        if (_currentPage > 1) {
            btns.push(`<button class="page-btn page-arrow" data-page="${_currentPage - 1}">&#8592; Prev</button>`);
        }
        for (let i = 1; i <= totalPages; i++) {
            btns.push(`<button class="page-btn${i === _currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`);
        }
        if (_currentPage < totalPages) {
            btns.push(`<button class="page-btn page-arrow" data-page="${_currentPage + 1}">Next &#8594;</button>`);
        }
        bar.innerHTML = btns.join('');
        bar.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => renderPage(parseInt(btn.dataset.page, 10)));
        });
    }

    async function loadNews() {
        const grid  = document.getElementById('news-list-grid');
        const empty = document.getElementById('news-empty');
        try {
            const res  = await fetch('/api/public/news?limit=500');
            const data = await res.json();
            _allNews = (data && data.success && Array.isArray(data.data)) ? data.data : [];
            renderPage(1);
        } catch (e) {
            console.error('news list:', e);
            if (grid)  grid.style.display  = 'none';
            if (empty) empty.style.display = 'block';
        }
    }

    document.addEventListener('DOMContentLoaded', loadNews);
}());
