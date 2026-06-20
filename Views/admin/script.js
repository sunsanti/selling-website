// ===================== STATE =====================
let currentProjectKeyword = '';
let currentEditId = null;
let currentAccountEditId = null;
let projectSearchTimeout = null;
let contactSearchTimeout = null;
let currentProjectImages = []; // { id: dbId|null, image_path: string, isNew: bool }
let imageUploadQueue = [];    // files to upload on form submit
let translateLoadingEl = null;

// v16: per-table pagination state — each table keeps its full dataset
// client-side and slices PAGE_SIZE rows per page.
let _activeProjectsAll = [];
let _activeProjectsPage = 1;
let _inactiveProjectsAll = [];
let _inactiveProjectsPage = 1;
let _contactsAll = [];
let _contactsPage = 1;
let _accountsAll = [];
let _accountsPage = 1;
let _auditLogAll = [];
let _auditLogPage = 1;
let _videosAll = [];
let _videosPage = 1;
let _newsAll = [];
let _newsPage = 1;

// ===================== PAGINATION =====================
const PAGE_SIZE = 10;

function paginate(data, page) {
    const start = (page - 1) * PAGE_SIZE;
    return (data || []).slice(start, start + PAGE_SIZE);
}

function renderPagination(containerId, totalItems, currentPage, onPageChange) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const totalPages = Math.max(1, Math.ceil((totalItems || 0) / PAGE_SIZE));
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} title="Previous"><i class="fas fa-chevron-left"></i></button>`;
    for (let p = 1; p <= totalPages; p++) {
        html += `<button class="page-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
    }
    html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} title="Next"><i class="fas fa-chevron-right"></i></button>`;
    el.innerHTML = html;
    el.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const page = parseInt(btn.dataset.page, 10);
            if (!page || page === currentPage) return;
            onPageChange(page);
        });
    });
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    // v14: Dashboard is the default active section on load, but the
    // About-Stats grid previously only loaded via switchSection('dashboard')
    // on click — leaving it empty until the user clicked the tab.
    loadHomeAbout();
    ensurePreviewLoaded('settings');
    setupNavigation();
    setupSubTabs();
    setupForms();
    setupSettingsUpload();

    // Realtime project search with debounce
    const searchInput = document.getElementById('project-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(projectSearchTimeout);
            projectSearchTimeout = setTimeout(() => {
                currentProjectKeyword = e.target.value.trim();
                loadActiveProjects();
                loadInactiveProjects();
            }, 400);
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(projectSearchTimeout);
                currentProjectKeyword = e.target.value.trim();
                loadActiveProjects();
                loadInactiveProjects();
            }
        });
    }

    // Project images picker — open media library (multi-select)
    const uploadTrigger = document.getElementById('image-upload-trigger');
    if (uploadTrigger) {
        uploadTrigger.addEventListener('click', () => {
            openMediaLibrary({
                mode: 'multi',
                onSelect: (urls) => {
                    urls.forEach(url => {
                        currentProjectImages.push({
                            id: null,
                            image_path: url,
                            isNew: true,
                            isBlob: false,
                            order: currentProjectImages.length + 1
                        });
                    });
                    renderProjectImagesList();
                    showToast('Đã thêm ' + urls.length + ' ảnh', 'success');
                }
            });
        });
    }

    // Realtime contact search with debounce
    const contactSearchInput = document.getElementById('contact-search');
    if (contactSearchInput) {
        contactSearchInput.addEventListener('input', (e) => {
            clearTimeout(contactSearchTimeout);
            contactSearchTimeout = setTimeout(() => {
                const keyword = e.target.value.trim();
                if (keyword) {
                    searchContacts();
                } else {
                    loadContacts();
                }
            }, 400);
        });
    }
});

// ===================== NAVIGATION =====================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// v20: secondary sub-navbar inside a content-section. Clicking a
// .sub-nav-item shows the matching .sub-tab-panel and hides its siblings
// within the same data-subtab-group. Live Preview / always-visible panels
// live outside .sub-tab-panel and are unaffected.
function setupSubTabs() {
    document.querySelectorAll('.sub-nav').forEach(nav => {
        const group = nav.dataset.subtabGroup;
        nav.querySelectorAll('.sub-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.subtab;
                nav.querySelectorAll('.sub-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll(`.sub-tab-panel[data-subtab-group="${group}"]`).forEach(p => {
                    p.classList.toggle('active', p.dataset.subtabPanel === target);
                });
            });
        });
    });
}

function switchSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');

    switch (section) {
        case 'dashboard': loadDashboard(); loadHomeAbout(); ensurePreviewLoaded('settings'); break;
        case 'projects': loadProjects(); break;
        case 'contacts': loadContacts(); break;
        case 'accounts': loadAccounts(); break;
        case 'audit-log': loadAuditLog(); break;
        case 'home-about':
            loadAboutContent(); loadAboutServices(); loadAboutLeadership(); loadAboutTeam();
            ensurePreviewLoaded('about');
            break;
        case 'home-services': loadHomeServices(); ensurePreviewLoaded('services'); break;
        case 'home-footer': loadHomeFooter(); loadFooterContent(); ensurePreviewLoaded('footer'); break;
        case 'invest': loadInvestContent(); ensurePreviewLoaded('invest'); break;
        case 'videos': loadVideosAdmin(); break;
        case 'news': loadNewsAdmin(); break;
    }
}

// ===================== DASHBOARD =====================
let currentLogoFile = null;   // File to upload for logo
let currentMainImageFile = null; // File to upload for main image
let currentLogoPath = '';     // Server path of current logo
let currentMainImagePath = ''; // Server path of current main image

async function loadDashboard() {
    try {
        const [projectsRes, contactsRes, accountsRes] = await Promise.all([
            fetch('/api/admin/projects?includeInactive=false'),
            fetch('/api/admin/contacts'),
            fetch('/api/admin/accounts')
        ]);

        const projectsData = await projectsRes.json();
        const contactsData = await contactsRes.json();
        const accountsData = await accountsRes.json();

        document.getElementById('stat-projects').textContent = projectsData.data?.length || 0;
        document.getElementById('stat-contacts').textContent = contactsData.data?.length || 0;
        document.getElementById('stat-accounts').textContent = accountsData.data?.length || 0;

        const settingsRes = await fetch('/api/admin/settings');
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.data) {
            document.getElementById('setting-phone').value = settingsData.data.phone || '';

            // Logo: show current image if path exists
            currentLogoPath = settingsData.data.logo || '';
            if (currentLogoPath) {
                const logoSrc = currentLogoPath.startsWith('/') ? currentLogoPath : '/' + currentLogoPath;
                document.getElementById('current-logo-img').src = logoSrc;
                document.getElementById('current-logo-img').style.display = 'block';
                document.getElementById('logo-preview-placeholder').style.display = 'none';
                document.getElementById('logo-remove-btn').style.display = 'inline-flex';
            } else {
                document.getElementById('current-logo-img').style.display = 'none';
                document.getElementById('logo-preview-placeholder').style.display = 'flex';
                document.getElementById('logo-remove-btn').style.display = 'none';
            }
            currentLogoFile = null;

            // Main image: show current image if path exists
            currentMainImagePath = settingsData.data.main_image || '';
            if (currentMainImagePath) {
                const mainSrc = currentMainImagePath.startsWith('/') ? currentMainImagePath : '/' + currentMainImagePath;
                document.getElementById('current-main-image-img').src = mainSrc;
                document.getElementById('current-main-image-img').style.display = 'block';
                document.getElementById('main-image-preview-placeholder').style.display = 'none';
                document.getElementById('main-image-remove-btn').style.display = 'inline-flex';
            } else {
                document.getElementById('current-main-image-img').style.display = 'none';
                document.getElementById('main-image-preview-placeholder').style.display = 'flex';
                document.getElementById('main-image-remove-btn').style.display = 'none';
            }
            currentMainImageFile = null;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ===================== INVEST SECTION =====================
// v15: "Why Invest in Australia" content + video now live in their own tab
async function loadInvestContent() {
    try {
        const res = await fetch('/api/admin/settings');
        const result = await res.json();
        if (!result.success || !result.data) return;
        const s = result.data;

        document.getElementById('setting-purpose-tagline').value = s.purpose_tagline || '';
        document.getElementById('setting-purpose-heading').value = s.purpose_heading || '';
        [1, 2, 3, 4].forEach(i => {
            document.getElementById('setting-purpose-list-' + i).value = s['purpose_list_' + i] || '';
        });
        document.getElementById('setting-purpose-cta-text').value = s.purpose_cta_text || '';
        document.getElementById('setting-purpose-video-caption').value = s.purpose_video_caption || '';

        window._currentPurposeThumb = s.purpose_video_thumbnail || '';
        window._currentPurposeVideo = s.purpose_video_url || '';

        const thumbVal = window._currentPurposeThumb;
        const thumbImg = document.getElementById('current-purpose-thumb-img');
        const thumbPh = document.getElementById('purpose-thumb-preview-placeholder');
        const thumbRm = document.getElementById('purpose-thumb-remove-btn');
        if (thumbVal && thumbImg) {
            thumbImg.src = thumbVal.startsWith('/') ? thumbVal : '/' + thumbVal;
            thumbImg.style.display = 'block';
            if (thumbPh) thumbPh.style.display = 'none';
            if (thumbRm) thumbRm.style.display = 'inline-flex';
        } else if (thumbImg) {
            thumbImg.style.display = 'none';
            if (thumbPh) thumbPh.style.display = 'flex';
            if (thumbRm) thumbRm.style.display = 'none';
        }

        // B: Invest video is an uploaded file picked via Media Library
        const videoVal = window._currentPurposeVideo;
        const videoEl = document.getElementById('current-purpose-video');
        const videoPh = document.getElementById('purpose-video-preview-placeholder');
        const videoRm = document.getElementById('purpose-video-remove-btn');
        if (videoVal && videoEl) {
            videoEl.src = videoVal.startsWith('/') || /^https?:\/\//i.test(videoVal) ? videoVal : '/' + videoVal;
            videoEl.style.display = 'block';
            if (videoPh) videoPh.style.display = 'none';
            if (videoRm) videoRm.style.display = 'inline-flex';
        } else if (videoEl) {
            videoEl.style.display = 'none';
            videoEl.src = '';
            if (videoPh) videoPh.style.display = 'flex';
            if (videoRm) videoRm.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading invest content:', error);
    }
}

async function saveInvestContent() {
    const data = {
        purpose_tagline: document.getElementById('setting-purpose-tagline').value,
        purpose_heading: document.getElementById('setting-purpose-heading').value,
        purpose_list_1: document.getElementById('setting-purpose-list-1').value,
        purpose_list_2: document.getElementById('setting-purpose-list-2').value,
        purpose_list_3: document.getElementById('setting-purpose-list-3').value,
        purpose_list_4: document.getElementById('setting-purpose-list-4').value,
        purpose_cta_text: document.getElementById('setting-purpose-cta-text').value,
        purpose_video_caption: document.getElementById('setting-purpose-video-caption').value,
        purpose_video_thumbnail: window._currentPurposeThumb || '',
        purpose_video_url: window._currentPurposeVideo || ''
    };

    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            showToast('Invest content saved successfully!', 'success');
            refreshPreview('invest');
        } else {
            showToast(result.message || 'Error saving invest content', 'error');
        }
    } catch (error) {
        showToast('Error saving invest content', 'error');
    }
}

// ===================== SETTINGS UPLOAD HELPERS =====================
function setupSettingsUpload() {
    // Logo upload
    const logoBtn = document.getElementById('logo-pick-btn');
    if (logoBtn) {
        logoBtn.addEventListener('click', () => {
            openMediaLibrary({
                mode: 'single',
                onSelect: ([url]) => {
                    currentLogoFile = null;
                    currentLogoPath = url;
                    window._pendingLogoDataUrl = null;
                    document.getElementById('current-logo-img').src = url;
                    document.getElementById('current-logo-img').style.display = 'block';
                    document.getElementById('logo-preview-placeholder').style.display = 'none';
                    document.getElementById('logo-remove-btn').style.display = 'inline-flex';
                    postPreviewData('settings');
                }
            });
        });
    }

    // Main image picker
    const mainBtn = document.getElementById('main-image-pick-btn');
    if (mainBtn) {
        mainBtn.addEventListener('click', () => {
            openMediaLibrary({
                mode: 'single',
                onSelect: ([url]) => {
                    currentMainImageFile = null;
                    currentMainImagePath = url;
                    window._pendingMainImageDataUrl = null;
                    document.getElementById('current-main-image-img').src = url;
                    document.getElementById('current-main-image-img').style.display = 'block';
                    document.getElementById('main-image-preview-placeholder').style.display = 'none';
                    document.getElementById('main-image-remove-btn').style.display = 'inline-flex';
                    postPreviewData('settings');
                }
            });
        });
    }

    // F06: Purpose-Invest video thumbnail picker
    const purposeThumbBtn = document.getElementById('purpose-thumb-pick-btn');
    if (purposeThumbBtn) {
        purposeThumbBtn.addEventListener('click', () => {
            openMediaLibrary({
                mode: 'single',
                onSelect: ([url]) => {
                    window._currentPurposeThumb = url;
                    const img = document.getElementById('current-purpose-thumb-img');
                    const ph = document.getElementById('purpose-thumb-preview-placeholder');
                    const rm = document.getElementById('purpose-thumb-remove-btn');
                    if (img) { img.src = url; img.style.display = 'block'; }
                    if (ph) ph.style.display = 'none';
                    if (rm) rm.style.display = 'inline-flex';
                    postPreviewData('invest');
                }
            });
        });
    }

    // B: Purpose-Invest video file picker (uploaded MP4, via Media Library)
    const purposeVideoBtn = document.getElementById('purpose-video-pick-btn');
    if (purposeVideoBtn) {
        purposeVideoBtn.addEventListener('click', () => {
            openMediaLibrary({
                mode: 'single',
                onSelect: ([url]) => {
                    window._currentPurposeVideo = url;
                    const video = document.getElementById('current-purpose-video');
                    const ph = document.getElementById('purpose-video-preview-placeholder');
                    const rm = document.getElementById('purpose-video-remove-btn');
                    if (video) { video.src = url; video.style.display = 'block'; }
                    if (ph) ph.style.display = 'none';
                    if (rm) rm.style.display = 'inline-flex';
                    postPreviewData('invest');
                }
            });
        });
    }
}

function removePurposeThumb() {
    window._currentPurposeThumb = '';
    const img = document.getElementById('current-purpose-thumb-img');
    const ph = document.getElementById('purpose-thumb-preview-placeholder');
    const rm = document.getElementById('purpose-thumb-remove-btn');
    if (img) img.style.display = 'none';
    if (ph) ph.style.display = 'flex';
    if (rm) rm.style.display = 'none';
}

function removePurposeVideo() {
    window._currentPurposeVideo = '';
    const video = document.getElementById('current-purpose-video');
    const ph = document.getElementById('purpose-video-preview-placeholder');
    const rm = document.getElementById('purpose-video-remove-btn');
    if (video) { video.style.display = 'none'; video.src = ''; }
    if (ph) ph.style.display = 'flex';
    if (rm) rm.style.display = 'none';
}

function removeLogoImage() {
    currentLogoFile = null;
    currentLogoPath = '';
    document.getElementById('current-logo-img').style.display = 'none';
    document.getElementById('logo-preview-placeholder').style.display = 'flex';
    document.getElementById('logo-remove-btn').style.display = 'none';
}

function removeMainImage() {
    currentMainImageFile = null;
    currentMainImagePath = '';
    document.getElementById('current-main-image-img').style.display = 'none';
    document.getElementById('main-image-preview-placeholder').style.display = 'flex';
    document.getElementById('main-image-remove-btn').style.display = 'none';
}

// ===================== SETTINGS =====================
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    let logoValue = currentLogoPath;
    let mainImageValue = currentMainImagePath;

    // Upload logo if new file selected
    if (currentLogoFile) {
        try {
            const formData = new FormData();
            formData.append('media', currentLogoFile);
            const res = await fetch('/api/admin/projects/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                logoValue = result.path;
            }
        } catch (error) {
            showToast('Error uploading logo', 'error');
            return;
        }
    }

    // Upload main image if new file selected
    if (currentMainImageFile) {
        try {
            const formData = new FormData();
            formData.append('media', currentMainImageFile);
            const res = await fetch('/api/admin/projects/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                // F10.fix: upload handler already returns /uploads/<file> — store verbatim
                mainImageValue = result.path;
            }
        } catch (error) {
            showToast('Error uploading main image', 'error');
            return;
        }
    }

    const data = {
        logo: logoValue,
        phone: document.getElementById('setting-phone').value,
        main_image: mainImageValue
    };

    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            // Update state after successful save
            if (currentLogoFile) currentLogoPath = logoValue;
            if (currentMainImageFile) currentMainImagePath = mainImageValue;
            currentLogoFile = null;
            currentMainImageFile = null;
            window._pendingLogoDataUrl = null;
            window._pendingMainImageDataUrl = null;
            showToast('Settings saved successfully!', 'success');
            refreshPreview('settings');
        } else {
            showToast(result.message || 'Error saving settings', 'error');
        }
    } catch (error) {
        showToast('Error saving settings', 'error');
    }
});

// ===================== PROJECT IMAGES (tableimages) =====================
async function handleNewImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Only image files are allowed', 'error');
        return;
    }
    if (file.size > 50 * 1024 * 1024) {
        showToast('File must be under 50MB', 'error');
        return;
    }

    const tempId = 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const previewUrl = URL.createObjectURL(file);

    // Add to state (pending upload)
    currentProjectImages.push({
        id: null,
        image_path: previewUrl,
        isNew: true,
        isBlob: true,
        order: currentProjectImages.length + 1
    });

    // Add to queue for upload on submit
    imageUploadQueue.push({ tempId, file, order: currentProjectImages.length });

    renderProjectImagesList();
}

function renderProjectImagesList() {
    const container = document.getElementById('project-images-list');
    if (!container) return;

    container.innerHTML = currentProjectImages.map((img, index) => `
        <div class="project-image-thumb" data-index="${index}">
            <img src="${img.image_path}" alt="" onerror="this.src='https://via.placeholder.com/80?text=No+Img'">
            <span class="img-order">${index + 1}</span>
            <button type="button" class="img-remove-btn" onclick="removeProjectImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeProjectImage(index) {
    const img = currentProjectImages[index];
    // Remove from queue if it's a new pending upload
    if (img.isNew && img.isBlob) {
        imageUploadQueue = imageUploadQueue.filter(q => q.order !== index);
    }
    currentProjectImages.splice(index, 1);
    renderProjectImagesList();
}

