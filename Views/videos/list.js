// F08: /videos list page — show all active, reusing .video-track + .video-item styles
(async function() {
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        })[c]);
    }
    const grid = document.getElementById('videos-list-grid');
    const empty = document.getElementById('videos-empty');
    if (!grid) return;
    try {
        const res = await fetch('/api/public/videos');
        const data = await res.json();
        const videos = (data && data.success && Array.isArray(data.data)) ? data.data : [];
        if (!videos.length) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            return;
        }
        grid.innerHTML = videos.map(v => {
            const url = esc(v.tiktok_url || '#');
            const thumb = esc(v.thumbnail_path || '/uploads/main_image.jpg');
            const title = esc(v.title || '');
            const views = esc(v.views_count || '0');
            return `
                <a class="video-item" href="${url}" target="_blank" rel="noopener noreferrer">
                    <img class="video-thumb" src="${thumb}" alt="" onerror="this.style.visibility='hidden'">
                    <div class="video-overlay"></div>
                    <h3 class="video-title">${title}</h3>
                    <div class="video-play-icon"><i class="fa-solid fa-play"></i></div>
                    <span class="video-views"><i class="fa-solid fa-play"></i> ${views}</span>
                </a>`;
        }).join('');
    } catch (e) {
        console.error('videos list load:', e);
        grid.style.display = 'none';
        empty.style.display = 'block';
    }
})();
