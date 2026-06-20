(async function () {
    await Promise.all([loadSettings(), loadTeam()]);

    async function loadSettings() {
        try {
            const res = await fetch('/api/public/settings');
            const { data } = await res.json();
            if (!data) return;

            // Offices — same data source and rendering as /about page
            const grid = document.getElementById('contact-offices-grid');
            if (grid) {
                let offices = data.about_offices;
                if (typeof offices === 'string') {
                    try { offices = JSON.parse(offices); } catch (_) { offices = []; }
                }
                if (!Array.isArray(offices)) offices = [];
                grid.innerHTML = offices.map(o => `
                    <div class="office-card">
                        <h3 class="office-city">${esc(o.name || '')}${o.flag ? ` <span class="office-flag" aria-hidden="true">${esc(o.flag)}</span>` : ''}</h3>
                        ${o.address ? `<p class="office-row"><i class="fa-solid fa-location-dot"></i> <span>${esc(o.address)}</span></p>` : ''}
                        ${o.phone   ? `<p class="office-row"><i class="fa-solid fa-phone"></i> <a href="tel:${esc(String(o.phone).replace(/\s+/g, ''))}">${esc(o.phone)}</a></p>` : ''}
                        ${o.email   ? `<p class="office-row"><i class="fa-solid fa-envelope"></i> <a href="mailto:${esc(o.email)}">${esc(o.email)}</a></p>` : ''}
                    </div>`).join('');
            }

            const socials = [
                { url: data.footer_facebook_url, icon: 'fa-brands fa-facebook', label: 'Facebook' },
                { url: data.footer_linkedin_url, icon: 'fa-brands fa-linkedin', label: 'LinkedIn' },
                { url: data.footer_youtube_url,  icon: 'fa-brands fa-youtube',  label: 'YouTube'  },
                { url: data.footer_tiktok_url,   icon: 'fa-brands fa-tiktok',   label: 'TikTok'   },
            ].filter(s => s.url);

            if (socials.length) {
                const linksEl = document.getElementById('contact-social-links');
                const wrapEl  = document.getElementById('contact-social');
                if (linksEl) linksEl.innerHTML = socials.map(s =>
                    `<a href="${s.url}" aria-label="${s.label}" target="_blank" rel="noopener"><i class="${s.icon}"></i></a>`
                ).join('');
                if (wrapEl) wrapEl.style.display = '';
            }
        } catch (e) {
            console.error('Contact settings:', e);
        }
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    async function loadTeam() {
        try {
            const res = await fetch('/api/public/footer-persons');
            const { data } = await res.json();
            const container = document.getElementById('team-cards');
            if (!container || !data?.length) return;

            container.innerHTML = data.map(p => `
                <div class="team-card">
                    <div class="team-card-avatar">
                        ${p.avatar_path
                            ? `<img src="${p.avatar_path}" alt="${p.name}" loading="lazy">`
                            : `<div class="team-card-avatar-placeholder"><i class="fa-solid fa-user"></i></div>`}
                    </div>
                    <div class="team-card-body">
                        <h3 class="team-card-name">${p.name}</h3>
                        ${p.phone1 ? `<a class="team-card-contact" href="tel:${p.phone1}"><i class="fa-solid fa-phone"></i>${p.phone1}</a>` : ''}
                        ${p.phone2 ? `<a class="team-card-contact" href="tel:${p.phone2}"><i class="fa-solid fa-phone"></i>${p.phone2}</a>` : ''}
                        ${p.email  ? `<a class="team-card-contact" href="mailto:${p.email}"><i class="fa-solid fa-envelope"></i>${p.email}</a>` : ''}
                        ${p.facebook_url ? `<a class="team-card-contact" href="${p.facebook_url}" target="_blank" rel="noopener"><i class="fa-brands fa-facebook"></i>Facebook</a>` : ''}
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error('Contact team:', e);
        }
    }

}());

function submitContactPage(e) {
    e.preventDefault();
    const btn    = document.getElementById('cf-submit-btn');
    const status = document.getElementById('cf-status');
    const name   = document.getElementById('c-name').value.trim();
    const phone  = document.getElementById('c-phone').value.trim();
    const email  = document.getElementById('c-email').value.trim();

    status.className = 'cf-status';
    status.textContent = '';

    if (!name)           { show('Vui lòng nhập họ tên', 'error'); return; }
    if (!phone && !email){ show('Vui lòng nhập email hoặc số điện thoại', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SENDING...';

    fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            show('Thank you! We\'ll be in touch shortly.', 'success');
            document.getElementById('contact-form').reset();
        } else {
            show(data.message || 'Something went wrong, please try again.', 'error');
        }
    })
    .catch(() => show('Connection error, please try again.', 'error'))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> SEND MESSAGE';
    });

    function show(msg, type) {
        status.textContent = msg;
        status.className = 'cf-status ' + type;
    }
}