async function loadProjectImagesForEdit(projectId) {
    try {
        const res = await fetch(`/api/admin/project-images/${projectId}`);
        const data = await res.json();
        if (data.success && data.data) {
            currentProjectImages = data.data.map((img, i) => ({
                id: img.id,
                image_path: img.image_path,
                isNew: false,
                order: img.display_order || i + 1
            }));
        } else {
            currentProjectImages = [];
        }
    } catch (error) {
        currentProjectImages = [];
    }
}

// ===================== PROJECTS =====================
function loadActiveProjects() {
    const keyword = currentProjectKeyword || '';
    fetch(`/api/admin/projects/search?keyword=${encodeURIComponent(keyword)}&status=active`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                _activeProjectsAll = data.data || [];
                _activeProjectsPage = 1;
                renderActiveProjects();
            }
        });
}

function loadInactiveProjects() {
    const keyword = currentProjectKeyword || '';
    fetch(`/api/admin/projects/search?keyword=${encodeURIComponent(keyword)}&status=inactive`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                _inactiveProjectsAll = data.data || [];
                _inactiveProjectsPage = 1;
                renderInactiveProjects();
            }
        });
}

function renderActiveProjects() {
    const tbody = document.getElementById('active-projects-tbody');
    if (_activeProjectsAll.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#95a5a6;">No active projects</td></tr>';
        renderPagination('active-projects-pagination', 0, 1, () => {});
        return;
    }
    const projects = paginate(_activeProjectsAll, _activeProjectsPage);
    const offset = (_activeProjectsPage - 1) * PAGE_SIZE;
    tbody.innerHTML = projects.map((p, i) => `
        <tr>
            <td>${offset + i + 1}</td>
            <td><img src="${p.image_path || 'placeholder.jpg'}" alt="" onerror="this.src='https://via.placeholder.com/80x60?text=No+Img'"></td>
            <td>${escapeHtml(p.name)}</td>
            <td><span class="status-badge status-${p.area}">${capitalize(p.area)}</span></td>
            <td>${p.square_meters || '-'}</td>
            <td>${escapeHtml(p.category || '-')}</td>
            <td>${p.year || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editProject(${p.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="confirmAction('Ngừng kinh doanh dự án này?', () => softDeleteProject(${p.id}))" title="Stop"><i class="fas fa-ban"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    renderPagination('active-projects-pagination', _activeProjectsAll.length, _activeProjectsPage, (page) => {
        _activeProjectsPage = page;
        renderActiveProjects();
    });
}

function renderInactiveProjects() {
    const tbody = document.getElementById('inactive-projects-tbody');
    if (_inactiveProjectsAll.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#95a5a6;">No inactive projects</td></tr>';
        renderPagination('inactive-projects-pagination', 0, 1, () => {});
        return;
    }
    const projects = paginate(_inactiveProjectsAll, _inactiveProjectsPage);
    const offset = (_inactiveProjectsPage - 1) * PAGE_SIZE;
    tbody.innerHTML = projects.map((p, i) => `
        <tr>
            <td>${offset + i + 1}</td>
            <td><img src="${p.image_path || 'placeholder.jpg'}" alt="" onerror="this.src='https://via.placeholder.com/80x60?text=No+Img'"></td>
            <td>${escapeHtml(p.name)}</td>
            <td><span class="status-badge status-${p.area}">${capitalize(p.area)}</span></td>
            <td>${p.square_meters || '-'}</td>
            <td>${escapeHtml(p.category || '-')}</td>
            <td>${p.year || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn restore" onclick="restoreProject(${p.id})" title="Restore"><i class="fas fa-undo"></i> Restore</button>
                    <button class="action-btn delete" onclick="confirmAction('Xóa vĩnh viễn dự án này?', () => permanentlyDeleteProject(${p.id}))" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    renderPagination('inactive-projects-pagination', _inactiveProjectsAll.length, _inactiveProjectsPage, (page) => {
        _inactiveProjectsPage = page;
        renderInactiveProjects();
    });
}

// A2: price is stored as "From $X,XXX" — admin enters/edits just the plain number
function parsePriceNumber(priceStr) {
    return String(priceStr || '').replace(/[^0-9]/g, '');
}
function formatPriceFromNumber(numStr) {
    const digits = String(numStr || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    return 'From $' + parseInt(digits, 10).toLocaleString('en-US');
}

async function editProject(id) {
    try {
        const res = await fetch(`/api/admin/projects/${id}`);
        const data = await res.json();
        if (!data.success) { showToast('Project not found', 'error'); return; }
        const p = data.data;
        currentEditId = id;
        document.getElementById('project-modal-title').textContent = 'Edit Project';
        document.getElementById('project-id').value = id;
        document.getElementById('project-name').value = p.name || '';
        document.getElementById('project-area').value = p.area || '';
        document.getElementById('project-square').value = p.square_meters || '';
        document.getElementById('project-category').value = p.category || '';
        document.getElementById('project-year').value = p.year || '';
        document.getElementById('project-style').value = p.style || '';
        document.getElementById('project-content').value = p.small_content || '';
        // F05d: 8 extended fields
        document.getElementById('project-price').value = parsePriceNumber(p.price);
        document.getElementById('project-state').value = p.state || '';
        document.getElementById('project-property-type').value = p.property_type || '';
        document.getElementById('project-address').value = p.address || '';
        document.getElementById('project-beds').value = p.beds || '';
        document.getElementById('project-baths').value = p.baths || '';
        document.getElementById('project-cars').value = p.cars || '';

        // Load images from tableimages
        await loadProjectImagesForEdit(id);
        renderProjectImagesList();
        imageUploadQueue = [];

        document.getElementById('project-modal').style.display = 'flex';
    } catch (error) {
        showToast('Error loading project', 'error');
    }
}

function openProjectModal() {
    currentEditId = null;
    currentProjectImages = [];
    imageUploadQueue = [];
    document.getElementById('project-modal-title').textContent = 'Add Project';
    document.getElementById('project-form').reset();
    document.getElementById('project-id').value = '';
    renderProjectImagesList();
    document.getElementById('project-modal').style.display = 'flex';
}

function closeProjectModal() {
    document.getElementById('project-modal').style.display = 'none';
    currentEditId = null;
    currentProjectImages = [];
    imageUploadQueue = [];
}

async function softDeleteProject(id) {
    try {
        const res = await fetch(`/api/admin/projects/${id}/soft-delete`, { method: 'PUT' });
        const data = await res.json();
        if (data.success) {
            showToast('Project stopped', 'success');
            loadActiveProjects();
            loadInactiveProjects();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error stopping project', 'error');
    }
}

async function restoreProject(id) {
    try {
        const res = await fetch(`/api/admin/projects/${id}/restore`, { method: 'PUT' });
        const data = await res.json();
        if (data.success) {
            showToast('Project restored', 'success');
            loadActiveProjects();
            loadInactiveProjects();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error restoring project', 'error');
    }
}

async function permanentlyDeleteProject(id) {
    try {
        const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Project permanently deleted', 'success');
            loadInactiveProjects();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error deleting project', 'error');
    }
}

function resetProjectSearch() {
    document.getElementById('project-search').value = '';
    currentProjectKeyword = '';
    loadActiveProjects();
    loadInactiveProjects();
}

document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Step 1: Upload all new images and collect server paths
    for (const item of imageUploadQueue) {
        try {
            const formData = new FormData();
            formData.append('media', item.file);
            const uploadRes = await fetch('/api/admin/projects/upload', { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
                // Update currentProjectImages with the real server path
                const imgEntry = currentProjectImages.find(img => img.isNew && img.isBlob && img.order === item.order);
                if (imgEntry) {
                    imgEntry.image_path = uploadData.path;
                    imgEntry.isBlob = false;
                    console.log('Uploaded:', uploadData.path);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    }
    imageUploadQueue = []; // clear queue after upload

    // Step 2: Save project
    const areaSelect = document.getElementById('project-area');
    const areaLabel = areaSelect.selectedOptions[0] ? areaSelect.selectedOptions[0].text.toUpperCase() : '';
    const payload = {
        name: document.getElementById('project-name').value,
        area: areaSelect.value,
        square_meters: document.getElementById('project-square').value,
        category: document.getElementById('project-category').value,
        year: document.getElementById('project-year').value,
        style: document.getElementById('project-style').value,
        small_content: document.getElementById('project-content').value,
        // F05d: 8 extended fields
        price: formatPriceFromNumber(document.getElementById('project-price').value),
        state: document.getElementById('project-state').value,
        property_type: document.getElementById('project-property-type').value,
        area_label: areaLabel,
        address: document.getElementById('project-address').value.trim(),
        beds: document.getElementById('project-beds').value.trim(),
        baths: document.getElementById('project-baths').value.trim(),
        cars: document.getElementById('project-cars').value.trim()
    };

    try {
        let projectId = currentEditId;

        if (currentEditId) {
            // Update existing project
            const res = await fetch(`/api/admin/projects/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!result.success) {
                showToast(result.message || 'Error saving project', 'error');
                return;
            }
        } else {
            // Create new project
            const res = await fetch('/api/admin/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!result.success) {
                showToast(result.message || 'Error saving project', 'error');
                return;
            }
            projectId = result.id;
        }

        console.log('Project saved, id:', projectId);
        console.log('currentProjectImages before sync:', JSON.parse(JSON.stringify(currentProjectImages)));

        // Step 3: Sync images to tableimages
        // Remove DB images that are no longer in currentProjectImages
        if (currentEditId) {
            const keepIds = currentProjectImages.filter(img => !img.isNew).map(img => String(img.id));
            console.log('KeepIds:', keepIds);
            try {
                const allDbRes = await fetch(`/api/admin/project-images/${currentEditId}`);
                const allDbData = await allDbRes.json();
                console.log('DB images for project:', allDbData);
                if (allDbData.success && allDbData.data) {
                    for (const dbImg of allDbData.data) {
                        if (!keepIds.includes(String(dbImg.id))) {
                            await fetch(`/api/admin/project-images/${dbImg.id}`, { method: 'DELETE' });
                            console.log('Deleted image:', dbImg.id);
                        }
                    }
                }
            } catch (e) {
                console.error('Step 3 error:', e);
            }
        }

        // Step 4: Insert/update images in tableimages
        for (let i = 0; i < currentProjectImages.length; i++) {
            const img = currentProjectImages[i];
            const order = i + 1;
            try {
                if (img.isNew) {
                    const postRes = await fetch('/api/admin/project-images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ project_id: projectId, image_path: img.image_path, display_order: order })
                    });
                    const postData = await postRes.json();
                    console.log('Insert image result:', postData);
                } else {
                    await fetch(`/api/admin/project-images/${img.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_path: img.image_path, display_order: order })
                    });
                }
            } catch (e) {
                console.error('Step 4 error for image:', img, e);
            }
        }

        // Step 5: Always sync projects.image_path = ảnh đầu tiên từ tableimages
        try {
            const firstImgRes = await fetch(`/api/admin/project-images/${projectId}`);
            const firstImgData = await firstImgRes.json();
            console.log('Step 5 - fetched images:', firstImgData);
            if (firstImgData.success && firstImgData.data && firstImgData.data.length > 0) {
                const firstImg = firstImgData.data[0];
                // F10.fix: sync image_path verbatim (already /uploads/<file> from Media Library)
                const syncPath = firstImg.image_path || '';
                console.log('Setting image_path to:', syncPath);
                await fetch(`/api/admin/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_path: syncPath })
                });
                console.log('image_path synced!');
            } else {
                console.log('No images found in tableimages for this project');
            }
        } catch (e) {
            console.error('Step 5 error:', e);
        }

        showToast(currentEditId ? 'Project updated!' : 'Project added!', 'success');
        closeProjectModal();
        renderProjectImagesList();
        loadActiveProjects();
        loadInactiveProjects();
    } catch (error) {
        showToast('Error saving project', 'error');
        console.error('Submit error:', error);
    }
});

async function searchProjects() {
    loadActiveProjects();
    loadInactiveProjects();
}

function loadProjects() {
    loadActiveProjects();
    loadInactiveProjects();
    loadFeaturedPanel();   // v2
}

// ===================== v2: FEATURED PROJECTS PANEL =====================
// v3: split into 2 rows — "Đã chọn" (selected, max 4) on top and
// "Tất cả Projects đang Active" (unselected, paginated 5/page) below.
// Selecting a card moves it up to the selected row; deselecting moves it back down.
let _featuredSelection = new Set();
let _featuredAllActive = [];
let _featuredPage = 1;
const FEATURED_PAGE_SIZE = 5;

async function loadFeaturedPanel() {
    const grid = document.getElementById('featured-available-grid');
    if (!grid) return;
    try {
        const [allRes, featRes] = await Promise.all([
            fetch('/api/admin/projects'),
            fetch('/api/admin/projects/featured')
        ]);
        const allJson = await allRes.json();
        const featJson = await featRes.json();
        _featuredAllActive = (allJson.success && Array.isArray(allJson.data)) ? allJson.data.filter(p => p.status === 'active') : [];
        const featuredIds = (featJson.success && Array.isArray(featJson.data)) ? featJson.data.map(p => p.id) : [];
        _featuredSelection = new Set(featuredIds);
        _featuredPage = 1;
        renderFeaturedPanel();
    } catch (err) {
        console.error('loadFeaturedPanel:', err);
    }
}

function featuredCardHtml(p) {
    const isSel = _featuredSelection.has(p.id);
    const cover = (p.image_path || '/uploads/main_image.jpg');
    return `<div class="featured-card ${isSel ? 'selected' : ''}" data-id="${p.id}" onclick="toggleFeatured(${p.id})">
        <img src="${cover}" alt="" onerror="this.style.visibility='hidden'">
        <div class="featured-card-body">
            <p class="featured-card-name">${(p.name || '').replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>
            <span class="featured-card-area">${(p.area || '').toString()}</span>
        </div>
    </div>`;
}

function renderFeaturedPanel() {
    const selGrid = document.getElementById('featured-selected-grid');
    const availGrid = document.getElementById('featured-available-grid');
    if (!selGrid || !availGrid) return;

    const selected = _featuredAllActive.filter(p => _featuredSelection.has(p.id));
    const available = _featuredAllActive.filter(p => !_featuredSelection.has(p.id));

    selGrid.innerHTML = selected.length
        ? selected.map(featuredCardHtml).join('')
        : '<p class="featured-empty">Chưa chọn project nào</p>';

    const totalPages = Math.max(1, Math.ceil(available.length / FEATURED_PAGE_SIZE));
    if (_featuredPage > totalPages) _featuredPage = totalPages;
    const start = (_featuredPage - 1) * FEATURED_PAGE_SIZE;
    const pageItems = available.slice(start, start + FEATURED_PAGE_SIZE);

    availGrid.innerHTML = pageItems.length
        ? pageItems.map(featuredCardHtml).join('')
        : '<p class="featured-empty">Không còn project nào</p>';

    renderFeaturedPagination(totalPages);
    updateFeaturedCounter();
}

function renderFeaturedPagination(totalPages) {
    const pag = document.getElementById('featured-pagination');
    if (!pag) return;
    if (totalPages <= 1) { pag.innerHTML = ''; return; }
    let html = `<button class="page-btn" ${_featuredPage === 1 ? 'disabled' : ''} onclick="changeFeaturedPage(${_featuredPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === _featuredPage ? 'active' : ''}" onclick="changeFeaturedPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${_featuredPage === totalPages ? 'disabled' : ''} onclick="changeFeaturedPage(${_featuredPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    pag.innerHTML = html;
}

function changeFeaturedPage(page) {
    _featuredPage = page;
    renderFeaturedPanel();
}

function updateFeaturedCounter() {
    const c = document.getElementById('featured-counter');
    if (c) c.textContent = `${_featuredSelection.size} / 4 selected`;
    // disable available cards once 4 are selected
    document.querySelectorAll('#featured-available-grid .featured-card').forEach(card => {
        if (_featuredSelection.size >= 4) {
            card.classList.add('disabled');
        } else {
            card.classList.remove('disabled');
        }
    });
}

function toggleFeatured(id) {
    if (_featuredSelection.has(id)) {
        _featuredSelection.delete(id);
    } else {
        if (_featuredSelection.size >= 4) {
            showToast('Tối đa 4 projects featured', 'error');
            return;
        }
        _featuredSelection.add(id);
    }
    renderFeaturedPanel();
}

async function saveFeaturedProjects() {
    try {
        const ids = Array.from(_featuredSelection);
        const res = await fetch('/api/admin/projects/featured', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const json = await res.json();
        if (!json.success) { showToast(json.message || 'Lỗi', 'error'); return; }
        showToast(`Đã lưu ${ids.length} featured projects`, 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ===================== CONTACTS =====================
async function loadContacts() {
    try {
        const res = await fetch('/api/admin/contacts');
        const data = await res.json();
        if (data.success) {
            _contactsAll = data.data || [];
            _contactsPage = 1;
            renderContactsTable();
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

function renderContactsTable() {
    const tbody = document.getElementById('contacts-tbody');
    if (_contactsAll.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#95a5a6;">No contacts found</td></tr>';
        renderPagination('contacts-pagination', 0, 1, () => {});
        return;
    }

    const contacts = paginate(_contactsAll, _contactsPage);
    tbody.innerHTML = contacts.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.phone || '-')}</td>
            <td>${escapeHtml(c.email || '-')}</td>
            <td>${formatDate(c.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn delete" onclick="confirmAction('Xóa liên hệ này?', () => deleteContact(${c.id}))" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    renderPagination('contacts-pagination', _contactsAll.length, _contactsPage, (page) => {
        _contactsPage = page;
        renderContactsTable();
    });
}

async function searchContacts() {
    const keyword = document.getElementById('contact-search').value.trim();
    if (!keyword) {
        loadContacts();
        return;
    }
    try {
        const res = await fetch(`/api/admin/contacts/search?keyword=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        if (data.success) {
            _contactsAll = data.data || [];
            _contactsPage = 1;
            renderContactsTable();
        }
    } catch (error) {
        showToast('Error searching contacts', 'error');
    }
}

function resetContactSearch() {
    document.getElementById('contact-search').value = '';
    loadContacts();
}

async function deleteContact(id) {
    try {
        const res = await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Contact deleted!', 'success');
            loadContacts();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error deleting contact', 'error');
    }
}

// ===================== ACCOUNTS =====================
async function loadAccounts() {
    try {
        const res = await fetch('/api/admin/accounts');
        const data = await res.json();
        if (data.success) {
            _accountsAll = data.data || [];
            _accountsPage = 1;
            renderAccountsTable();
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

function renderAccountsTable() {
    const tbody = document.getElementById('accounts-tbody');
    if (_accountsAll.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#95a5a6;">No accounts found</td></tr>';
        renderPagination('accounts-pagination', 0, 1, () => {});
        return;
    }

    const accounts = paginate(_accountsAll, _accountsPage);
    tbody.innerHTML = accounts.map(a => `
        <tr>
            <td>${a.id}</td>
            <td>${escapeHtml(a.username)}</td>
            <td>${escapeHtml(a.name || 'User')}</td>
            <td><span class="role-badge role-${a.role || 'employee'}">${a.role === 'admin' ? 'Admin' : 'Employee'}</span></td>
            <td>${formatDate(a.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editAccount(${a.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="confirmAction('Xóa tài khoản này?', () => deleteAccount(${a.id}))" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    renderPagination('accounts-pagination', _accountsAll.length, _accountsPage, (page) => {
        _accountsPage = page;
        renderAccountsTable();
    });
}

async function editAccount(id) {
    try {
        const res = await fetch('/api/admin/accounts');
        const data = await res.json();
        if (!data.success) return;
        const account = data.data.find(a => a.id == id);
        if (!account) {
            showToast('Account not found', 'error');
            return;
        }
        currentAccountEditId = id;
        document.getElementById('account-modal-title').textContent = 'Edit Account';
        document.getElementById('account-id').value = id;
        document.getElementById('account-username').value = account.username;
        document.getElementById('account-name').value = account.name || '';
        document.getElementById('account-role').value = account.role || 'employee';
        document.getElementById('account-password').value = '';
        document.getElementById('account-modal').style.display = 'flex';
    } catch (error) {
        showToast('Error loading account', 'error');
    }
}

function openAccountModal() {
    currentAccountEditId = null;
    document.getElementById('account-modal-title').textContent = 'Add Account';
    document.getElementById('account-form').reset();
    document.getElementById('account-id').value = '';
    document.getElementById('account-modal').style.display = 'flex';
}

function closeAccountModal() {
    document.getElementById('account-modal').style.display = 'none';
    currentAccountEditId = null;
}

document.getElementById('account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('account-username').value.trim();
    const password = document.getElementById('account-password').value;
    const name = document.getElementById('account-name').value.trim();
    const role = document.getElementById('account-role').value;

    if (!name) {
        showToast('Name is required', 'error');
        return;
    }

    if (!currentAccountEditId && !password) {
        showToast('Password is required', 'error');
        return;
    }

    try {
        let res, result;
        if (currentAccountEditId) {
            const body = { username, name, role };
            if (password) body.password = password;
            res = await fetch(`/api/admin/accounts/${currentAccountEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } else {
            res = await fetch('/api/admin/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, name, role })
            });
        }
        result = await res.json();
        if (result.success) {
            showToast(currentAccountEditId ? 'Account updated!' : 'Account added!', 'success');
            closeAccountModal();
            loadAccounts();
        } else {
            showToast(result.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error saving account', 'error');
    }
});

async function deleteAccount(id) {
    try {
        const res = await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Account deleted!', 'success');
            loadAccounts();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error deleting account', 'error');
    }
}

// ===================== CONFIRM MODAL =====================
function confirmAction(message, callback) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-btn').onclick = () => {
        closeConfirmModal();
        callback();
    };
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
};

// ===================== TOAST =====================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===================== FORM SETUP =====================
function setupForms() {
    // Keypress handlers are handled by realtime debounce in DOMContentLoaded
}

// ===================== HELPERS =====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalize(str) {
    if (!str) return '';
    if (str === 'goldcoast') return 'Gold Coast';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ===================== TRANSLATION =====================
async function translateField(fieldId, targetLang, sourceLang) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const originalText = field.value.trim();
    if (!originalText) {
        showToast('Please enter text to translate', 'error');
        return;
    }

    // Show loading state
    const originalValue = field.value;
    field.disabled = true;
    field.style.opacity = '0.5';

    try {
        const res = await fetch('/api/admin/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: originalText,
                targetLang: targetLang,
                sourceLang: sourceLang
            })
        });
        const data = await res.json();

        if (data.success) {
            field.value = data.translated;
            showToast('Translated successfully!', 'success');
        } else {
            showToast(data.message || 'Translation failed', 'error');
        }
    } catch (error) {
        showToast('Error connecting to translation service', 'error');
    } finally {
        field.disabled = false;
        field.style.opacity = '1';
    }
}

// ===================== LOGOUT =====================
function logoutAdmin() {
    fetch('/logout', { method: 'POST' })
        .then(() => window.location.href = '/login')
        .catch(() => window.location.href = '/login');
}

// ===================== LIVE PREVIEW =====================
// Each editable section in admin (settings, about, services, footer) has an
// iframe loading /main?preview=1&scope=X. The iframe hides other sections,
// disables interaction, and listens for postMessage('preview-data') so admin
// form input updates the preview live — no save needed.
//
// Flow:
//   1. admin loads section → ensurePreviewLoaded(target) sets iframe.src
//   2. iframe finishes loading → posts 'preview-ready' back
//   3. admin posts 'preview-data' with current form state
//   4. user types/uploads → debounced pushPreviewData → iframe re-renders
//   5. iframe posts 'preview-height' → admin resizes iframe to fit content
const PREVIEW_READY = new Set();

function refreshPreview(target) {
    const iframe = document.getElementById('preview-iframe-' + target);
    if (!iframe) return;
    PREVIEW_READY.delete(target);
    // v12: the 'about' iframe targets the dedicated /about page; others use /main
    const base = (target === 'about') ? '/about' : '/main';
    iframe.src = base + '?preview=1&scope=' + target + '&t=' + Date.now();
}

function ensurePreviewLoaded(target) {
    const iframe = document.getElementById('preview-iframe-' + target);
    if (!iframe) return;
    const src = iframe.getAttribute('src') || '';
    if (src && src !== 'about:blank' && src.includes('preview=1')) return;
    refreshPreview(target);
}

function postPreviewData(target) {
    const iframe = document.getElementById('preview-iframe-' + target);
    if (!iframe || !iframe.contentWindow) return;
    if (!PREVIEW_READY.has(target)) return;   // iframe not loaded yet
    const data = gatherPreviewData(target);
    iframe.contentWindow.postMessage({ type: 'preview-data', target, data }, window.location.origin);
}

function gatherPreviewData(target) {
    if (target === 'settings') {
        const v = id => (document.getElementById(id) || {}).value || '';
        // v13: About Stats grid (now in Dashboard) — #about-stats-info lives inside
        // #home-section, so it's visible in the settings-scope preview.
        const stats = [];
        document.querySelectorAll('#about-stats-grid input[data-slot]').forEach(inp => {
            const slot = parseInt(inp.dataset.slot, 10);
            const field = inp.dataset.field;
            let entry = stats.find(s => s.slot === slot);
            if (!entry) { entry = { slot }; stats.push(entry); }
            entry[field] = inp.value;
        });
        return {
            logo: window._pendingLogoDataUrl || currentLogoPath || '',
            phone: v('setting-phone'),
            main_image: window._pendingMainImageDataUrl || currentMainImagePath || '',
            // v11: footer fields driven through the settings scope so the
            // /main preview iframe (which loads the full footer) reacts live.
            footer_desc:         v('setting-footer-desc'),
            footer_address:      v('setting-footer-address'),
            footer_copyright:    v('setting-footer-copyright'),
            footer_facebook_url: v('setting-footer-facebook'),
            footer_linkedin_url: v('setting-footer-linkedin'),
            footer_youtube_url:  v('setting-footer-youtube'),
            footer_tiktok_url:   v('setting-footer-tiktok'),
            stats
        };
    }
    if (target === 'invest') {
        const v = id => (document.getElementById(id) || {}).value || '';
        return {
            purpose_tagline:       v('setting-purpose-tagline'),
            purpose_heading:       v('setting-purpose-heading'),
            purpose_list_1:        v('setting-purpose-list-1'),
            purpose_list_2:        v('setting-purpose-list-2'),
            purpose_list_3:        v('setting-purpose-list-3'),
            purpose_list_4:        v('setting-purpose-list-4'),
            purpose_cta_text:      v('setting-purpose-cta-text'),
            purpose_video_caption: v('setting-purpose-video-caption'),
            purpose_video_thumbnail: window._currentPurposeThumb || '',
            purpose_video_url:     v('setting-purpose-video-url')
        };
    }
    if (target === 'about') {
        const v = id => (document.getElementById(id) || {}).value || '';
        const stats = [];
        document.querySelectorAll('#about-stats-grid input[data-slot]').forEach(inp => {
            const slot = parseInt(inp.dataset.slot, 10);
            const field = inp.dataset.field;
            let entry = stats.find(s => s.slot === slot);
            if (!entry) { entry = { slot }; stats.push(entry); }
            entry[field] = inp.value;
        });
        // v13: pull Leadership (Director/Co-Founder) from About-tab editor first, fall back to Footer-tab editor
        const footer_persons = [];
        const aboutLead = document.querySelectorAll('#about-leadership-cards .settings-panel');
        const src = aboutLead.length ? aboutLead : document.querySelectorAll('#home-footer-cards .settings-panel');
        src.forEach(card => {
            const q = (sel) => (card.querySelector(sel) || {}).value || '';
            footer_persons.push({
                slot: parseInt(card.dataset.slot, 10),
                name:   q('.al-name')   || q('.fp-name'),
                email:  q('.al-email')  || q('.fp-email'),
                phone1: q('.al-phone1') || q('.fp-phone1'),
                phone2: q('.al-phone2') || q('.fp-phone2'),
                facebook_url: q('.al-fb') || q('.fp-fb'),
                avatar_path: card.dataset.avatarPath || ''
            });
        });

        // v13: Team grid (6 members from About tab)
        const team_members = [];
        document.querySelectorAll('#about-team-cards .settings-panel').forEach(card => {
            team_members.push({
                slot: parseInt(card.dataset.slot, 10),
                name: (card.querySelector('.at-name') || {}).value || '',
                role: (card.querySelector('.at-role') || {}).value || '',
                avatar_path: card.dataset.avatarPath || ''
            });
        });

        // v13: Our Services 3 cards from About tab
        const svcs = {};
        document.querySelectorAll('#about-services-cards .service-card-col').forEach(card => {
            const i = parseInt(card.dataset.slot, 10);
            svcs[`about_service_${i}_icon`]  = (card.querySelector('.as-icon')  || {}).value || '';
            svcs[`about_service_${i}_title`] = (card.querySelector('.as-title') || {}).value || '';
            svcs[`about_service_${i}_desc`]  = (card.querySelector('.as-desc')  || {}).value || '';
        });

        return {
            banner: (document.getElementById('about-input-banner') || {}).value || '',
            paragraph_left: (document.getElementById('about-input-left') || {}).value || '',
            paragraph_right: (document.getElementById('about-input-right') || {}).value || '',
            stats,
            // v12: /about page content
            about_hero_tag:           v('setting-about-hero-tag'),
            about_hero_title:         v('setting-about-hero-title'),
            about_mission:            v('setting-about-mission'),
            about_offices:            gatherAboutOffices(),
            ...svcs,
            footer_persons,
            team_members
        };
    }
    if (target === 'services') {
        const services = [];
        document.querySelectorAll('#home-services-cards .settings-panel').forEach(card => {
            services.push({
                slot: parseInt(card.dataset.slot, 10),
                title: (card.querySelector('.svc-title') || {}).value || '',
                description: (card.querySelector('.svc-desc') || {}).value || '',
                image_path: card.dataset.imagePath || ''
            });
        });
        return { services };
    }
    if (target === 'footer') {
        const v = id => (document.getElementById(id) || {}).value || '';
        const footer_persons = [];
        document.querySelectorAll('#home-footer-cards .settings-panel').forEach(card => {
            footer_persons.push({
                slot: parseInt(card.dataset.slot, 10),
                name: (card.querySelector('.fp-name') || {}).value || '',
                email: (card.querySelector('.fp-email') || {}).value || '',
                phone1: (card.querySelector('.fp-phone1') || {}).value || '',
                phone2: (card.querySelector('.fp-phone2') || {}).value || '',
                facebook_url: (card.querySelector('.fp-fb') || {}).value || '',
                avatar_path: card.dataset.avatarPath || ''
            });
        });
        return {
            footer_persons,
            // v11: include site-wide footer content so the footer preview
            // iframe also reflects desc/address/socials/copyright edits.
            footer_desc:         v('setting-footer-desc'),
            footer_address:      v('setting-footer-address'),
            footer_copyright:    v('setting-footer-copyright'),
            footer_facebook_url: v('setting-footer-facebook'),
            footer_linkedin_url: v('setting-footer-linkedin'),
            footer_youtube_url:  v('setting-footer-youtube'),
            footer_tiktok_url:   v('setting-footer-tiktok')
        };
    }
    return {};
}

// Debounced wrapper for input events
function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const pushPreviewDebounced = {
    settings: debounce(() => postPreviewData('settings'), 200),
    about: debounce(() => postPreviewData('about'), 200),
    services: debounce(() => postPreviewData('services'), 200),
    footer: debounce(() => postPreviewData('footer'), 200),
    invest: debounce(() => postPreviewData('invest'), 200)
};

// Listen for iframe messages (ready + auto-resize)
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const msg = event.data || {};
    if (msg.type === 'preview-ready') {
        PREVIEW_READY.add(msg.scope);
        postPreviewData(msg.scope);   // push initial state
    } else if (msg.type === 'preview-height') {
        // Auto-resize all 5 iframes by matching the source frame
        ['settings', 'about', 'services', 'footer', 'invest'].forEach(t => {
            const ifr = document.getElementById('preview-iframe-' + t);
            if (ifr && ifr.contentWindow === event.source && msg.height) {
                ifr.style.height = Math.min(msg.height, 1200) + 'px';
            }
        });
    }
});

// Wire input listeners on form fields → debounced postMessage
// Static fields (settings + about): wire once on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const phone = document.getElementById('setting-phone');
    if (phone) phone.addEventListener('input', pushPreviewDebounced.settings);

    // v15: "Why Invest in Australia" section content — push to invest iframe (/main)
    ['setting-purpose-tagline','setting-purpose-heading','setting-purpose-list-1',
     'setting-purpose-list-2','setting-purpose-list-3','setting-purpose-list-4',
     'setting-purpose-cta-text','setting-purpose-video-caption','setting-purpose-video-url'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', pushPreviewDebounced.invest);
    });

    // v12: Footer dynamic content (now in Footer tab) — push to settings + footer iframes
    ['setting-footer-desc','setting-footer-address','setting-footer-copyright',
     'setting-footer-facebook','setting-footer-linkedin','setting-footer-youtube',
     'setting-footer-tiktok'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            pushPreviewDebounced.settings();
            pushPreviewDebounced.footer();
        });
    });

    // v12: /about page content — push to about iframe (which loads /about?preview=1)
    ['setting-about-hero-tag','setting-about-hero-title','setting-about-mission'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => pushPreviewDebounced.about());
    });

    // v16: /about — dynamic Offices cards (add/remove, editable name). Delegate
    // input + remove-click at the container since cards are rendered dynamically.
    const officesWrap = document.getElementById('about-offices-cards');
    if (officesWrap) {
        officesWrap.addEventListener('input', () => pushPreviewDebounced.about());
        officesWrap.addEventListener('click', (e) => {
            const btn = e.target.closest('.ao-remove');
            if (!btn) return;
            const cards = officesWrap.querySelectorAll('.office-card-admin');
            if (cards.length <= 1) {
                showToast('Cần có ít nhất 1 office', 'error');
                return;
            }
            btn.closest('.office-card-admin').remove();
            relabelAboutOffices();
            pushPreviewDebounced.about();
        });
    }

    ['about-input-banner', 'about-input-left', 'about-input-right'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', pushPreviewDebounced.about);
    });

    // v13: about stat inputs moved to Dashboard — push to settings iframe (/main),
    // since #about-stats-info lives inside #home-section. Dynamic grid → delegation.
    const statsGrid = document.getElementById('about-stats-grid');
    if (statsGrid) statsGrid.addEventListener('input', pushPreviewDebounced.settings);

    // services/footer cards are dynamic — delegate at container
    const svcWrap = document.getElementById('home-services-cards');
    if (svcWrap) svcWrap.addEventListener('input', pushPreviewDebounced.services);

    const fooWrap = document.getElementById('home-footer-cards');
    if (fooWrap) fooWrap.addEventListener('input', pushPreviewDebounced.footer);

    // Auto-init live preview for whichever section is active on first load.
    // switchSection only fires on click, so a browser refresh that lands on
    // the default-active Dashboard would otherwise leave the iframe blank
    // (or worse, show full /main if its initial src didn't say about:blank).
    const SECTION_TO_PREVIEW = {
        'dashboard': 'settings',
        'home-about': 'about',
        'home-services': 'services',
        'home-footer': 'footer',
        'invest': 'invest'
    };
    const active = document.querySelector('.content-section.active');
    if (active) {
        const target = SECTION_TO_PREVIEW[active.id];
        if (target) ensurePreviewLoaded(target);
    }
});

// ===================== HOME CONTENT — shared helpers =====================
async function uploadHomeImage(file) {
    const fd = new FormData();
    fd.append('media', file);
    const res = await fetch('/api/admin/projects/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Upload failed');
    return json.path;
}

// ===================== HOME — ABOUT =====================
// v12: /about page content (hero + mission + 2 offices). Settings-keyed.
async function loadAboutContent() {
    try {
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        if (!json.success || !json.data) return;
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        setVal('setting-about-hero-tag',      json.data.about_hero_tag);
        setVal('setting-about-hero-title',    json.data.about_hero_title);
        setVal('setting-about-mission',       json.data.about_mission);
        let offices = [];
        try { offices = JSON.parse(json.data.about_offices || '[]'); } catch (e) { offices = []; }
        renderAboutOffices(Array.isArray(offices) ? offices : []);
    } catch (e) {
        console.error('loadAboutContent:', e);
    }
}

// v16: /about — dynamic Offices cards (add/remove, editable name + flag/address/phone/email)
function renderAboutOffices(offices) {
    const wrap = document.getElementById('about-offices-cards');
    if (!wrap) return;
    if (!offices.length) offices = [{ name: '', flag: '', address: '', phone: '', email: '' }];
    wrap.innerHTML = offices.map((o, i) => `
        <div class="office-card-admin settings-panel" data-index="${i}">
            <h2><span class="ao-label">Office ${i + 1}</span> <button type="button" class="ao-remove" title="Remove office"><i class="fas fa-times"></i></button></h2>
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" class="ao-name" maxlength="100" placeholder="e.g. Sydney">
                </div>
                <div class="form-group">
                    <label>Flag (emoji, optional)</label>
                    <input type="text" class="ao-flag" maxlength="10" placeholder="🇦🇺">
                </div>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" class="ao-address" maxlength="300">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" class="ao-phone" maxlength="50">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="ao-email" maxlength="255">
                </div>
            </div>
        </div>`).join('');
    offices.forEach((o, i) => {
        const card = wrap.querySelector(`[data-index="${i}"]`);
        card.querySelector('.ao-name').value    = o.name    || '';
        card.querySelector('.ao-flag').value    = o.flag    || '';
        card.querySelector('.ao-address').value = o.address || '';
        card.querySelector('.ao-phone').value   = o.phone   || '';
        card.querySelector('.ao-email').value   = o.email   || '';
    });
}

function relabelAboutOffices() {
    const wrap = document.getElementById('about-offices-cards');
    if (!wrap) return;
    wrap.querySelectorAll('.office-card-admin').forEach((card, i) => {
        card.dataset.index = i;
        const label = card.querySelector('.ao-label');
        if (label) label.textContent = `Office ${i + 1}`;
    });
}

function gatherAboutOffices() {
    const wrap = document.getElementById('about-offices-cards');
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll('.office-card-admin')).map(card => ({
        name:    (card.querySelector('.ao-name')    || {}).value || '',
        flag:    (card.querySelector('.ao-flag')    || {}).value || '',
        address: (card.querySelector('.ao-address') || {}).value || '',
        phone:   (card.querySelector('.ao-phone')   || {}).value || '',
        email:   (card.querySelector('.ao-email')   || {}).value || ''
    }));
}

function addAboutOffice() {
    const offices = gatherAboutOffices();
    offices.push({ name: '', flag: '', address: '', phone: '', email: '' });
    renderAboutOffices(offices);
    pushPreviewDebounced.about();
}

async function saveAboutContent() {
    const v = id => (document.getElementById(id) || {}).value || '';
    const payload = {
        about_hero_tag:   v('setting-about-hero-tag'),
        about_hero_title: v('setting-about-hero-title'),
        about_mission:    v('setting-about-mission'),
        about_offices:    gatherAboutOffices()
    };
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        showToast(json.message || (json.success ? 'Đã lưu /about content' : 'Lỗi'), json.success ? 'success' : 'error');
        if (json.success) refreshPreview('about');
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// v13: Our Services 3-card editor (settings keys)
const ABOUT_SERVICE_ICONS = [
    ['fa-house-chimney', 'House'],
    ['fa-scale-balanced', 'Scale'],
    ['fa-suitcase-rolling', 'Suitcase'],
    ['fa-handshake', 'Handshake'],
    ['fa-globe', 'Globe'],
    ['fa-chart-line', 'Chart'],
    ['fa-shield-halved', 'Shield'],
    ['fa-briefcase', 'Briefcase'],
    ['fa-key', 'Key'],
    ['fa-building', 'Building']
];
async function loadAboutServices() {
    const wrap = document.getElementById('about-services-cards');
    if (!wrap) return;
    try {
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        if (!json.success) return;
        const d = json.data;
        // v15: all 3 services share ONE panel, side-by-side, so the About
        // tab doesn't stack 3 full-width cards (was "too long").
        wrap.innerHTML = '<div class="settings-panel"><div class="service-cards-grid">' + [1, 2, 3].map(i => {
            const opts = ABOUT_SERVICE_ICONS.map(([cls, lbl]) =>
                `<option value="${cls}">${lbl} (${cls})</option>`).join('');
            return `
                <div class="service-card-col" data-slot="${i}">
                    <h2>Service ${i}</h2>
                    <div class="form-group">
                        <label>Icon</label>
                        <div style="display:flex;gap:1rem;align-items:center">
                            <i class="svc-icon-preview-${i} fa-solid" style="font-size:2.4rem;color:var(--color-gold);width:42px;text-align:center"></i>
                            <select class="as-icon" style="flex:1">${opts}</select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" class="as-title" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="as-desc" rows="4" maxlength="1000"></textarea>
                    </div>
                </div>`;
        }).join('') + '</div></div>';
        [1, 2, 3].forEach(i => {
            const card = wrap.querySelector(`[data-slot="${i}"]`);
            const icon  = d[`about_service_${i}_icon`]  || 'fa-circle';
            const title = d[`about_service_${i}_title`] || '';
            const desc  = d[`about_service_${i}_desc`]  || '';
            card.querySelector('.as-icon').value  = icon;
            card.querySelector('.as-title').value = title;
            card.querySelector('.as-desc').value  = desc;
            card.querySelector(`.svc-icon-preview-${i}`).classList.add(icon);
            card.querySelectorAll('.as-icon, .as-title, .as-desc').forEach(el => {
                el.addEventListener('input', () => {
                    if (el.classList.contains('as-icon')) {
                        const ic = card.querySelector(`.svc-icon-preview-${i}`);
                        ic.className = `svc-icon-preview-${i} fa-solid ${el.value}`;
                        ic.style.fontSize = '2.4rem'; ic.style.color = 'var(--color-gold)'; ic.style.width = '42px'; ic.style.textAlign = 'center';
                    }
                    pushPreviewDebounced.about();
                });
            });
        });
    } catch (e) { console.error('loadAboutServices:', e); }
}

async function saveAboutServices() {
    const wrap = document.getElementById('about-services-cards');
    if (!wrap) return;
    const payload = {};
    [1, 2, 3].forEach(i => {
        const card = wrap.querySelector(`[data-slot="${i}"]`);
        if (!card) return;
        payload[`about_service_${i}_icon`]  = card.querySelector('.as-icon').value;
        payload[`about_service_${i}_title`] = card.querySelector('.as-title').value;
        payload[`about_service_${i}_desc`]  = card.querySelector('.as-desc').value;
    });
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        showToast(json.message || (json.success ? 'Đã lưu Services' : 'Lỗi'), json.success ? 'success' : 'error');
        if (json.success) refreshPreview('about');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// v14: shared avatar picker (media library) — used by Leadership + Team editors
// so every person/photo field in the admin works the same way: preview +
// "Chọn ảnh" (opens media library) + Remove, never a raw path/url input.
function avatarPickerHTML(label) {
    return '<div class="form-group"><label>' + label + '</label>'
        + '  <div class="settings-image-area">'
        + '    <div class="settings-image-preview settings-avatar-preview">'
        + '      <img class="avatar-preview-img" src="" alt="" style="display:none" onerror="this.style.display=\'none\'">'
        + '      <span class="avatar-placeholder settings-preview-placeholder"><i class="fas fa-user"></i> No photo</span>'
        + '    </div>'
        + '    <div class="settings-image-actions">'
        + '      <button type="button" class="btn-add avatar-pick-btn"><i class="fas fa-images"></i> Chọn ảnh</button>'
        + '      <button type="button" class="btn-cancel avatar-remove-btn" style="display:none"><i class="fas fa-times"></i> Remove</button>'
        + '    </div>'
        + '  </div>'
        + '</div>';
}

function wireAvatarPicker(card, initialPath, onChange) {
    const img = card.querySelector('.avatar-preview-img');
    const ph = card.querySelector('.avatar-placeholder');
    const rm = card.querySelector('.avatar-remove-btn');
    const pick = card.querySelector('.avatar-pick-btn');
    const setPath = (path) => {
        card.dataset.avatarPath = path || '';
        if (path) {
            img.src = (path.startsWith('/') || path.startsWith('http') || path.startsWith('data:')) ? path : '/' + path;
            img.style.display = 'block';
            ph.style.display = 'none';
            rm.style.display = 'inline-flex';
        } else {
            img.style.display = 'none';
            img.src = '';
            ph.style.display = 'flex';
            rm.style.display = 'none';
        }
    };
    setPath(initialPath);
    pick.addEventListener('click', () => {
        openMediaLibrary({ mode: 'single', onSelect: ([url]) => { setPath(url); onChange(); } });
    });
    rm.addEventListener('click', () => { setPath(''); onChange(); });
}

// v13: Leadership editor — reuses footer_persons API but labels slots Director/Co-Founder
async function loadAboutLeadership() {
    const wrap = document.getElementById('about-leadership-cards');
    if (!wrap) return;
    try {
        const res = await fetch('/api/admin/footer-persons');
        const { data } = await res.json();
        wrap.innerHTML = '';
        const ROLE_LABELS = { 1: 'Director', 2: 'Property Sales Consultant' };
        (data || []).forEach(person => {
            const slot = person.slot;
            const card = document.createElement('div');
            card.className = 'settings-panel';
            card.style.marginBottom = '20px';
            card.dataset.slot = slot;
            card.innerHTML = ''
                + `<h2><i class="fas fa-user-tie"></i> ${ROLE_LABELS[slot] || ('Person ' + slot)}</h2>`
                + avatarPickerHTML('Photo')
                + '<div class="form-row">'
                + '  <div class="form-group"><label>Name</label>'
                + '    <input type="text" class="al-name" maxlength="255"></div>'
                + '  <div class="form-group"><label>Email</label>'
                + '    <input type="email" class="al-email" maxlength="255"></div>'
                + '</div>'
                + '<div class="form-row">'
                + '  <div class="form-group"><label>Phone 1</label>'
                + '    <input type="text" class="al-phone1" maxlength="50"></div>'
                + '  <div class="form-group"><label>Phone 2</label>'
                + '    <input type="text" class="al-phone2" maxlength="50"></div>'
                + '</div>'
                + '<div class="form-group"><label>Facebook URL (https://)</label>'
                + '  <input type="url" class="al-fb" maxlength="500" pattern="https://.*"></div>'
                + '<div class="form-actions">'
                + '  <button type="button" class="btn-save al-save-btn"><i class="fas fa-save"></i> Save</button>'
                + '</div>';
            wrap.appendChild(card);
            card.querySelector('.al-name').value   = person.name || '';
            card.querySelector('.al-email').value  = person.email || '';
            card.querySelector('.al-phone1').value = person.phone1 || '';
            card.querySelector('.al-phone2').value = person.phone2 || '';
            card.querySelector('.al-fb').value     = person.facebook_url || '';
            wireAvatarPicker(card, person.avatar_path || '', () => pushPreviewDebounced.about());
            // Live-preview push on input
            card.querySelectorAll('input').forEach(el => el.addEventListener('input', () => pushPreviewDebounced.about()));
            card.querySelector('.al-save-btn').addEventListener('click', async () => {
                const fb = card.querySelector('.al-fb').value.trim();
                if (fb && !/^https:\/\//i.test(fb)) { showToast('Facebook URL phải bắt đầu https://', 'error'); return; }
                const payload = {
                    name:   card.querySelector('.al-name').value,
                    email:  card.querySelector('.al-email').value,
                    phone1: card.querySelector('.al-phone1').value,
                    phone2: card.querySelector('.al-phone2').value,
                    facebook_url: fb,
                    avatar_path: card.dataset.avatarPath || ''
                };
                try {
                    const r = await fetch('/api/admin/footer-persons/' + slot, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const j = await r.json();
                    showToast(j.message || (j.success ? 'Saved' : 'Failed'), j.success ? 'success' : 'error');
                    if (j.success) refreshPreview('about');
                } catch (e) { showToast('Error: ' + e.message, 'error'); }
            });
        });
    } catch (e) { console.error('loadAboutLeadership:', e); }
}

// v13 / v22: Team editor — dynamic list (add/remove members), team_members table
async function loadAboutTeam() {
    const wrap = document.getElementById('about-team-cards');
    if (!wrap) return;
    try {
        const res = await fetch('/api/admin/team');
        const { data } = await res.json();
        renderAboutTeamCards(data || []);
    } catch (e) { console.error('loadAboutTeam:', e); }
}

function renderAboutTeamCards(members) {
    const wrap = document.getElementById('about-team-cards');
    if (!wrap) return;
    wrap.innerHTML = '';
    members.forEach((member, i) => {
        const id = member.id;
        const card = document.createElement('div');
        card.className = 'settings-panel office-card-admin';
        card.dataset.id = id;
        card.innerHTML = ''
            + `<h2 style="font-size:1.5rem"><span><i class="fas fa-user"></i> Member ${i + 1}</span> <button type="button" class="ao-remove" title="Remove member"><i class="fas fa-times"></i></button></h2>`
            + avatarPickerHTML('Photo')
            + '<div class="form-row">'
            + '  <div class="form-group"><label>Name</label>'
            + '    <input type="text" class="at-name" maxlength="255"></div>'
            + '  <div class="form-group"><label>Role</label>'
            + '    <input type="text" class="at-role" maxlength="255"></div>'
            + '</div>'
            + '<div class="form-actions">'
            + '  <button type="button" class="btn-save at-save-btn"><i class="fas fa-save"></i> Save</button>'
            + '</div>';
        wrap.appendChild(card);
        card.querySelector('.at-name').value   = member.name || '';
        card.querySelector('.at-role').value   = member.role || '';
        wireAvatarPicker(card, member.avatar_path || '', () => pushPreviewDebounced.about());
        card.querySelectorAll('input').forEach(el => el.addEventListener('input', () => pushPreviewDebounced.about()));
        card.querySelector('.at-save-btn').addEventListener('click', async () => {
            const payload = {
                name:   card.querySelector('.at-name').value,
                role:   card.querySelector('.at-role').value,
                avatar_path: card.dataset.avatarPath || ''
            };
            try {
                const r = await fetch('/api/admin/team/' + id, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const j = await r.json();
                showToast(j.message || (j.success ? 'Saved' : 'Failed'), j.success ? 'success' : 'error');
                if (j.success) refreshPreview('about');
            } catch (e) { showToast('Error: ' + e.message, 'error'); }
        });
        card.querySelector('.ao-remove').addEventListener('click', () => {
            confirmAction('Xóa thành viên này khỏi Our Team?', async () => {
                try {
                    const r = await fetch('/api/admin/team/' + id, { method: 'DELETE' });
                    const j = await r.json();
                    showToast(j.message || (j.success ? 'Đã xóa' : 'Failed'), j.success ? 'success' : 'error');
                    if (j.success) { await loadAboutTeam(); refreshPreview('about'); }
                } catch (e) { showToast('Error: ' + e.message, 'error'); }
            });
        });
    });
}

async function addAboutTeamMember() {
    try {
        const r = await fetch('/api/admin/team', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: '', role: '', avatar_path: '' })
        });
        const j = await r.json();
        if (j.success) { await loadAboutTeam(); refreshPreview('about'); }
        else showToast(j.message || 'Failed', 'error');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function loadHomeAbout() {
    try {
        const res = await fetch('/api/admin/about');
        if (!res.ok) {
            showToast('Failed to load About', 'error');
            return;
        }
        const { data } = await res.json();
        if (!data) return;

        document.getElementById('about-input-banner').value = data.banner || '';
        document.getElementById('about-input-left').value = data.paragraph_left || '';
        document.getElementById('about-input-right').value = data.paragraph_right || '';

        const grid = document.getElementById('about-stats-grid');
        grid.innerHTML = '';
        (data.stats || []).forEach(s => {
            const wrap = document.createElement('div');
            wrap.className = 'form-group';

            const title = document.createElement('label');
            title.textContent = 'Stat ' + s.slot;
            wrap.appendChild(title);

            const num = document.createElement('input');
            num.type = 'text';
            num.placeholder = 'e.g. 20+';
            num.maxLength = 20;
            num.dataset.slot = s.slot;
            num.dataset.field = 'num';
            num.value = s.num || '';
            wrap.appendChild(num);

            const lbl = document.createElement('input');
            lbl.type = 'text';
            lbl.placeholder = 'e.g. years of experience';
            lbl.maxLength = 255;
            lbl.dataset.slot = s.slot;
            lbl.dataset.field = 'label';
            lbl.value = s.label || '';
            lbl.style.marginTop = '6px';
            wrap.appendChild(lbl);

            grid.appendChild(wrap);
        });
    } catch (err) {
        console.error('loadHomeAbout:', err);
        showToast('Error loading About: ' + err.message, 'error');
    }
}

document.getElementById('home-about-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-save');
    btn.disabled = true;
    try {
        const stats = [];
        document.querySelectorAll('#about-stats-grid input[data-slot]').forEach(inp => {
            const slot = parseInt(inp.dataset.slot, 10);
            const field = inp.dataset.field;
            let entry = stats.find(s => s.slot === slot);
            if (!entry) { entry = { slot }; stats.push(entry); }
            entry[field] = inp.value;
        });
        const payload = {
            banner: document.getElementById('about-input-banner').value,
            paragraph_left: document.getElementById('about-input-left').value,
            paragraph_right: document.getElementById('about-input-right').value,
            stats
        };
        const res = await fetch('/api/admin/about', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        showToast(json.message || (json.success ? 'Saved' : 'Failed'), json.success ? 'success' : 'error');
        if (json.success) refreshPreview('settings');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
});

// ===================== HOME — SERVICES =====================
async function loadHomeServices() {
    try {
        const res = await fetch('/api/admin/services');
        if (!res.ok) {
            showToast('Failed to load Services', 'error');
            return;
        }
        const { data } = await res.json();
        const wrap = document.getElementById('home-services-cards');
        wrap.innerHTML = '';

        (data || []).forEach(svc => {
            const card = document.createElement('div');
            card.className = 'settings-panel';
            card.style.marginBottom = '20px';
            card.dataset.slot = svc.slot;
            // v2: icon picker (FA class) replaces image picker
            const ICON_OPTIONS = [
                ['fa-key', 'Key'],
                ['fa-chart-line', 'Chart'],
                ['fa-building', 'Building'],
                ['fa-hand-holding-dollar', 'Finance'],
                ['fa-shield-halved', 'Shield'],
                ['fa-house', 'House'],
                ['fa-handshake', 'Handshake'],
                ['fa-magnifying-glass', 'Search'],
                ['fa-briefcase', 'Briefcase'],
                ['fa-globe', 'Globe'],
                ['fa-people-arrows', 'Network'],
                ['fa-map-location-dot', 'Location']
            ];
            const iconOptionsHtml = ICON_OPTIONS.map(([cls, lbl]) =>
                `<option value="${cls}">${lbl} (${cls})</option>`).join('');
            card.innerHTML = ''
                + '<h2><i class="fas fa-concierge-bell"></i> Service ' + svc.slot + '</h2>'
                + '<div class="form-group"><label>Title</label>'
                + '  <input type="text" class="svc-title" maxlength="255"></div>'
                + '<div class="form-group"><label>Description</label>'
                + '  <textarea class="svc-desc" rows="5" maxlength="2000"></textarea></div>'
                + '<div class="form-group"><label>Icon <small style="color:#888;font-weight:400">(Font Awesome 6 — chọn 1 trong danh sách)</small></label>'
                + '  <div style="display:flex;gap:1rem;align-items:center">'
                + '    <i class="svc-icon-preview fa-solid" style="font-size:2.6rem;color:var(--color-gold);width:48px;text-align:center"></i>'
                + '    <select class="svc-icon-select" style="flex:1">' + iconOptionsHtml + '</select>'
                + '  </div></div>'
                + '<div class="form-actions">'
                + '  <button type="button" class="btn-save svc-save-btn"><i class="fas fa-save"></i> Save Service ' + svc.slot + '</button>'
                + '</div>';
            wrap.appendChild(card);

            card.querySelector('.svc-title').value = svc.title || '';
            card.querySelector('.svc-desc').value = svc.description || '';
            const iconSelect = card.querySelector('.svc-icon-select');
            const iconPreview = card.querySelector('.svc-icon-preview');
            const DEFAULT_ICONS = { 1:'fa-key', 2:'fa-chart-line', 3:'fa-building', 4:'fa-hand-holding-dollar', 5:'fa-shield-halved' };
            const currentIcon = svc.icon || DEFAULT_ICONS[svc.slot] || 'fa-key';
            iconSelect.value = currentIcon;
            iconPreview.classList.add(currentIcon);
            iconSelect.addEventListener('change', () => {
                iconPreview.className = 'svc-icon-preview fa-solid ' + iconSelect.value;
                iconPreview.style.fontSize = '2.6rem';
                iconPreview.style.color = 'var(--color-gold)';
                iconPreview.style.width = '48px';
                iconPreview.style.textAlign = 'center';
            });

            card.querySelector('.svc-save-btn').addEventListener('click', async () => {
                const btn = card.querySelector('.svc-save-btn');
                btn.disabled = true;
                try {
                    const payload = {
                        title: card.querySelector('.svc-title').value,
                        description: card.querySelector('.svc-desc').value,
                        icon: iconSelect.value
                    };
                    const res = await fetch('/api/admin/services/' + svc.slot, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const json = await res.json();
                    showToast(json.message || (json.success ? 'Saved' : 'Failed'), json.success ? 'success' : 'error');
                    if (json.success) refreshPreview('services');
                } catch (err) {
                    showToast('Error: ' + err.message, 'error');
                } finally {
                    btn.disabled = false;
                }
            });
        });
    } catch (err) {
        console.error('loadHomeServices:', err);
        showToast('Error loading Services: ' + err.message, 'error');
    }
}

// ===================== HOME — FOOTER PERSONS =====================
// v12: Footer site-wide content (moved from Dashboard). Loaded alongside footer-persons.
async function loadFooterContent() {
    try {
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        if (!json.success || !json.data) return;
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        setVal('setting-footer-desc',       json.data.footer_desc);
        setVal('setting-footer-address',    json.data.footer_address);
        setVal('setting-footer-facebook',   json.data.footer_facebook_url);
        setVal('setting-footer-linkedin',   json.data.footer_linkedin_url);
        setVal('setting-footer-youtube',    json.data.footer_youtube_url);
        setVal('setting-footer-tiktok',     json.data.footer_tiktok_url);
        setVal('setting-footer-copyright',  json.data.footer_copyright);
    } catch (e) {
        console.error('loadFooterContent:', e);
    }
}

async function saveFooterContent() {
    const v = id => (document.getElementById(id) || {}).value || '';
    const payload = {
        footer_desc:         v('setting-footer-desc'),
        footer_address:      v('setting-footer-address'),
        footer_copyright:    v('setting-footer-copyright'),
        footer_facebook_url: v('setting-footer-facebook').trim(),
        footer_linkedin_url: v('setting-footer-linkedin').trim(),
        footer_youtube_url:  v('setting-footer-youtube').trim(),
        footer_tiktok_url:   v('setting-footer-tiktok').trim()
    };
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        showToast(json.message || (json.success ? 'Đã lưu Footer' : 'Lỗi'), json.success ? 'success' : 'error');
        if (json.success) { refreshPreview('footer'); refreshPreview('settings'); }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

async function loadHomeFooter() {
    try {
        const res = await fetch('/api/admin/footer-persons');
        if (!res.ok) {
            showToast('Failed to load Footer', 'error');
            return;
        }
        const { data } = await res.json();
        const wrap = document.getElementById('home-footer-cards');
        wrap.innerHTML = '';

        (data || []).forEach(person => {
            const card = document.createElement('div');
            card.className = 'settings-panel';
            card.style.marginBottom = '20px';
            card.dataset.slot = person.slot;
            card.innerHTML = ''
                + '<h2><i class="fas fa-id-card"></i> Person ' + person.slot + '</h2>'
                // v2: avatar picker hidden (footer is text-only; existing avatars still
                // appear in the About-us founders block on /main). Hidden span keeps the
                // existing path stored on the card dataset on save.
                + '<div class="form-group" style="display:none">'
                + '  <img class="fp-avatar-preview">'
                + '  <span class="fp-avatar-placeholder"></span>'
                + '  <button type="button" class="fp-pick-btn">hidden</button>'
                + '</div>'
                + '<div class="form-row">'
                + '  <div class="form-group"><label>Name</label>'
                + '    <input type="text" class="fp-name" maxlength="255"></div>'
                + '  <div class="form-group"><label>Email</label>'
                + '    <input type="email" class="fp-email" maxlength="255"></div>'
                + '</div>'
                + '<div class="form-row">'
                + '  <div class="form-group"><label>Phone 1</label>'
                + '    <input type="text" class="fp-phone1" maxlength="50"></div>'
                + '  <div class="form-group"><label>Phone 2</label>'
                + '    <input type="text" class="fp-phone2" maxlength="50"></div>'
                + '</div>'
                + '<div class="form-group"><label>Facebook URL (https:// only)</label>'
                + '  <input type="url" class="fp-fb" maxlength="500" pattern="https://.*"></div>'
                + '<div class="form-actions">'
                + '  <button type="button" class="btn-save fp-save-btn"><i class="fas fa-save"></i> Save Person ' + person.slot + '</button>'
                + '</div>';
            wrap.appendChild(card);

            card.querySelector('.fp-name').value = person.name || '';
            card.querySelector('.fp-email').value = person.email || '';
            card.querySelector('.fp-phone1').value = person.phone1 || '';
            card.querySelector('.fp-phone2').value = person.phone2 || '';
            card.querySelector('.fp-fb').value = person.facebook_url || '';

            const imgEl = card.querySelector('.fp-avatar-preview');
            const placeholderEl = card.querySelector('.fp-avatar-placeholder');
            if (person.avatar_path) {
                imgEl.src = person.avatar_path;
                imgEl.style.display = 'block';
                placeholderEl.style.display = 'none';
            }
            card.dataset.avatarPath = person.avatar_path || '';

            card.querySelector('.fp-pick-btn').addEventListener('click', () => {
                openMediaLibrary({
                    mode: 'single',
                    onSelect: ([url]) => {
                        imgEl.src = url;
                        imgEl.style.display = 'block';
                        placeholderEl.style.display = 'none';
                        card.dataset.avatarPath = url;
                        postPreviewData('footer');
                        showToast('Đã chọn avatar — bấm Save để lưu', 'success');
                    }
                });
            });

            card.querySelector('.fp-save-btn').addEventListener('click', async () => {
                const btn = card.querySelector('.fp-save-btn');
                btn.disabled = true;
                try {
                    const fb = card.querySelector('.fp-fb').value.trim();
                    if (fb && !/^https:\/\//i.test(fb)) {
                        showToast('Facebook URL phải bắt đầu https://', 'error');
                        btn.disabled = false;
                        return;
                    }
                    const payload = {
                        name: card.querySelector('.fp-name').value,
                        email: card.querySelector('.fp-email').value,
                        phone1: card.querySelector('.fp-phone1').value,
                        phone2: card.querySelector('.fp-phone2').value,
                        facebook_url: fb
                    };
                    const currentPath = card.dataset.avatarPath;
                    if (currentPath) payload.avatar_path = currentPath;
                    const res = await fetch('/api/admin/footer-persons/' + person.slot, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const json = await res.json();
                    showToast(json.message || (json.success ? 'Saved' : 'Failed'), json.success ? 'success' : 'error');
                    if (json.success) refreshPreview('footer');
                } catch (err) {
                    showToast('Error: ' + err.message, 'error');
                } finally {
                    btn.disabled = false;
                }
            });
        });
    } catch (err) {
        console.error('loadHomeFooter:', err);
        showToast('Error loading Footer: ' + err.message, 'error');
    }
}

// ===================== MEDIA LIBRARY =====================
// One global modal that any image picker can open.
//
//   openMediaLibrary({
//       mode: 'single' | 'multi',
//       onSelect: (urls) => { /* urls is always an array */ }
//   });
//
// Single-mode: clicking a thumb selects it (replacing prior selection).
// Multi-mode: each thumb toggles in/out of a Set. After successful upload
// in multi-mode the new file is auto-added to the selection. Search is
// case-insensitive substring on filename.

const _MEDIA_VIDEO_RE = /\.(mp4|webm|mov)$/i;

let _mediaState = {
    allMedia: [],
    filteredMedia: [],
    selectedUrls: new Set(),
    mode: 'single',
    onSelect: null,
    query: '',
    tab: 'images'
};

function switchMediaTab(tab) {
    _mediaState.tab = tab;
    document.querySelectorAll('.media-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    applyMediaFilter();
}

function openMediaLibrary({ mode = 'single', onSelect = null } = {}) {
    _mediaState.mode = mode;
    _mediaState.onSelect = onSelect;
    _mediaState.selectedUrls = new Set();
    _mediaState.query = '';
    _mediaState.tab = 'images';
    const searchInp = document.getElementById('media-search-input');
    if (searchInp) searchInp.value = '';
    document.querySelectorAll('.media-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === 'images');
    });
    document.getElementById('media-modal').style.display = 'flex';
    updateMediaSelectedCount();
    loadMediaGrid();
}

function closeMediaLibrary() {
    document.getElementById('media-modal').style.display = 'none';
    _mediaState.onSelect = null;
    _mediaState.selectedUrls.clear();
}

async function loadMediaGrid() {
    const grid = document.getElementById('media-grid');
    const empty = document.getElementById('media-empty');
    grid.innerHTML = '<div style="padding:20px;text-align:center;color:#95a5a6">Đang tải...</div>';
    empty.style.display = 'none';
    try {
        const res = await fetch('/api/admin/media');
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Failed');
        _mediaState.allMedia = json.data || [];
        applyMediaFilter();
    } catch (err) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.querySelector('p').textContent = 'Lỗi tải thư viện: ' + err.message;
        showToast('Lỗi tải thư viện ảnh', 'error');
    }
}

function applyMediaFilter() {
    const q = (_mediaState.query || '').toLowerCase();
    const tab = _mediaState.tab || 'all';
    _mediaState.filteredMedia = _mediaState.allMedia.filter(m => {
        const isVideo = _MEDIA_VIDEO_RE.test(m.name || m.url || '');
        if (tab === 'images' && isVideo) return false;
        if (tab === 'videos' && !isVideo) return false;
        if (q && !m.name.toLowerCase().includes(q)) return false;
        return true;
    });
    renderMediaGrid();
}

function renderMediaGrid() {
    const grid = document.getElementById('media-grid');
    const empty = document.getElementById('media-empty');
    const count = document.getElementById('media-count');
    grid.innerHTML = '';

    if (_mediaState.allMedia.length === 0) {
        empty.style.display = 'block';
        count.textContent = '';
        return;
    }
    empty.style.display = 'none';
    count.textContent = _mediaState.filteredMedia.length + ' / ' + _mediaState.allMedia.length;

    _mediaState.filteredMedia.forEach(m => {
        const item = document.createElement('div');
        item.className = 'media-item';
        if (_mediaState.selectedUrls.has(m.url)) item.classList.add('selected');
        item.dataset.url = m.url;

        if (_MEDIA_VIDEO_RE.test(m.name || m.url || '')) {
            const video = document.createElement('video');
            video.src = m.url;
            video.muted = true;
            video.preload = 'metadata';
            item.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = m.url;
            img.alt = '';
            img.loading = 'lazy';
            img.onerror = function () { this.style.display = 'none'; };
            item.appendChild(img);
        }

        const check = document.createElement('div');
        check.className = 'media-check';
        check.innerHTML = '<i class="fas fa-check"></i>';
        item.appendChild(check);

        const name = document.createElement('div');
        name.className = 'media-name';
        name.textContent = m.name;
        item.appendChild(name);

        item.addEventListener('click', () => toggleMediaSelection(m.url));
        grid.appendChild(item);
    });
}

function toggleMediaSelection(url) {
    if (_mediaState.mode === 'single') {
        _mediaState.selectedUrls.clear();
        _mediaState.selectedUrls.add(url);
    } else {
        if (_mediaState.selectedUrls.has(url)) _mediaState.selectedUrls.delete(url);
        else _mediaState.selectedUrls.add(url);
    }
    renderMediaGrid();
    updateMediaSelectedCount();
}

function updateMediaSelectedCount() {
    const n = _mediaState.selectedUrls.size;
    const countEl = document.getElementById('media-selected-count');
    const btnEl = document.getElementById('media-confirm-btn');
    if (countEl) countEl.textContent = '(' + n + ')';
    if (btnEl) btnEl.disabled = n === 0;
}

function confirmMediaSelection() {
    const urls = Array.from(_mediaState.selectedUrls);
    const cb = _mediaState.onSelect;
    closeMediaLibrary();
    if (cb && urls.length > 0) cb(urls);
}

// Wire static listeners on DOMContentLoaded (modal elements always present in HTML)
document.addEventListener('DOMContentLoaded', () => {
    const searchInp = document.getElementById('media-search-input');
    if (searchInp) {
        searchInp.addEventListener('input', (e) => {
            _mediaState.query = e.target.value;
            applyMediaFilter();
        });
    }

    const uploadInp = document.getElementById('media-upload-input');
    if (uploadInp) {
        uploadInp.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const fd = new FormData();
                fd.append('media', file);
                const res = await fetch('/api/admin/projects/upload', { method: 'POST', body: fd });
                const json = await res.json();
                if (!json.success) throw new Error(json.message || 'Upload failed');
                // Optimistically prepend the new file
                const newItem = {
                    url: json.path,
                    name: json.path.split('/').pop(),
                    size: 0,
                    mtime: Date.now()
                };
                _mediaState.allMedia.unshift(newItem);
                _mediaState.query = '';
                if (searchInp) searchInp.value = '';
                // D6: multi-mode auto-adds to selection; D7: single-mode does NOT
                if (_mediaState.mode === 'multi') {
                    _mediaState.selectedUrls.add(newItem.url);
                }
                applyMediaFilter();
                updateMediaSelectedCount();
                showToast('Upload thành công', 'success');
            } catch (err) {
                showToast('Lỗi upload: ' + err.message, 'error');
            } finally {
                e.target.value = '';
            }
        });
    }
});

// ===================== AUDIT LOG =====================
// Vietnamese labels — readable for non-IT staff. Keep raw action codes
// in the DB / data-attribute for filtering + CSS tinting; render the
// human label in the table cell.
const AUDIT_ACTION_LABELS = {
    'SETTINGS_UPDATE': 'Cập nhật cài đặt website',
    'PROJECT_CREATE': 'Tạo dự án mới',
    'PROJECT_UPDATE': 'Cập nhật dự án',
    'PROJECT_SOFTDELETE': 'Ngừng kinh doanh dự án',
    'PROJECT_RESTORE': 'Khôi phục dự án',
    'PROJECT_DELETE': 'Xóa vĩnh viễn dự án',
    'PROJECT_FEATURED_SET': 'Cập nhật Featured Projects (trang chủ)',
    'CONTACT_DELETE': 'Xóa liên hệ',
    'ACCOUNT_CREATE': 'Tạo tài khoản',
    'ACCOUNT_UPDATE': 'Cập nhật tài khoản',
    'ACCOUNT_DELETE': 'Xóa tài khoản',
    'ABOUT_UPDATE': 'Cập nhật phần About',
    'SERVICE_UPDATE': 'Cập nhật Service',
    'FOOTER_PERSON_UPDATE': 'Cập nhật nhân viên Footer',
    // F08: video actions
    'VIDEO_CREATE': 'Tạo video mới',
    'VIDEO_UPDATE': 'Cập nhật video',
    'VIDEO_SOFTDELETE': 'Ẩn video',
    'VIDEO_DELETE': 'Xóa vĩnh viễn video',
    // v3: video featured action
    'VIDEO_FEATURED_SET': 'Cập nhật Featured Videos (trang chủ)',
    // F09: news actions
    'NEWS_CREATE': 'Tạo tin tức mới',
    'NEWS_UPDATE': 'Cập nhật tin tức',
    'NEWS_SOFTDELETE': 'Ẩn tin tức',
    'NEWS_DELETE': 'Xóa vĩnh viễn tin tức',
    // v3: news featured action
    'NEWS_FEATURED_SET': 'Cập nhật Featured News (trang chủ)'
};

const AUDIT_TARGET_LABELS = {
    'project': 'Dự án',
    'contact': 'Liên hệ',
    'account': 'Tài khoản',
    'settings': 'Cài đặt',
    'about_section': 'Phần About',
    'service': 'Service slot',
    'footer_person': 'Nhân viên Footer',
    'video': 'Video',
    'news': 'Tin tức'
};

const AUDIT_FIELD_LABELS = {
    'logo': 'Logo',
    'phone': 'Số điện thoại',
    'main_image': 'Ảnh chính',
    'username': 'Tên đăng nhập',
    'password': 'Mật khẩu',
    'name': 'Tên',
    'role': 'Vai trò',
    'title': 'Tiêu đề',
    // F08: video fields
    'tiktok_url': 'Link TikTok',
    'thumbnail_path': 'Ảnh thumbnail',
    'views_count': 'Lượt xem',
    // F09: news fields
    'summary': 'Tóm tắt',
    'content': 'Nội dung',
    'cover_image': 'Ảnh bìa',
    'status': 'Trạng thái',
    'external_url': 'Link bài báo gốc',
    'is_featured': 'Hiển thị ở trang chủ',
    'icon': 'Icon',
    'description': 'Mô tả',
    'image_path': 'Ảnh',
    'banner': 'Banner',
    'paragraph_left': 'Đoạn văn trái',
    'paragraph_right': 'Đoạn văn phải',
    'stats': 'Số liệu thống kê',
    'area': 'Khu vực',
    'square_meters': 'Diện tích (m²)',
    'category': 'Danh mục',
    'year': 'Năm',
    'style': 'Phong cách',
    'small_content': 'Mô tả ngắn',
    'display_order': 'Thứ tự hiển thị',
    'email': 'Email',
    'phone1': 'SĐT 1',
    'phone2': 'SĐT 2',
    'facebook_url': 'Link Facebook',
    'avatar_path': 'Ảnh đại diện',
    // F06: Purpose-Invest video
    'purpose_video_thumbnail': 'Ảnh thumbnail video Purpose',
    'purpose_video_url': 'URL video Purpose',
    // v14: "Why Invest in Australia" section content
    'purpose_tagline': 'Invest — Tagline',
    'purpose_heading': 'Invest — Tiêu đề',
    'purpose_list_1': 'Invest — Mục 1',
    'purpose_list_2': 'Invest — Mục 2',
    'purpose_list_3': 'Invest — Mục 3',
    'purpose_list_4': 'Invest — Mục 4',
    'purpose_cta_text': 'Invest — Nút CTA',
    'purpose_video_caption': 'Invest — Chú thích video',
    // v11: Footer dynamic content
    'footer_desc': 'Footer — Mô tả',
    'footer_address': 'Footer — Địa chỉ',
    'footer_copyright': 'Footer — Copyright',
    'footer_facebook_url': 'Footer — Facebook URL',
    'footer_linkedin_url': 'Footer — LinkedIn URL',
    'footer_youtube_url': 'Footer — YouTube URL',
    'footer_tiktok_url': 'Footer — TikTok URL',
    // v12: /about page content
    'about_hero_tag': '/about — Hero Tag',
    'about_hero_title': '/about — Hero Title',
    'about_mission': '/about — Mission paragraph',
    // v16: /about Offices (dynamic list, replaces fixed Sydney/HCM fields)
    'about_offices': '/about — Offices',
    // v13: /about Our Services (3 cards)
    'about_service_1_icon': '/about — Service 1 Icon',
    'about_service_1_title': '/about — Service 1 Title',
    'about_service_1_desc': '/about — Service 1 Description',
    'about_service_2_icon': '/about — Service 2 Icon',
    'about_service_2_title': '/about — Service 2 Title',
    'about_service_2_desc': '/about — Service 2 Description',
    'about_service_3_icon': '/about — Service 3 Icon',
    'about_service_3_title': '/about — Service 3 Title',
    'about_service_3_desc': '/about — Service 3 Description',
    // F05d: extended project fields
    'price': 'Giá',
    'beds': 'Số phòng ngủ',
    'baths': 'Số phòng tắm',
    'cars': 'Chỗ đậu xe',
    'address': 'Địa chỉ',
    'state': 'Bang (NSW/VIC/...)',
    'property_type': 'Loại BĐS',
    'area_label': 'Nhãn khu vực (badge)'
};

const AUDIT_AREA_LABELS = {
    'sydney': 'Sydney',
    'melbourne': 'Melbourne',
    'brisbane': 'Brisbane',
    'goldcoast': 'Gold Coast'
};

function formatAuditTarget(target_type, target_id) {
    const label = AUDIT_TARGET_LABELS[target_type] || target_type || '';
    if (!label) return '-';
    return target_id ? label + ' #' + target_id : label;
}

function formatAuditDetails(action, raw) {
    if (!raw) return '-';
    let d = raw;
    if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch { return raw; }
    }
    if (typeof d !== 'object' || d === null) return String(d);

    // "fields changed" pattern — used by UPDATE actions
    if (Array.isArray(d.fields) && d.fields.length > 0) {
        const labelled = d.fields.map(f => AUDIT_FIELD_LABELS[f] || f);
        return 'Đã sửa: ' + labelled.join(', ');
    }

    // Per-action specific rendering
    if (action === 'PROJECT_CREATE') {
        const parts = [];
        if (d.name) parts.push('Tên: ' + d.name);
        if (d.area) parts.push('Khu vực: ' + (AUDIT_AREA_LABELS[d.area] || d.area));
        return parts.join(' · ') || '-';
    }
    if (action === 'ACCOUNT_CREATE') {
        const parts = [];
        if (d.username) parts.push('Tên đăng nhập: ' + d.username);
        if (d.role) {
            const roleLabel = d.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
            parts.push('Vai trò: ' + roleLabel);
        }
        return parts.join(' · ') || '-';
    }
    if (action === 'ABOUT_UPDATE' && typeof d.stats_count === 'number') {
        return 'Cập nhật banner, 2 đoạn văn và ' + d.stats_count + ' số liệu';
    }

    // Generic fallback: prefix-translate keys we know, join "key: value"
    const parts = Object.entries(d).map(([k, v]) => {
        const keyLabel = AUDIT_FIELD_LABELS[k] || k;
        if (k === 'area') v = AUDIT_AREA_LABELS[v] || v;
        if (k === 'role') v = v === 'admin' ? 'Quản trị viên' : 'Nhân viên';
        if (Array.isArray(v)) v = v.join(', ');
        return keyLabel + ': ' + v;
    });
    return parts.join(' · ') || '-';
}

let _auditActionsLoaded = false;

async function loadAuditLog() {
    try {
        if (!_auditActionsLoaded) {
            try {
                const ar = await fetch('/api/admin/audit-log/actions');
                if (ar.ok) {
                    const aj = await ar.json();
                    const sel = document.getElementById('audit-action-filter');
                    sel.innerHTML = '<option value="">Tất cả hành động</option>';
                    (aj.data || []).forEach(a => {
                        const opt = document.createElement('option');
                        opt.value = a;
                        opt.textContent = AUDIT_ACTION_LABELS[a] || a;
                        sel.appendChild(opt);
                    });
                }
                _auditActionsLoaded = true;
            } catch {}
        }

        const q = (document.getElementById('audit-search') || {}).value || '';
        const action = (document.getElementById('audit-action-filter') || {}).value || '';
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (action) params.set('action', action);
        params.set('limit', '200');

        const res = await fetch('/api/admin/audit-log?' + params.toString());
        if (res.status === 403) {
            showToast('Chỉ admin được xem audit log', 'error');
            return;
        }
        const j = await res.json();
        _auditLogAll = (j.success && Array.isArray(j.data)) ? j.data : [];
        _auditLogPage = 1;
        renderAuditLog();
    } catch (err) {
        console.error('loadAuditLog:', err);
        showToast('Lỗi tải audit log: ' + err.message, 'error');
    }
}

function renderAuditLog() {
    const tbody = document.getElementById('audit-log-tbody');
    tbody.innerHTML = '';

    if (_auditLogAll.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#95a5a6">Không có dữ liệu</td></tr>';
        renderPagination('audit-log-pagination', 0, 1, () => {});
        return;
    }

    paginate(_auditLogAll, _auditLogPage).forEach(row => {
        const tr = document.createElement('tr');

        const tdTime = document.createElement('td');
        tdTime.textContent = new Date(row.created_at).toLocaleString('vi-VN');
        tdTime.style.fontSize = '11px';
        tdTime.style.whiteSpace = 'nowrap';
        tr.appendChild(tdTime);

        const tdUser = document.createElement('td');
        tdUser.textContent = row.username || '(anonymous)';
        tr.appendChild(tdUser);

        const tdAction = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'audit-badge';
        badge.dataset.action = row.action;
        badge.textContent = AUDIT_ACTION_LABELS[row.action] || row.action;
        tdAction.appendChild(badge);
        tr.appendChild(tdAction);

        const tdTarget = document.createElement('td');
        tdTarget.textContent = formatAuditTarget(row.target_type, row.target_id);
        tr.appendChild(tdTarget);

        const tdDetails = document.createElement('td');
        tdDetails.style.fontSize = '12px';
        tdDetails.style.maxWidth = '320px';
        tdDetails.style.overflow = 'hidden';
        tdDetails.style.textOverflow = 'ellipsis';
        tdDetails.style.whiteSpace = 'nowrap';
        const readable = formatAuditDetails(row.action, row.details);
        tdDetails.textContent = readable;
        tdDetails.title = readable;   // tooltip on hover for truncated values
        tr.appendChild(tdDetails);

        const tdIp = document.createElement('td');
        tdIp.textContent = row.ip_address || '-';
        tdIp.style.fontSize = '11px';
        tr.appendChild(tdIp);

        tbody.appendChild(tr);
    });

    renderPagination('audit-log-pagination', _auditLogAll.length, _auditLogPage, (page) => {
        _auditLogPage = page;
        renderAuditLog();
    });
}

function resetAuditSearch() {
    const s = document.getElementById('audit-search');
    if (s) s.value = '';
    const a = document.getElementById('audit-action-filter');
    if (a) a.value = '';
    loadAuditLog();
}

// ===================== F08 — VIDEOS ADMIN =====================
const TIKTOK_URL_RE = /^https?:\/\/((www\.|vt\.|m\.)?tiktok\.com\/|(www\.)?youtube\.com\/|youtu\.be\/)/i;
let _videosQuery = '';

function _escVid(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
}

function searchVideos() {
    _videosQuery = (document.getElementById('video-search')?.value || '').trim().toLowerCase();
    _videosPage = 1;
    renderVideosAdmin();
}

async function loadVideosAdmin() {
    try {
        const res = await fetch('/api/admin/videos');
        const json = await res.json();
        _videosAll = (json.success && Array.isArray(json.data)) ? json.data : [];
        _videosQuery = '';
        const searchEl = document.getElementById('video-search');
        if (searchEl) searchEl.value = '';
        _videosPage = 1;
        renderVideosAdmin();
        loadFeaturedVideosPanel();   // v3
    } catch (err) {
        console.error('loadVideosAdmin:', err);
        showToast('Error loading videos: ' + err.message, 'error');
    }
}

function renderVideosAdmin() {
    const tbody = document.getElementById('videos-table-body');
    if (!tbody) return;
    const list = _videosQuery
        ? _videosAll.filter(v => (v.title || '').toLowerCase().includes(_videosQuery))
        : _videosAll;
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;padding:2rem">Chưa có video</td></tr>';
        renderPagination('videos-pagination', 0, 1, () => {});
        return;
    }
    tbody.innerHTML = paginate(list, _videosPage).map(v => {
        const thumb = _escVid(v.thumbnail_path || '');
        const thumbHtml = thumb
            ? `<img src="${thumb}" alt="" style="width:48px;height:64px;object-fit:cover;border-radius:4px" onerror="this.style.display='none'">`
            : '<span style="color:#888">—</span>';
        const statusClass = v.status === 'active' ? 'status-active' : 'status-inactive';
        const statusLabel = v.status === 'active' ? 'Hiển thị' : 'Đã ẩn';
        const url = _escVid(v.tiktok_url || '');
        const urlShort = url.length > 50 ? url.slice(0, 50) + '…' : url;
        return `
            <tr data-id="${v.id}">
                <td>${v.id}</td>
                <td>${thumbHtml}</td>
                <td>${_escVid(v.title || '')}</td>
                <td><a href="${url}" target="_blank" rel="noopener noreferrer">${urlShort}</a></td>
                <td>${_escVid(v.views_count || '0')}</td>
                <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editVideo(${v.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        ${v.status === 'active'
                            ? `<button class="action-btn delete" onclick="confirmAction('Ẩn video này khỏi public site?', () => softDeleteVideo(${v.id}))" title="Hide"><i class="fas fa-eye-slash"></i></button>`
                            : `<button class="action-btn restore" onclick="restoreVideoStatus(${v.id})" title="Show"><i class="fas fa-eye"></i></button>`}
                        <button class="action-btn delete" onclick="confirmAction('Xóa VĨNH VIỄN video này? Không thể hoàn tác.', () => hardDeleteVideo(${v.id}))" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    renderPagination('videos-pagination', list.length, _videosPage, (page) => {
        _videosPage = page;
        renderVideosAdmin();
    });
}

function openVideoModal() {
    document.getElementById('video-modal-title').textContent = 'Add Video';
    document.getElementById('video-id').value = '';
    document.getElementById('video-title-input').value = '';
    document.getElementById('video-tiktok-url').value = '';
    document.getElementById('video-views').value = '';
    document.getElementById('video-thumb-path').value = '';
    document.getElementById('video-thumb-img').style.display = 'none';
    document.getElementById('video-thumb-img').src = '';
    document.getElementById('video-thumb-placeholder').style.display = 'flex';
    document.getElementById('video-modal-admin').style.display = 'flex';
}

function closeVideoModalAdmin() {
    document.getElementById('video-modal-admin').style.display = 'none';
}

async function editVideo(id) {
    try {
        const res = await fetch('/api/admin/videos/' + id);
        const json = await res.json();
        if (!json.success) { showToast('Không tải được video', 'error'); return; }
        const v = json.data;
        document.getElementById('video-modal-title').textContent = 'Edit Video #' + v.id;
        document.getElementById('video-id').value = v.id;
        document.getElementById('video-title-input').value = v.title || '';
        document.getElementById('video-tiktok-url').value = v.tiktok_url || '';
        document.getElementById('video-views').value = v.views_count || '';
        document.getElementById('video-thumb-path').value = v.thumbnail_path || '';
        const img = document.getElementById('video-thumb-img');
        const ph = document.getElementById('video-thumb-placeholder');
        if (v.thumbnail_path) { img.src = v.thumbnail_path; img.style.display = 'block'; ph.style.display = 'none'; }
        else { img.style.display = 'none'; ph.style.display = 'flex'; }
        document.getElementById('video-modal-admin').style.display = 'flex';
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function pickVideoThumb() {
    openMediaLibrary({
        mode: 'single',
        onSelect: ([url]) => {
            document.getElementById('video-thumb-path').value = url;
            const img = document.getElementById('video-thumb-img');
            img.src = url;
            img.style.display = 'block';
            document.getElementById('video-thumb-placeholder').style.display = 'none';
        }
    });
}

async function saveVideo() {
    const id = document.getElementById('video-id').value;
    const title = document.getElementById('video-title-input').value.trim();
    const tiktok_url = document.getElementById('video-tiktok-url').value.trim();
    const views_count = document.getElementById('video-views').value.trim();
    const thumbnail_path = document.getElementById('video-thumb-path').value.trim();

    if (!title) { showToast('Tiêu đề không được trống', 'error'); return; }
    if (!TIKTOK_URL_RE.test(tiktok_url)) {
        showToast('URL không hợp lệ — phải là TikTok (tiktok.com) hoặc YouTube (youtube.com / youtu.be)', 'error');
        return;
    }
    const payload = { title, tiktok_url, thumbnail_path, views_count };
    try {
        const res = await fetch(id ? '/api/admin/videos/' + id : '/api/admin/videos', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success) { showToast(json.message || 'Lỗi', 'error'); return; }
        showToast(id ? 'Cập nhật thành công' : 'Thêm video thành công', 'success');
        closeVideoModalAdmin();
        loadVideosAdmin();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function softDeleteVideo(id) {
    try {
        const res = await fetch('/api/admin/videos/' + id + '/soft-delete', { method: 'PUT' });
        const json = await res.json();
        showToast(json.message || (json.success ? 'Đã ẩn' : 'Lỗi'), json.success ? 'success' : 'error');
        if (json.success) loadVideosAdmin();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function restoreVideoStatus(id) {
    try {
        const res = await fetch('/api/admin/videos/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' })
        });
        const json = await res.json();
        showToast(json.message || (json.success ? 'Đã hiện lại' : 'Lỗi'), json.success ? 'success' : 'error');
        if (json.success) loadVideosAdmin();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function hardDeleteVideo(id) {
    try {
        const res = await fetch('/api/admin/videos/' + id, { method: 'DELETE' });
        const json = await res.json();
        if (!json.success) { showToast(json.message || 'Lỗi', 'error'); return; }
        showToast('Đã xóa', 'success');
        loadVideosAdmin();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ===================== v3: FEATURED VIDEOS PANEL =====================
let _featuredVideosSelection = new Set();
let _featuredVideosAllActive = [];
let _featuredVideosPage = 1;
const FEATURED_VIDEOS_PAGE_SIZE = 5;

async function loadFeaturedVideosPanel() {
    const grid = document.getElementById('featured-videos-available-grid');
    if (!grid) return;
    try {
        const [allRes, featRes] = await Promise.all([
            fetch('/api/admin/videos'),
            fetch('/api/admin/videos/featured')
        ]);
        const allJson = await allRes.json();
        const featJson = await featRes.json();
        _featuredVideosAllActive = (allJson.success && Array.isArray(allJson.data)) ? allJson.data.filter(v => v.status === 'active') : [];
        const featuredIds = (featJson.success && Array.isArray(featJson.data)) ? featJson.data.map(v => v.id) : [];
        _featuredVideosSelection = new Set(featuredIds);
        _featuredVideosPage = 1;
        renderFeaturedVideosPanel();
    } catch (err) {
        console.error('loadFeaturedVideosPanel:', err);
    }
}

function featuredVideoCardHtml(v) {
    const isSel = _featuredVideosSelection.has(v.id);
    const cover = (v.thumbnail_path || '/uploads/main_image.jpg');
    return `<div class="featured-card ${isSel ? 'selected' : ''}" data-id="${v.id}" onclick="toggleFeaturedVideo(${v.id})">
        <img src="${cover}" alt="" onerror="this.style.visibility='hidden'">
        <div class="featured-card-body">
            <p class="featured-card-name">${(v.title || '').replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>
            <span class="featured-card-area">${(v.views_count || '0').toString()} views</span>
        </div>
    </div>`;
}

function renderFeaturedVideosPanel() {
    const selGrid = document.getElementById('featured-videos-selected-grid');
    const availGrid = document.getElementById('featured-videos-available-grid');
    if (!selGrid || !availGrid) return;

    const selected = _featuredVideosAllActive.filter(v => _featuredVideosSelection.has(v.id));
    const available = _featuredVideosAllActive.filter(v => !_featuredVideosSelection.has(v.id));

    selGrid.innerHTML = selected.length
        ? selected.map(featuredVideoCardHtml).join('')
        : '<p class="featured-empty">Chưa chọn video nào</p>';

    const totalPages = Math.max(1, Math.ceil(available.length / FEATURED_VIDEOS_PAGE_SIZE));
    if (_featuredVideosPage > totalPages) _featuredVideosPage = totalPages;
    const start = (_featuredVideosPage - 1) * FEATURED_VIDEOS_PAGE_SIZE;
    const pageItems = available.slice(start, start + FEATURED_VIDEOS_PAGE_SIZE);

    availGrid.innerHTML = pageItems.length
        ? pageItems.map(featuredVideoCardHtml).join('')
        : '<p class="featured-empty">Không còn video nào</p>';

    renderFeaturedVideosPagination(totalPages);
    updateFeaturedVideosCounter();
}

function renderFeaturedVideosPagination(totalPages) {
    const pag = document.getElementById('featured-videos-pagination');
    if (!pag) return;
    if (totalPages <= 1) { pag.innerHTML = ''; return; }
    let html = `<button class="page-btn" ${_featuredVideosPage === 1 ? 'disabled' : ''} onclick="changeFeaturedVideosPage(${_featuredVideosPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === _featuredVideosPage ? 'active' : ''}" onclick="changeFeaturedVideosPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${_featuredVideosPage === totalPages ? 'disabled' : ''} onclick="changeFeaturedVideosPage(${_featuredVideosPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    pag.innerHTML = html;
}

function changeFeaturedVideosPage(page) {
    _featuredVideosPage = page;
    renderFeaturedVideosPanel();
}

function updateFeaturedVideosCounter() {
    const c = document.getElementById('featured-videos-counter');
    if (c) c.textContent = `${_featuredVideosSelection.size} / 6 selected`;
    document.querySelectorAll('#featured-videos-available-grid .featured-card').forEach(card => {
        if (_featuredVideosSelection.size >= 6) {
            card.classList.add('disabled');
        } else {
            card.classList.remove('disabled');
        }
    });
}

function toggleFeaturedVideo(id) {
    if (_featuredVideosSelection.has(id)) {
        _featuredVideosSelection.delete(id);
    } else {
        if (_featuredVideosSelection.size >= 6) {
            showToast('Tối đa 6 videos featured', 'error');
            return;
        }
        _featuredVideosSelection.add(id);
    }
    renderFeaturedVideosPanel();
}

async function saveFeaturedVideos() {
    try {
        const ids = Array.from(_featuredVideosSelection);
        const res = await fetch('/api/admin/videos/featured', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const json = await res.json();
        if (!json.success) { showToast(json.message || 'Lỗi', 'error'); return; }
        showToast(`Đã lưu ${ids.length} featured videos`, 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ===================== F09 — NEWS ADMIN =====================
function _escNews(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
}

async function loadNewsAdmin(query, dateFrom, dateTo) {
    try {
        const params = new URLSearchParams();
        if (query)   params.set('q', query);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo)   params.set('date_to', dateTo);
        const qs = params.toString();
        const res = await fetch('/api/admin/news' + (qs ? '?' + qs : ''));
        const json = await res.json();
        _newsAll = (json.success && Array.isArray(json.data)) ? json.data : [];
        _newsPage = 1;
        renderNewsAdmin();
    } catch (err) {
        console.error('loadNewsAdmin:', err);
        showToast('Error loading news: ' + err.message, 'error');
    }
}

function renderNewsAdmin() {
    const tbody = document.getElementById('news-table-body');
    if (!tbody) return;
    if (_newsAll.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:2rem">Chưa có tin tức</td></tr>';
        renderPagination('news-pagination', 0, 1, () => {});
        return;
    }
    tbody.innerHTML = paginate(_newsAll, _newsPage).map(n => {
        const statusClass = n.status === 'active' ? 'status-active' : 'status-inactive';
        const statusLabel = n.status === 'active' ? 'Hiển thị' : 'Đã ẩn';
        const created = n.created_at ? new Date(n.created_at).toLocaleDateString('en-AU') : '';
        return `
            <tr data-id="${n.id}">
                <td>${n.id}</td>
                <td>${_escNews(n.title || '')}</td>
                <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                <td>${created}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editNewsItem(${n.id})" title="Edit"><i class="fas fa-edit"></i></button>
                        ${n.status === 'active'
                            ? `<button class="action-btn delete" onclick="confirmAction('Ẩn tin này khỏi public site?', () => softDeleteNews(${n.id}))" title="Hide"><i class="fas fa-eye-slash"></i></button>`
                            : `<button class="action-btn restore" onclick="restoreNewsStatus(${n.id})" title="Show"><i class="fas fa-eye"></i></button>`}
                        <button class="action-btn delete" onclick="confirmAction('Xóa VĨNH VIỄN tin này? Không thể hoàn tác.', () => hardDeleteNews(${n.id}))" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    renderPagination('news-pagination', _newsAll.length, _newsPage, (page) => {
        _newsPage = page;
        renderNewsAdmin();
    });
}

function searchNews() {
    const q        = (document.getElementById('news-search')?.value    || '').trim() || undefined;
    const dateFrom = (document.getElementById('news-date-from')?.value || '').trim() || undefined;
    let   dateTo   = (document.getElementById('news-date-to')?.value   || '').trim() || undefined;
    if (dateFrom && !dateTo) dateTo = dateFrom;
    loadNewsAdmin(q, dateFrom, dateTo);
}

function openNewsModal() {
    document.getElementById('news-modal-title').textContent = 'Add News';
    document.getElementById('news-id').value = '';
    document.getElementById('news-form-title').value = '';
    document.getElementById('news-form-summary').value = '';
    document.getElementById('news-form-content').value = '';
    document.getElementById('news-form-cover').value = '';
    document.getElementById('news-form-status').value = 'active';
    const extInp = document.getElementById('news-form-external-url'); if (extInp) extInp.value = '';
    const img = document.getElementById('news-cover-img');
    img.style.display = 'none'; img.src = '';
    document.getElementById('news-cover-placeholder').style.display = 'flex';
    document.getElementById('news-modal-admin').style.display = 'flex';
}

function closeNewsModalAdmin() {
    document.getElementById('news-modal-admin').style.display = 'none';
}

async function editNewsItem(id) {
    try {
        const res = await fetch('/api/admin/news/' + id);
        const json = await res.json();
        if (!json.success) { showToast('Không tải được tin tức', 'error'); return; }
        const n = json.data;
        document.getElementById('news-modal-title').textContent = 'Edit News #' + n.id;
        document.getElementById('news-id').value = n.id;
        document.getElementById('news-form-title').value = n.title || '';
        document.getElementById('news-form-summary').value = n.summary || '';
        document.getElementById('news-form-content').value = n.content || '';
        document.getElementById('news-form-cover').value = n.cover_image || '';
        document.getElementById('news-form-status').value = n.status || 'active';
        const extInp = document.getElementById('news-form-external-url'); if (extInp) extInp.value = n.external_url || '';
        const img = document.getElementById('news-cover-img');
        const ph = document.getElementById('news-cover-placeholder');
        if (n.cover_image) { img.src = n.cover_image; img.style.display = 'block'; ph.style.display = 'none'; }
        else { img.style.display = 'none'; ph.style.display = 'flex'; }
        document.getElementById('news-modal-admin').style.display = 'flex';
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function pickNewsCover() {
    openMediaLibrary({
        mode: 'single',
        onSelect: ([url]) => {
            document.getElementById('news-form-cover').value = url;
            const img = document.getElementById('news-cover-img');
            img.src = url; img.style.display = 'block';
            document.getElementById('news-cover-placeholder').style.display = 'none';
        }
    });
}

async function saveNewsItem() {
    const id = document.getElementById('news-id').value;
    const title = document.getElementById('news-form-title').value.trim();
    const summary = document.getElementById('news-form-summary').value;
    const content = document.getElementById('news-form-content').value;
    const cover_image = document.getElementById('news-form-cover').value.trim();
    const status = document.getElementById('news-form-status').value;
    const extInp = document.getElementById('news-form-external-url');
    const external_url = extInp ? extInp.value.trim() : '';

    if (!title) { showToast('Tiêu đề bắt buộc', 'error'); return; }
    if (title.length > 255) { showToast('Tiêu đề tối đa 255 ký tự', 'error'); return; }
    if (summary.length > 500) { showToast('Tóm tắt tối đa 500 ký tự', 'error'); return; }
    if (external_url && !/^https?:\/\//i.test(external_url)) {
        showToast('External URL phải bắt đầu bằng http:// hoặc https://', 'error');
        return;
    }

    const payload = { title, summary, content, cover_image, external_url };
    if (id) payload.status = status;
    try {
        const res = await fetch(id ? '/api/admin/news/' + id : '/api/admin/news', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.success) { showToast(json.message || 'Lỗi', 'error'); return; }
        showToast(id ? 'Cập nhật thành công' : 'Tạo tin tức thành công', 'success');
        closeNewsModalAdmin();
        loadNewsAdmin();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function softDeleteNews(id) {
    try {
        const res = await fetch('/api/admin/news/' + id + '/soft-delete', { method: 'PUT' });
        const json = await res.json();
        showToast(json.message || (json.success ? 'Đã ẩn' : 'Lỗi'), json.success ? 'success' : 'error');
        if (json.success) loadNewsAdmin();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function restoreNewsStatus(id) {
    try {
        const res = await fetch('/api/admin/news/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' })
        });
        const json = await res.json();
        showToast(json.message || (json.success ? 'Đã hiện lại' : 'Lỗi'), json.success ? 'success' : 'error');
        if (json.success) loadNewsAdmin();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function hardDeleteNews(id) {
    try {
        const res = await fetch('/api/admin/news/' + id, { method: 'DELETE' });
        const json = await res.json();
        if (!json.success) { showToast(json.message || 'Lỗi', 'error'); return; }
        showToast('Đã xóa', 'success');
        loadNewsAdmin();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

