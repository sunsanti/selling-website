// ========== XSS-safe helpers ==========
function setText(el, value) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.textContent = value == null ? '' : String(value);
}
function hideIfEmpty(el, ...checkValues) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    const anyValue = checkValues.some(v => v && String(v).trim() !== '');
    if (!anyValue) el.style.display = 'none';
}

// ========== MODULE 1: Settings ==========
function normalizeImageUrl(v) {
    if (!v) return '';
    if (v.startsWith('data:') || v.startsWith('/') || v.startsWith('http')) return v;
    return '/' + v;
}

function renderSettings(s) {
    if (!s) return;
    if (s.logo !== undefined) {
        const v = s.logo;
        const imgEl = document.getElementById('site-logo-img');
        const textEl = document.getElementById('site-logo-text');
        if (v) {
            if (imgEl) { imgEl.src = normalizeImageUrl(v); imgEl.style.display = 'inline-block'; }
            if (textEl) textEl.style.display = 'none';
        } else {
            if (textEl) { textEl.textContent = (s.logo_text || 'LOGO'); textEl.style.display = 'inline'; }
            if (imgEl) imgEl.style.display = 'none';
        }
    }
    if (s.phone !== undefined) {
        const phoneVal = s.phone || 'phone number';
        const desktopPhone = document.getElementById('site-phone');
        if (desktopPhone) desktopPhone.textContent = phoneVal;
        const mobilePhone = document.getElementById('mobile-site-phone');
        if (mobilePhone) mobilePhone.textContent = phoneVal;
    }
    if (s.main_image !== undefined && s.main_image) {
        // F03: hero image element id #hero-image (replaces legacy .home-image img selector)
        const heroImg = document.getElementById('hero-image') || document.querySelector('.home-image img');
        if (heroImg) heroImg.src = normalizeImageUrl(s.main_image);
    }
    // F06: Purpose-Invest video — thumbnail + URL stored on body dataset
    if (s.purpose_video_thumbnail !== undefined) {
        const thumb = document.getElementById('purpose-thumbnail');
        if (thumb) {
            const url = normalizeImageUrl(s.purpose_video_thumbnail);
            // fallback: reuse hero/main image so the section never renders blank
            thumb.src = url || normalizeImageUrl(s.main_image) || '/uploads/main_image.jpg';
        }
    }
    if (s.purpose_video_url !== undefined) {
        document.body.dataset.purposeVideoUrl = s.purpose_video_url || '';
    }
}

// F06: Video modal handlers (exposed on window because onclick attrs reference them)
function openPurposeVideo() {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('purpose-video-player');
    if (!modal || !player) return;
    const url = (document.body.dataset.purposeVideoUrl || '').trim();
    if (!url) {
        alert('Video chưa được cấu hình. Vui lòng liên hệ admin.');
        return;
    }
    player.src = url;
    modal.style.display = 'flex';
    modal.classList.add('is-open');
    const p = player.play();
    if (p && typeof p.catch === 'function') p.catch(e => console.warn('autoplay blocked:', e && e.message));
}
function closePurposeVideo() {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('purpose-video-player');
    if (!modal || !player) return;
    try { player.pause(); } catch (_) {}
    player.removeAttribute('src');
    player.load();
    modal.style.display = 'none';
    modal.classList.remove('is-open');
}
function closeVideoModalIfBackdrop(event) {
    if (event && event.target && event.target.id === 'video-modal') closePurposeVideo();
}
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('video-modal');
        if (modal && modal.classList.contains('is-open')) closePurposeVideo();
    }
});
window.openPurposeVideo = openPurposeVideo;
window.closePurposeVideo = closePurposeVideo;
window.closeVideoModalIfBackdrop = closeVideoModalIfBackdrop;

