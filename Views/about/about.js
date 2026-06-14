// /about page: render Leadership + Team + Services + apply editable settings
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
    const FA_ICON_RE = /^fa-[a-z0-9-]{2,40}$/i;

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
        setText('about-hero-tag',                s.about_hero_tag);
        setText('about-hero-title',              s.about_hero_title);
        setText('about-mission-text',            s.about_mission);
        setText('about-office-sydney-address',   s.about_office_sydney_address);
        setLink('about-office-sydney-phone',     s.about_office_sydney_phone, 'tel:');
        setLink('about-office-sydney-email',     s.about_office_sydney_email, 'mailto:');
        setText('about-office-hcm-address',      s.about_office_hcm_address);
        setLink('about-office-hcm-phone',        s.about_office_hcm_phone, 'tel:');
        setLink('about-office-hcm-email',        s.about_office_hcm_email, 'mailto:');
        renderServices(s);
    }

    function renderServices(s) {
        const grid = document.getElementById('about-services-grid');
        if (!grid) return;
        const cards = [1, 2, 3].map(i => {
            const icon  = s[`about_service_${i}_icon`]  || (i === 1 ? 'fa-house-chimney' : i === 2 ? 'fa-scale-balanced' : 'fa-suitcase-rolling');
            const title = s[`about_service_${i}_title`] || '';
            const desc  = s[`about_service_${i}_desc`]  || '';
            const safeIcon = FA_ICON_RE.test(String(icon)) ? icon : 'fa-circle';
            return `
                <div class="about-service-card">
                    <i class="fa-solid ${esc(safeIcon)} about-service-icon"></i>
                    <h3>${esc(title)}</h3>
                    <p>${esc(desc)}</p>
                </div>`;
        }).join('');
        grid.innerHTML = cards;
    }

    function renderTeam(members) {
        const grid = document.getElementById('about-team-grid');
        if (!grid) return;
        const list = (members || []).slice().sort((a, b) => (a.slot || 0) - (b.slot || 0));
        grid.innerHTML = list.map(m => {
            const photo = normalize(m.avatar_path);
            const photoHtml = photo
                ? `<img src="${esc(photo)}" alt="${esc(m.name || '')}" onerror="this.style.display='none';this.parentNode.innerHTML='<i class=\\'fa-solid fa-user\\'></i>'">`
                : '<i class="fa-solid fa-user"></i>';
            return `
                <div class="team-member">
                    <div class="team-photo">${photoHtml}</div>
                    <h4>${esc(m.name || '')}</h4>
                    <p>${esc(m.role || '')}</p>
                </div>`;
        }).join('');
    }

    async function loadAboutContent() {
        try {
            const res = await fetch('/api/public/settings');
            const data = await res.json();
            if (data && data.success && data.data) applyAboutSettings(data.data);
        } catch (e) { console.error('about content load:', e); }
    }
    async function loadTeam(override) {
        if (override) { renderTeam(override); return; }
        try {
            const res = await fetch('/api/public/team');
            const data = await res.json();
            renderTeam((data && data.success && Array.isArray(data.data)) ? data.data : []);
        } catch (e) { console.error('about team load:', e); }
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
            } catch (e) { console.error('about leadership:', e); return; }
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
                if (Array.isArray(msg.data.team_members))  renderTeam(msg.data.team_members);
                setTimeout(postHeight, 80);
            }
        });
    }

    // ===== Initial load =====
    loadAboutContent();
    loadLeadership();
    loadTeam();
})();
