/**
 * /projects/:id detail page — parse id from path, fetch /api/public/projects/:id,
 * render hero + side meta + gallery from tableimages.
 */
(function () {
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function showNotFound() {
        document.querySelector('.detail-hero').style.display = 'none';
        document.querySelector('.detail-body').style.display = 'none';
        document.getElementById('detail-not-found').style.display = '';
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value == null ? '' : String(value);
    }

    async function loadDetail() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        // /projects/:id  → parts = ['projects', ':id']
        const id = parseInt(parts[1], 10);
        if (!id || isNaN(id) || id < 1) {
            showNotFound();
            return;
        }

        try {
            const res = await fetch('/api/public/projects/' + id);
            if (!res.ok) {
                showNotFound();
                return;
            }
            const data = await res.json();
            if (!data || !data.success || !data.data) {
                showNotFound();
                return;
            }
            renderDetail(data.data);
        } catch (e) {
            console.error('Failed to load project detail:', e);
            showNotFound();
        }
    }

    function renderDetail(p) {
        document.title = (p.name || 'Project') + ' — Sealand Property';

        // Hero image (fallback to first tableimages image, else default)
        const imgEl = document.getElementById('detail-image');
        if (p.image_path) {
            imgEl.src = p.image_path;
        } else if (Array.isArray(p.images) && p.images.length > 0 && p.images[0].image_path) {
            imgEl.src = p.images[0].image_path;
        }
        imgEl.alt = p.name || '';

        // Area badge
        const areaLabel = (p.area_label || p.area || '').toString().trim();
        const badge = document.getElementById('detail-area-badge');
        if (areaLabel) {
            badge.textContent = areaLabel.toUpperCase();
            badge.style.display = 'inline-block';
        }

        setText('detail-name', p.name || '');
        setText('detail-address', p.address || '');
        setText('detail-price', p.price || '');
        setText('detail-description', p.small_content || '');

        // Specs strip
        const specsRow = document.getElementById('detail-specs-row');
        specsRow.innerHTML = '';
        const specItems = [
            ['fa-bed', p.beds, 'Beds'],
            ['fa-bath', p.baths, 'Baths'],
            ['fa-car', p.cars, 'Car'],
            ['fa-vector-square', p.square_meters, 'm²']
        ];
        specItems.forEach(([icon, value, label]) => {
            if (!value) return;
            const span = document.createElement('span');
            span.className = 'detail-spec';
            span.innerHTML = '<i class="fa-solid ' + icon + '"></i><strong>' + escapeHtml(value) + '</strong> ' + label;
            specsRow.appendChild(span);
        });
        if (specsRow.children.length === 0) {
            specsRow.style.display = 'none';
        }

        // Side meta — Property Details list
        const meta = document.getElementById('detail-meta');
        meta.innerHTML = '';
        const metaItems = [
            ['Category', p.category],
            ['Type', p.property_type],
            ['Year', p.year],
            ['Style', p.style],
            ['State', p.state],
            ['Area', p.area_label || p.area],
            ['Size', p.square_meters ? p.square_meters + ' m²' : null]
        ];
        metaItems.forEach(([k, v]) => {
            if (!v) return;
            const dt = document.createElement('dt');
            dt.textContent = k;
            const dd = document.createElement('dd');
            dd.textContent = v;
            meta.appendChild(dt);
            meta.appendChild(dd);
        });

        // Gallery
        if (Array.isArray(p.images) && p.images.length > 0) {
            const gallery = document.getElementById('detail-gallery');
            const grid = document.getElementById('detail-gallery-grid');
            grid.innerHTML = '';
            p.images.forEach(im => {
                if (!im.image_path) return;
                const img = document.createElement('img');
                img.src = im.image_path;
                img.alt = p.name || '';
                img.loading = 'lazy';
                grid.appendChild(img);
            });
            if (grid.children.length > 0) {
                gallery.style.display = '';
            }
        }
    }

    document.addEventListener('DOMContentLoaded', loadDetail);
})();