(async function loadSettings() {
    try {
        const res = await fetch('/api/public/settings');
        const data = await res.json();
        if (data.success && data.data) {
            renderSettings(data.data);
            const mobileAcc = document.getElementById('mobile-account');
            const desktopAcc = document.getElementById('account');
            if (mobileAcc && desktopAcc) mobileAcc.textContent = desktopAcc.textContent || 'User';
        }
    } catch (e) {
        console.error('Settings not loaded:', e);
    }
})();

// ========== MODULE 2: Projects (grid + filter) ==========
async function loadProjectsFromDB() {
    try {
        const res = await fetch('/api/public/projects');
        const data = await res.json();
        renderProjects((data && data.success && Array.isArray(data.data)) ? data.data : []);
    } catch (e) {
        console.error('Projects not loaded:', e);
        renderProjects([]);
    }
}

let allProjects = [];

// F05b: XSS-safe HTML attribute escape (for src/alt where setAttribute is overkill)
function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}

function renderProjects(projects) {
    allProjects = projects || [];
    const grid = document.getElementById('project-grid');
    if (!grid) return;

    // F05b: top 4 active projects, sorted by display_order then id
    const top4 = allProjects.slice(0, 4);

    if (top4.length === 0) {
        grid.innerHTML = '<p class="empty-state" style="grid-column: 1 / -1; text-align:center; padding:3rem; color:#888;">No featured projects yet.</p>';
        return;
    }

    grid.innerHTML = '';
    top4.forEach(p => {
        // Build card as an anchor — click anywhere on the card navigates to detail page
        const card = document.createElement('a');
        card.className = 'project-card';
        card.href = '/projects/' + encodeURIComponent(p.id);

        // Image area + area badge
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

        // Info section: name, address, price
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

        // Specs strip: beds / baths / cars (only show present fields)
        if (p.beds || p.baths || p.cars) {
            const specs = document.createElement('div');
            specs.className = 'project-specs';
            const items = [
                ['fa-bed', p.beds, 'Beds'],
                ['fa-bath', p.baths, 'Baths'],
                ['fa-car', p.cars, 'Car']
            ];
            items.forEach(([icon, value, label]) => {
                if (!value) return;
                const item = document.createElement('span');
                item.className = 'spec-item';
                item.innerHTML = '<i class="fa-solid ' + icon + '"></i> '
                    + escapeAttr(value) + ' ' + label;
                specs.appendChild(item);
            });
            card.appendChild(specs);
        }

        // Fallback: if no image_path, fetch first tableimages entry async
        if (!p.image_path) {
            fetch('/api/public/projects/' + encodeURIComponent(p.id))
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data && Array.isArray(data.data.images) && data.data.images.length > 0) {
                        const first = data.data.images[0].image_path;
                        if (first) {
                            const img = document.createElement('img');
                            img.src = first;
                            img.alt = p.name || '';
                            img.loading = 'lazy';
                            imgWrap.appendChild(img);
                        }
                    }
                })
                .catch(() => {});
        }

        grid.appendChild(card);
    });
}

// Legacy filterProjects kept for backwards compat with .region click handler
// in script.js — now no-op when called (region filter buttons removed from HTML).
function filterProjects() { /* deprecated by F05b */ }

// ========== MODULE 3: Popup slider ==========
let currentSlide = 0;
let sliderImages = [];

function openPopupFromDB(el) {
    const projectId = el.dataset.id;
    const img = el.querySelector('img');

    fetch('/api/public/projects/' +projectId)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                const p = data.data;
                document.getElementById('popup-small-content').textContent = p.small_content || '';
                document.getElementById('popup-right1').textContent = p.name || '';
                document.getElementById('popup-right2').textContent = p.square_meters || '-';
                document.getElementById('popup-right3').textContent = p.category || '-';
                document.getElementById('popup-right4').textContent = p.year || '-';
                document.getElementById('popup-right5').textContent = p.style || '-';

                // Build slider from tableimages (fallback to image_path for backward compat)
                const rawImages = p.images && p.images.length > 0
                    ? p.images.map(img => img.image_path)
                    : (p.image_path ? p.image_path.split(',').map(s => s.trim()).filter(Boolean) : []);
                sliderImages = rawImages.length > 0 ? rawImages : [img.src];

                currentSlide = 0;
                renderSlider();

                document.getElementById('popup').style.display = 'flex';
            }
        });
}

