// /about page: render Leadership block + apply editable about-content from settings
(function () {
    const ROLES = {
        1: { title: 'DIRECTOR', quote: 'Our mission is to help you grow wealth through real estate, thereby building a prosperous future for yourself and your loved ones.' },
        2: { title: 'CO-FOUNDER', quote: 'We assist Vietnamese families settling abroad — from school choices and banking to long-term portfolio growth.' }
    };
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }
    function normalize(v) {
        if (!v) return '';
        if (v.startsWith('/') || v.startsWith('http') || v.startsWith('data:')) return v;
        return '/' + v;
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el && val != null && val !== '') el.textContent = val;
    }
    function setLink(id, val, prefix) {
        const el = document.getElementById(id);
        if (el && val != null && val !== '') {
            el.textContent = val;
            el.href = prefix + String(val).replace(/\s+/g, '');
        }
    }

    function applyAboutSettings(s) {
        if (!s) return;
        setText('about-hero-tag',   s.about_hero_tag);
        setText('about-hero-title', s.about_hero_title);
        setText('about-mission-text', s.about_mission);
        setText('about-office-sydney-address', s.about_office_sydney_address);
        setLink('about-office-sydney-phone',   s.about_office_sydney_phone, 'tel:');
        setLink('about-office-sydney-email',   s.about_office_sydney_email, 'mailto:');
        setText('about-office-hcm-address',    s.about_office_hcm_address);
        setLink('about-office-hcm-phone',      s.about_office_hcm_phone, 'tel:');
        setLink('about-office-hcm-email',      s.about_office_hcm_email, 'mailto:');
    }

    async function loadAboutContent() {
        try {
            const res = await fetch('/api/public/settings');
            const data = await res.json();
            if (data && data.success && data.data) applyAboutSettings(data.data);
        } catch (e) {
            console.error('about content load:', e);
        }
    }

    async function loadLeadership(personsOverride) {
        const wrap = document.getElementById('about-leadership');
        if (!wrap) return;
        let persons = personsOverride;
        if (!persons) {
            try {
                const res = await fetch('/api/public/footer-persons');
                const data = await res.json();
                persons = (data && data.success && Array.isArray(data.data)) ? data.data : [];
            } catch (e) {
                console.error('about leadership:', e);
                return;
            }
        }
        wrap.innerHTML = persons.slice(0, 2).map((p, i) => {
            const slot = parseInt(p.slot, 10) || (i + 1);
            const role = ROLES[slot] || { title: '', quote: '' };
            const photo = normalize(p.avatar_path);
            const photoHtml = photo
                ? `<img src="${esc(photo)}" alt="${esc(p.name || '')}" onerror="this.style.display='none'">`
                : '<i class="fa-solid fa-user"></i>';
            const flipClass = (i === 1) ? ' leadership-flip' : '';
            return `
                <div class="leadership-row${flipClass}">
                    <div class="leadership-photo">${photoHtml}</div>
                    <div class="leadership-info">
                        <span class="leadership-role">${esc(role.title)}</span>
                        <h2 class="leadership-name">${esc(p.name || '')}</h2>
                        <p class="leadership-quote">"${esc(role.quote)}"</p>
                        <div class="leadership-contact">
                            ${p.email   ? `<a href="mailto:${esc(p.email)}"><i class="fa-solid fa-envelope"></i> ${esc(p.email)}</a>` : ''}
                            ${p.phone1  ? `<a href="tel:${esc(p.phone1.replace(/\s+/g,''))}"><i class="fa-solid fa-phone"></i> ${esc(p.phone1)}</a>` : ''}
                            ${p.facebook_url && /^https:\/\//i.test(p.facebook_url) ? `<a href="${esc(p.facebook_url)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-facebook"></i> Facebook</a>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    // ===== PREVIEW MODE =====
    const PREVIEW_PARAMS = new URLSearchParams(window.location.search);
    const PREVIEW_MODE = PREVIEW_PARAMS.get('preview') === '1';
    const PREVIEW_SCOPE = PREVIEW_PARAMS.get('scope') || '';

    function postHeight() {
        try {
            const h = document.body.scrollHeight;
            window.parent.postMessage({ type: 'preview-height', height: h }, '*');
        } catch (_) {}
    }
    if (PREVIEW_MODE) {
        // Tell admin we're ready to receive data; admin will post initial state.
        window.addEventListener('load', () => {
            try { window.parent.postMessage({ type: 'preview-ready', scope: PREVIEW_SCOPE || 'about' }, '*'); } catch (_) {}
            setTimeout(postHeight, 100);
        });
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            const msg = event.data || {};
            if (msg.type === 'preview-data' && msg.target === 'about' && msg.data) {
                applyAboutSettings(msg.data);
                if (Array.isArray(msg.data.footer_persons)) loadLeadership(msg.data.footer_persons);
                setTimeout(postHeight, 80);
            }
        });
    }

    // ===== Initial load =====
    loadAboutContent();
    loadLeadership();
})();
