/**
 * /projects list page — filter + client-side pagination (20 per page).
 */
(function () {
    const PAGE_SIZE    = 20;
    const ALLOWED_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
    const ALLOWED_TYPES  = ['apartment', 'house', 'townhouse', 'land'];
    const ALLOWED_AREAS  = ['sydney', 'melbourne', 'brisbane', 'goldcoast'];
    const AREA_LABELS = { sydney: 'Sydney', melbourne: 'Melbourne', brisbane: 'Brisbane', goldcoast: 'Gold Coast' };
    const PRICE_LABELS = { '500k-800k': '$500k – $800k', '800k-1m': '$800k – $1M', '1m-2m': '$1M – $2M', '2m+': '$2M+' };

    let _allProjects  = [];
    let _currentPage  = 1;

    function getFilters() {
        const params = new URLSearchParams(window.location.search);
        const f = {};
        const state = (params.get('state') || '').toUpperCase();
        if (ALLOWED_STATES.includes(state)) f.state = state;
        const type = (params.get('type') || '').toLowerCase();
        if (ALLOWED_TYPES.includes(type)) f.type = type;
        const area = (params.get('area') || '').toLowerCase();
        if (ALLOWED_AREAS.includes(area)) f.area = area;
        const price = params.get('price') || '';
        if (PRICE_LABELS[price]) f.price = price;
        return f;
    }

    function renderFilterChips(filters) {
        const wrap = document.getElementById('projects-filter-chips');
        if (!wrap) return;
        const entries = Object.entries(filters);
        if (entries.length === 0) { wrap.innerHTML = ''; return; }
        const chipHtml = entries.map(([k, v]) => {
            let label = v;
            if (k === 'price') label = PRICE_LABELS[v] || v;
            if (k === 'area')  label = AREA_LABELS[v]  || v;
            if (k === 'type')  label = v.charAt(0).toUpperCase() + v.slice(1);
            return `<span class="filter-chip">${escapeHtml(k.toUpperCase())}: <strong>${escapeHtml(label)}</strong></span>`;
        }).join('');
        wrap.innerHTML = chipHtml + '<a href="/projects" class="filter-chip-clear">Clear all</a>';
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function renderPage(page) {
        _currentPage = page;
        const grid  = document.getElementById('projects-list-grid');
        const empty = document.getElementById('projects-empty');
        if (!grid) return;

        grid.innerHTML = '';
        if (_allProjects.length === 0) {
            empty.style.display = '';
            renderPagination();
            return;
        }
        empty.style.display = 'none';

        const start = (page - 1) * PAGE_SIZE;
        const slice = _allProjects.slice(start, start + PAGE_SIZE);

        slice.forEach(p => {
            const card = document.createElement('a');
            card.className = 'project-card';
            card.href = '/projects/' + encodeURIComponent(p.id);

            const imgWrap = document.createElement('div');
            imgWrap.className = 'project-card-image';
            if (p.image_path) {
                const img = document.createElement('img');
                img.src = p.image_path;
                img.alt = p.name || '';
                img.loading = 'lazy';
                imgWrap.appendChild(img);
            }
            const areaLabel = (p.area_label || p.area || '').toString().trim();
            if (areaLabel) {
                const badge = document.createElement('span');
                badge.className = 'project-badge';
                badge.textContent = areaLabel.toUpperCase();
                imgWrap.appendChild(badge);
            }
            card.appendChild(imgWrap);

            const info = document.createElement('div');
            info.className = 'project-card-info';
            const name = document.createElement('h3');
            name.className = 'project-name';
            name.textContent = p.name || '';
            info.appendChild(name);
            if (p.address) {
                const addr = document.createElement('p');
                addr.className = 'project-address';
                addr.textContent = p.address;
                info.appendChild(addr);
            }
            if (p.price) {
                const price = document.createElement('p');
                price.className = 'project-price';
                price.textContent = p.price;
                info.appendChild(price);
            }
            card.appendChild(info);

            if (p.beds || p.baths || p.cars) {
                const specs = document.createElement('div');
                specs.className = 'project-specs';
                [['fa-bed', p.beds, 'Beds'], ['fa-bath', p.baths, 'Baths'], ['fa-car', p.cars, 'Car']].forEach(([icon, value, label]) => {
                    if (!value) return;
                    const item = document.createElement('span');
                    item.className = 'spec-item';
                    item.innerHTML = '<i class="fa-solid ' + icon + '"></i> ' + escapeHtml(value) + ' ' + label;
                    specs.appendChild(item);
                });
                card.appendChild(specs);
            }
            grid.appendChild(card);
        });

        renderPagination();
        if (page > 1) {
            const wrapper = document.querySelector('.projects-grid-wrapper');
            if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function renderPagination() {
        const bar = document.getElementById('projects-pagination');
        if (!bar) return;
        const totalPages = Math.ceil(_allProjects.length / PAGE_SIZE);
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

    async function loadProjects() {
        const filters = getFilters();
        renderFilterChips(filters);
        const qs  = new URLSearchParams(filters).toString();
        const url = '/api/public/projects' + (qs ? '?' + qs : '');
        try {
            const res  = await fetch(url);
            const data = await res.json();
            _allProjects  = (data && data.success && Array.isArray(data.data)) ? data.data : [];
            _currentPage  = 1;
            renderPage(1);
        } catch (e) {
            console.error('Failed to load projects:', e);
            _allProjects = [];
            renderPage(1);
        }
    }

    function prefillSearchBar() {
        const f = getFilters();
        ['state', 'area', 'type', 'price'].forEach(k => {
            const el = document.getElementById('search-' + k);
            if (el && f[k] !== undefined) el.value = f[k];
        });
    }

    window.handleProjectsSearch = function (event) {
        event.preventDefault();
        const params = new URLSearchParams();
        const state = document.getElementById('search-state').value;
        const area  = document.getElementById('search-area').value;
        const type  = document.getElementById('search-type').value;
        const price = document.getElementById('search-price').value;
        if (state) params.set('state', state);
        if (area)  params.set('area',  area);
        if (type)  params.set('type',  type);
        if (price) params.set('price', price);
        const qs   = params.toString();
        const next = '/projects' + (qs ? '?' + qs : '');
        window.history.replaceState(null, '', next);
        loadProjects();
    };

    document.addEventListener('DOMContentLoaded', () => {
        prefillSearchBar();
        loadProjects();
    });
}());