function renderSlider() {
    const container = document.getElementById('slider-container');
    const thumbnails = document.getElementById('slider-thumbnails');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');

    // Render main images
    container.innerHTML = sliderImages.map(src => `<img src="${src}" alt="">`).join('');

    // Render thumbnails
    thumbnails.innerHTML = sliderImages.map((src, i) =>
        `<div class="thumb ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})">
            <img src="${src}" alt="" onerror="this.style.display='none'">
        </div>`
    ).join('');

    // Show/hide nav buttons (hide if only 1 image)
    const hideNav = sliderImages.length <= 1;
    prevBtn.style.display = hideNav ? 'none' : 'flex';
    nextBtn.style.display = hideNav ? 'none' : 'flex';

    updateSliderPosition(false);
}

function changeSlide(direction) {
    if (sliderImages.length <= 1) return;
    currentSlide = (currentSlide + direction + sliderImages.length) % sliderImages.length;
    updateSliderPosition(true);
}

function goToSlide(index) {
    if (index === currentSlide) return;
    currentSlide = index;
    updateSliderPosition(true);
}

function updateSliderPosition(animate) {
    const container = document.getElementById('slider-container');
    const thumbs = document.querySelectorAll('.slider-thumbnails .thumb');

    container.style.transition = animate ? 'transform 0.4s ease-in-out' : 'none';
    container.style.transform = `translateX(-${currentSlide * 100}%)`;

    thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentSlide);
    });
}

function attachHoverEvents() {
    document.querySelectorAll('.feature-image').forEach(img => {
        const overlay = img.querySelector('.overlay-text');
        img.addEventListener('mouseenter', () => {
            const name = img.dataset.type || '';
            overlay.textContent = name;
            overlay.style.opacity = 1;
        });
        img.addEventListener('mouseleave', () => {
            overlay.style.opacity = 0;
        });
    });
}

// ========== MODULE 4: About section ==========
function renderAbout(d) {
    if (!d) return;
    const content = document.getElementById('about-content');
    if (content) content.style.display = '';
    setText('about-banner', d.banner);
    setText('about-paragraph-left', d.paragraph_left);
    setText('about-paragraph-right', d.paragraph_right);
    hideIfEmpty('about-content', d.banner, d.paragraph_left, d.paragraph_right);

    const info = document.getElementById('about-stats-info');
    if (!info) return;
    info.innerHTML = '';
    info.style.display = '';

    // F04: icon mapping per slot — line-art gold accents
    const ABOUT_STAT_ICONS = {
        1: 'fa-users',          // Happy Clients
        2: 'fa-house-user',     // Property Sold
        3: 'fa-award',          // Years Experience
        4: 'fa-city'            // Projects Completed
    };

    (d.stats || []).forEach((s, idx) => {
        const slot = s.slot || (idx + 1);
        const block = document.createElement('div');
        block.className = 'block-num';

        const icon = document.createElement('i');
        icon.className = 'fa-solid ' + (ABOUT_STAT_ICONS[slot] || 'fa-circle') + ' stat-icon';
        block.appendChild(icon);

        const textWrap = document.createElement('div');
        textWrap.className = 'stat-text';

        const num = document.createElement('div');
        num.className = 'content-num1';
        num.textContent = s.num || '';

        const lbl = document.createElement('div');
        lbl.className = 'detail-content';
        lbl.textContent = s.label || '';

        textWrap.appendChild(num);
        textWrap.appendChild(lbl);
        block.appendChild(textWrap);
        info.appendChild(block);
    });

    // Empty state: hide the bar if all stats blank
    if ((d.stats || []).every(s => !s.num && !s.label)) {
        info.style.display = 'none';
    }
}

