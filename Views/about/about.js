// /about: render Leadership section (Director + Co-Founder) using same footer_persons API
(async function () {
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
    try {
        const res = await fetch('/api/public/footer-persons');
        const data = await res.json();
        const wrap = document.getElementById('about-leadership');
        if (!wrap || !data.success || !Array.isArray(data.data)) return;
        wrap.innerHTML = data.data.slice(0, 2).map((p, i) => {
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
                            ${p.phone1  ? `<a href="tel:${esc(p.phone1.replace(/\\s+/g,''))}"><i class="fa-solid fa-phone"></i> ${esc(p.phone1)}</a>` : ''}
                            ${p.facebook_url && /^https:\/\//i.test(p.facebook_url) ? `<a href="${esc(p.facebook_url)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-facebook"></i> Facebook</a>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error('about leadership load:', e);
    }
})();