async function loadAboutSection() {
    try {
        const res = await fetch('/api/public/about');
        const json = await res.json();
        if (!json.success || !json.data) return;
        renderAbout(json.data);
    } catch (e) {
        console.error('loadAboutSection:', e);
    }
}

// ========== MODULE 5: Services (F07 — 5-card grid, no popup) ==========
const SERVICE_ICONS = {
    1: 'fa-key',
    2: 'fa-chart-line',
    3: 'fa-building',
    4: 'fa-hand-holding-dollar',
    5: 'fa-shield-halved'
};

function renderServices(items) {
    const list = document.getElementById('services-list');
    if (!list) return;
    list.innerHTML = '';

    const slots = (items || []).slice().sort((a, b) => (a.slot || 0) - (b.slot || 0));
    if (slots.length === 0) {
        list.innerHTML = '<p class="empty-state">No services configured.</p>';
        return;
    }

    slots.forEach(s => {
        const card = document.createElement('div');
        card.className = 'service-card';

        const icon = document.createElement('i');
        icon.className = 'fa-solid ' + (SERVICE_ICONS[s.slot] || 'fa-circle') + ' service-icon';
        card.appendChild(icon);

        const title = document.createElement('h3');
        title.className = 'service-title';
        title.textContent = s.title || '';
        card.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'service-desc';
        desc.textContent = s.description || '';
        card.appendChild(desc);

        list.appendChild(card);
    });
}

async function loadServices() {
    try {
        const res = await fetch('/api/public/services');
        const json = await res.json();
        if (!json.success) return;
        renderServices(json.data);
    } catch (e) {
        console.error('loadServices:', e);
    }
}

// ========== MODULE 5b: Videos (F08 — TikTok external) ==========
let _videoCarouselPage = 0;
const VIDEOS_PER_PAGE = 6;
let _allVideos = [];

function _escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
}
function _escapeAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
}

async function loadVideos() {
    try {
        const res = await fetch('/api/public/videos');
        const data = await res.json();
        _allVideos = (data && data.success && Array.isArray(data.data)) ? data.data : [];
    } catch (e) {
        console.error('loadVideos:', e);
        _allVideos = [];
    }
    _videoCarouselPage = 0;
    renderVideoCarousel();
}

function renderVideoCarousel() {
    const track = document.getElementById('video-track');
    const pagination = document.getElementById('video-pagination');
    if (!track) return;

    if (_allVideos.length === 0) {
        track.innerHTML = '<p class="empty-state">No videos yet.</p>';
        if (pagination) { pagination.innerHTML = ''; pagination.style.display = 'none'; }
        return;
    }

    const start = _videoCarouselPage * VIDEOS_PER_PAGE;
    const visible = _allVideos.slice(start, start + VIDEOS_PER_PAGE);

    track.innerHTML = visible.map(v => {
        const url = _escapeAttr(v.tiktok_url || '#');
        const thumb = _escapeAttr(v.thumbnail_path || '/uploads/main_image.jpg');
        const title = _escapeHtml(v.title || '');
        const views = _escapeHtml(v.views_count || '0');
        return `
            <a class="video-item" href="${url}" target="_blank" rel="noopener noreferrer">
                <img class="video-thumb" src="${thumb}" alt="" onerror="this.style.visibility='hidden'">
                <div class="video-overlay"></div>
                <h3 class="video-title">${title}</h3>
                <div class="video-play-icon"><i class="fa-solid fa-play"></i></div>
                <span class="video-views"><i class="fa-solid fa-play"></i> ${views}</span>
            </a>`;
    }).join('');

    const totalPages = Math.max(1, Math.ceil(_allVideos.length / VIDEOS_PER_PAGE));
    if (pagination) {
        pagination.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('span');
            dot.className = 'carousel-dot' + (i === _videoCarouselPage ? ' active' : '');
            dot.dataset.page = i;
            dot.onclick = () => { _videoCarouselPage = i; renderVideoCarousel(); };
            pagination.appendChild(dot);
        }
        pagination.style.display = totalPages <= 1 ? 'none' : 'flex';
    }
}

// ========== MODULE 6: Footer persons ==========
function renderFooterPersons(items) {
    const container = document.getElementById('footer-container');
    if (!container) return;
    container.innerHTML = '';

    (items || []).forEach(p => {
        const block = document.createElement('div');
        block.className = 'footer-person';

        const imgWrap = document.createElement('div');
        imgWrap.className = 'img-footer';
        const img = document.createElement('img');
        img.alt = p.name || 'footer person';
        img.onerror = function () { this.style.display = 'none'; };
        if (p.avatar_path) img.src = normalizeImageUrl(p.avatar_path);
        imgWrap.appendChild(img);
        block.appendChild(imgWrap);

        const line = document.createElement('div');
        line.className = 'line';
        block.appendChild(line);

        const fc = document.createElement('div');
        fc.className = 'footer-content';

        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = p.name || '';
        fc.appendChild(name);

        const detail = document.createElement('div');
        detail.className = 'footer-detail';

        if (p.email) {
            const row = document.createElement('div');
            row.className = 'contact-row';
            const ic = document.createElement('i');
            ic.className = 'fa-solid fa-envelope';
            const a = document.createElement('a');
            a.href = 'mailto:' + p.email;
            a.textContent = p.email;
            row.appendChild(ic);
            row.appendChild(a);
            detail.appendChild(row);
        }
        if (p.phone1) {
            const row = document.createElement('div');
            row.className = 'contact-row';
            const ic = document.createElement('i');
            ic.className = 'fa-solid fa-phone';
            const a = document.createElement('a');
            a.href = 'tel:' + p.phone1.replace(/\s+/g, '');
            a.textContent = p.phone1;
            row.appendChild(ic);
            row.appendChild(a);
            detail.appendChild(row);
        }
        if (p.phone2) {
            const row = document.createElement('div');
            row.className = 'contact-row';
            const ic = document.createElement('i');
            ic.className = 'fa-solid fa-phone';
            const a = document.createElement('a');
            a.href = 'tel:' + p.phone2.replace(/\s+/g, '');
            a.textContent = p.phone2;
            row.appendChild(ic);
            row.appendChild(a);
            detail.appendChild(row);
        }
        if (p.facebook_url && /^https:\/\//i.test(p.facebook_url)) {
            const row = document.createElement('div');
            row.className = 'contact-row';
            const ic = document.createElement('i');
            ic.className = 'fa-brands fa-facebook';
            const a = document.createElement('a');
            a.href = p.facebook_url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = p.name || 'Facebook';
            row.appendChild(ic);
            row.appendChild(a);
            detail.appendChild(row);
        }

        fc.appendChild(detail);
        block.appendChild(fc);
        container.appendChild(block);
    });
}

async function loadFooterPersons() {
    try {
        const res = await fetch('/api/public/footer-persons');
        const json = await res.json();
        if (!json.success) return;
        renderFooterPersons(json.data);
    } catch (e) {
        console.error('loadFooterPersons:', e);
    }
}

// ========== PREVIEW MODE (admin iframe with ?preview=1&scope=X) ==========
// When loaded inside the admin's live-preview iframe, /main hides every
// section except the one being edited and listens for postMessage from
// the parent so admin form changes show up before they're saved.
const PREVIEW_PARAMS = new URLSearchParams(window.location.search);
const PREVIEW_MODE = PREVIEW_PARAMS.get('preview') === '1';
const PREVIEW_SCOPE = PREVIEW_PARAMS.get('scope') || '';

function applyPreviewMode(scope) {
    const keepSelectorsByScope = {
        settings: ['#home-section'],   // header + home (logo, phone in header; main_image in home)
        about: ['#about-us'],
        services: ['#services'],
        footer: ['#footer']
    };
    const keep = new Set(keepSelectorsByScope[scope] || []);
    document.querySelectorAll('body > section').forEach(s => {
        if (s.id && keep.has('#' + s.id)) {
            s.style.display = '';
        } else {
            s.style.display = 'none';
        }
    });
    document.body.classList.add('preview-mode');
    document.body.style.paddingTop = '80px';   // keep room for fixed header

    // Disable click/hover interactions but KEEP scroll working. Putting
    // pointer-events:none on the body itself blocks scroll too, which
    // makes the iframe unusable on tall sections like services.
    // F02: extended selector list — new CTA buttons + generic anchor catch-all
    const style = document.createElement('style');
    style.textContent = `
        body.preview-mode a,
        body.preview-mode button,
        body.preview-mode [onclick],
        body.preview-mode .btn-get-in-touch,
        body.preview-mode .btn-services,
        body.preview-mode .btn-header-phone,
        body.preview-mode .btn-book-consultation,
        body.preview-mode .nav-item,
        body.preview-mode .menu-btn,
        body.preview-mode .feature-image,
        body.preview-mode .region {
            pointer-events: none !important;
            cursor: default !important;
        }
        body.preview-mode a:not([href^="#"]) {
            pointer-events: none !important;
        }
        body.preview-mode { cursor: default; }
    `;
    document.head.appendChild(style);
}

function postPreviewHeight() {
    if (!window.parent || window.parent === window) return;
    const h = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
    );
    window.parent.postMessage({ type: 'preview-height', height: h }, window.location.origin);
}

window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const msg = event.data || {};
    if (msg.type === 'preview-data') {
        const { target, data } = msg;
        if (!data) return;
        if (target === 'settings') renderSettings(data);
        else if (target === 'about') renderAbout(data);
        else if (target === 'services') renderServices(data.services || []);
        else if (target === 'footer') renderFooterPersons(data.footer_persons || []);
        // Resize after content change
        setTimeout(postPreviewHeight, 50);
    }
});

// ========== INIT ==========
loadProjectsFromDB();
loadAboutSection();
loadServices();
loadVideos();         // F08
loadFooterPersons();

if (PREVIEW_MODE) {
    applyPreviewMode(PREVIEW_SCOPE);
    // Signal ready so parent can push initial data
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'preview-ready', scope: PREVIEW_SCOPE }, window.location.origin);
    }
    // Auto-resize observer
    window.addEventListener('load', postPreviewHeight);
    window.addEventListener('resize', postPreviewHeight);
}

// Contact form submission
document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('contact-submit');
    if (!submitBtn) return;
    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value.trim();
        const phone = document.getElementById('contact-phone').value.trim();
        const email = document.getElementById('contact-email').value.trim();

        if (!name) {
            alert('Please enter your name');
            return;
        }

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, email })
            });
            const result = await res.json();
            if (result.success) {
                alert('Thank you! We will contact you soon.');
                document.getElementById('contact-name').value = '';
                document.getElementById('contact-phone').value = '';
                document.getElementById('contact-email').value = '';
                document.getElementById('fill-popup').style.display = 'none';
            } else {
                alert(result.message || 'Error sending contact');
            }
        } catch (err) {
            alert('Error sending contact');
        }
    });
});

// F03: Property Search Bar — collect dropdowns, navigate /projects with query string
function handleSearchSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    ['state', 'suburb', 'type', 'price'].forEach(f => {
        const el = document.getElementById('search-' + f);
        if (el && el.value) params.set(f, el.value);
    });
    const qs = params.toString();
    window.location.href = '/projects' + (qs ? '?' + qs : '');
}
window.handleSearchSubmit = handleSearchSubmit;
