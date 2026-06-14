// ===================== STATE =====================
let currentProjectKeyword = '';
let currentEditId = null;
let currentAccountEditId = null;
let projectSearchTimeout = null;
let contactSearchTimeout = null;
let currentProjectImages = []; // { id: dbId|null, image_path: string, isNew: bool }
let imageUploadQueue = [];    // files to upload on form submit
let translateLoadingEl = null;

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    setupNavigation();
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

function switchSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');

    switch (section) {
        case 'dashboard': loadDashboard(); ensurePreviewLoaded('settings'); break;
        case 'projects': loadProjects(); break;
        case 'contacts': loadContacts(); break;
        case 'accounts': loadAccounts(); break;
        case 'audit-log': loadAuditLog(); break;
        case 'home-about': loadHomeAbout(); loadAboutContent(); ensurePreviewLoaded('about'); break;
        case 'home-services': loadHomeServices(); ensurePreviewLoaded('services'); break;
        case 'home-footer': loadHomeFooter(); loadFooterContent(); ensurePreviewLoaded('footer'); break;
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

            // F06: Purpose-Invest video
            window._currentPurposeThumb = settingsData.data.purpose_video_thumbnail || '';
            document.getElementById('setting-purpose-video-url').value = settingsData.data.purpose_video_url || '';
            // v12: Footer dynamic content fields are now in the Footer tab — not loaded here
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
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
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
                    postPreviewData('settings');
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
        main_image: mainImageValue,
        // F06: Purpose-Invest video keys
        purpose_video_thumbnail: window._currentPurposeThumb || '',
        purpose_video_url: document.getElementById('setting-purpose-video-url').value.trim()
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
            if (data.success) renderActiveProjects(data.data);
        });
}

function loadInactiveProjects() {
    const keyword = currentProjectKeyword || '';
    fetch(`/api/admin/projects/search?keyword=${encodeURIComponent(keyword)}&status=inactive`)
        .then(res => res.json())
        .then(data => {
            if (data.success) renderInactiveProjects(data.data);
        });
}

function renderActiveProjects(projects) {
    const tbody = document.getElementById('active-projects-tbody');
    if (!projects || projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#95a5a6;">No active projects</td></tr>';
        return;
    }
    tbody.innerHTML = projects.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
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
}

function renderInactiveProjects(projects) {
    const tbody = document.getElementById('inactive-projects-tbody');
    if (!projects || projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#95a5a6;">No inactive projects</td></tr>';
        return;
    }
    tbody.innerHTML = projects.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
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
        document.getElementById('project-price').value = p.price || '';
        document.getElementById('project-state').value = p.state || '';
        document.getElementById('project-property-type').value = p.property_type || '';
        document.getElementById('project-area-label').value = p.area_label || '';
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
    const payload = {
        name: document.getElementById('project-name').value,
        area: document.getElementById('project-area').value,
        square_meters: document.getElementById('project-square').value,
        category: document.getElementById('project-category').value,
        year: document.getElementById('project-year').value,
        style: document.getElementById('project-style').value,
        small_content: document.getElementById('project-content').value,
        // F05d: 8 extended fields
        price: document.getElementById('project-price').value.trim(),
        state: document.getElementById('project-state').value,
        property_type: document.getElementById('project-property-type').value,
        area_label: document.getElementById('project-area-label').value.trim(),
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
let _featuredSelection = new Set();
async function loadFeaturedPanel() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    try {
        const [allRes, featRes] = await Promise.all([
            fetch('/api/admin/projects'),
            fetch('/api/admin/projects/featured')
        ]);
        const allJson = await allRes.json();
        const featJson = await featRes.json();
        const all = (allJson.success && Array.isArray(allJson.data)) ? allJson.data.filter(p => p.status === 'active') : [];
        const featuredIds = (featJson.success && Array.isArray(featJson.data)) ? featJson.data.map(p => p.id) : [];
        _featuredSelection = new Set(featuredIds);
        renderFeaturedGrid(all);
    } catch (err) {
        console.error('loadFeaturedPanel:', err);
    }
}

function renderFeaturedGrid(projects) {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    grid.innerHTML = projects.map(p => {
        const isSel = _featuredSelection.has(p.id);
        const cover = (p.image_path || '/uploads/main_image.jpg');
        return `<div class="featured-card ${isSel ? 'selected' : ''}" data-id="${p.id}" onclick="toggleFeatured(${p.id})">
            <img src="${cover}" alt="" onerror="this.style.visibility='hidden'">
            <div class="featured-card-body">
                <p class="featured-card-name">${(p.name || '').replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>
                <span class="featured-card-area">${(p.area || '').toString()}</span>
            </div>
        </div>`;
    }).join('');
    updateFeaturedCounter();
}

function updateFeaturedCounter() {
    const c = document.getElementById('featured-counter');
    if (c) c.textContent = `${_featuredSelection.size} / 4 selected`;
    // disable cards if 4 selected and they're not currently selected
    document.querySelectorAll('.featured-card').forEach(card => {
        const id = parseInt(card.dataset.id, 10);
        if (_featuredSelection.size >= 4 && !_featuredSelection.has(id)) {
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
    const card = document.querySelector(`.featured-card[data-id="${id}"]`);
    if (card) card.classList.toggle('selected', _featuredSelection.has(id));
    updateFeaturedCounter();
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
            renderContactsTable(data.data);
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

function renderContactsTable(contacts) {
    const tbody = document.getElementById('contacts-tbody');
    if (!contacts || contacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#95a5a6;">No contacts found</td></tr>';
        return;
    }

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
            renderContactsTable(data.data);
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
            renderAccountsTable(data.data);
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

function renderAccountsTable(accounts) {
    const tbody = document.getElementById('accounts-tbody');
    if (!accounts || accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:#95a5a6;">No accounts found</td></tr>';
        return;
    }

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
            footer_tiktok_url:   v('setting-footer-tiktok')
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
        // also include the 2 footer_persons so /about?preview can re-render leadership
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
            banner: (document.getElementById('about-input-banner') || {}).value || '',
            paragraph_left: (document.getElementById('about-input-left') || {}).value || '',
            paragraph_right: (document.getElementById('about-input-right') || {}).value || '',
            stats,
            // v12: /about page content
            about_hero_tag:           v('setting-about-hero-tag'),
            about_hero_title:         v('setting-about-hero-title'),
            about_mission:            v('setting-about-mission'),
            about_office_sydney_address: v('setting-about-sydney-address'),
            about_office_sydney_phone:   v('setting-about-sydney-phone'),
            about_office_sydney_email:   v('setting-about-sydney-email'),
            about_office_hcm_address: v('setting-about-hcm-address'),
            about_office_hcm_phone:   v('setting-about-hcm-phone'),
            about_office_hcm_email:   v('setting-about-hcm-email'),
            footer_persons
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
    footer: debounce(() => postPreviewData('footer'), 200)
};

// Listen for iframe messages (ready + auto-resize)
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const msg = event.data || {};
    if (msg.type === 'preview-ready') {
        PREVIEW_READY.add(msg.scope);
        postPreviewData(msg.scope);   // push initial state
    } else if (msg.type === 'preview-height') {
        // Auto-resize all 4 iframes by matching the source frame
        ['settings', 'about', 'services', 'footer'].forEach(t => {
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
    ['setting-about-hero-tag','setting-about-hero-title','setting-about-mission',
     'setting-about-sydney-address','setting-about-sydney-phone','setting-about-sydney-email',
     'setting-about-hcm-address','setting-about-hcm-phone','setting-about-hcm-email'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => pushPreviewDebounced.about());
    });

    ['about-input-banner', 'about-input-left', 'about-input-right'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', pushPreviewDebounced.about);
    });

    // about stat inputs are dynamic — use event delegation on the grid
    const statsGrid = document.getElementById('about-stats-grid');
    if (statsGrid) statsGrid.addEventListener('input', pushPreviewDebounced.about);

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
        'home-footer': 'footer'
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
        setVal('setting-about-sydney-address', json.data.about_office_sydney_address);
        setVal('setting-about-sydney-phone',   json.data.about_office_sydney_phone);
        setVal('setting-about-sydney-email',   json.data.about_office_sydney_email);
        setVal('setting-about-hcm-address',    json.data.about_office_hcm_address);
        setVal('setting-about-hcm-phone',      json.data.about_office_hcm_phone);
        setVal('setting-about-hcm-email',      json.data.about_office_hcm_email);
    } catch (e) {
        console.error('loadAboutContent:', e);
    }
}

async function saveAboutContent() {
    const v = id => (document.getElementById(id) || {}).value || '';
    const payload = {
        about_hero_tag:              v('setting-about-hero-tag'),
        about_hero_title:            v('setting-about-hero-title'),
        about_mission:               v('setting-about-mission'),
        about_office_sydney_address: v('setting-about-sydney-address'),
        about_office_sydney_phone:   v('setting-about-sydney-phone'),
        about_office_sydney_email:   v('setting-about-sydney-email'),
        about_office_hcm_address:    v('setting-about-hcm-address'),
        about_office_hcm_phone:      v('setting-about-hcm-phone'),
        about_office_hcm_email:      v('setting-about-hcm-email')
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
        if (json.success) refreshPreview('about');
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
                + '  <textarea class="svc-desc" rows="4" maxlength="2000"></textarea></div>'
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

let _mediaState = {
    allMedia: [],
    filteredMedia: [],
    selectedUrls: new Set(),
    mode: 'single',
    onSelect: null,
    query: ''
};

function openMediaLibrary({ mode = 'single', onSelect = null } = {}) {
    _mediaState.mode = mode;
    _mediaState.onSelect = onSelect;
    _mediaState.selectedUrls = new Set();
    _mediaState.query = '';
    const searchInp = document.getElementById('media-search-input');
    if (searchInp) searchInp.value = '';
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
    _mediaState.filteredMedia = q
        ? _mediaState.allMedia.filter(m => m.name.toLowerCase().includes(q))
        : _mediaState.allMedia.slice();
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

        const img = document.createElement('img');
        img.src = m.url;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function () { this.style.display = 'none'; };
        item.appendChild(img);

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
    // F09: news actions
    'NEWS_CREATE': 'Tạo tin tức mới',
    'NEWS_UPDATE': 'Cập nhật tin tức',
    'NEWS_SOFTDELETE': 'Ẩn tin tức',
    'NEWS_DELETE': 'Xóa vĩnh viễn tin tức'
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
    'about_office_sydney_address': '/about — Sydney address',
    'about_office_sydney_phone': '/about — Sydney phone',
    'about_office_sydney_email': '/about — Sydney email',
    'about_office_hcm_address': '/about — HCMC address',
    'about_office_hcm_phone': '/about — HCMC phone',
    'about_office_hcm_email': '/about — HCMC email',
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
        const tbody = document.getElementById('audit-log-tbody');
        tbody.innerHTML = '';

        if (!j.success || !j.data || j.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#95a5a6">Không có dữ liệu</td></tr>';
            return;
        }

        j.data.forEach(row => {
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
    } catch (err) {
        console.error('loadAuditLog:', err);
        showToast('Lỗi tải audit log: ' + err.message, 'error');
    }
}

function resetAuditSearch() {
    const s = document.getElementById('audit-search');
    if (s) s.value = '';
    const a = document.getElementById('audit-action-filter');
    if (a) a.value = '';
    loadAuditLog();
}

// ===================== F08 — VIDEOS ADMIN =====================
const TIKTOK_URL_RE = /^https?:\/\/(www\.|vt\.|m\.)?tiktok\.com\//i;

function _escVid(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
}

async function loadVideosAdmin() {
    try {
        const res = await fetch('/api/admin/videos');
        const json = await res.json();
        const tbody = document.getElementById('videos-table-body');
        if (!tbody) return;
        if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:2rem">Chưa có video</td></tr>';
            return;
        }
        tbody.innerHTML = json.data.map(v => {
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
                    <td>${v.display_order || 0}</td>
                    <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <button class="btn-edit" onclick="editVideo(${v.id})"><i class="fas fa-edit"></i></button>
                        ${v.status === 'active'
                            ? `<button class="btn-cancel" onclick="softDeleteVideo(${v.id})" title="Ẩn"><i class="fas fa-eye-slash"></i></button>`
                            : `<button class="btn-add" onclick="restoreVideoStatus(${v.id})" title="Hiện lại"><i class="fas fa-eye"></i></button>`}
                        <button class="btn-cancel" onclick="hardDeleteVideo(${v.id})" title="Xóa vĩnh viễn"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
    } catch (err) {
        console.error('loadVideosAdmin:', err);
        showToast('Error loading videos: ' + err.message, 'error');
    }
}

function openVideoModal() {
    document.getElementById('video-modal-title').textContent = 'Add Video';
    document.getElementById('video-id').value = '';
    document.getElementById('video-title-input').value = '';
    document.getElementById('video-tiktok-url').value = '';
    document.getElementById('video-views').value = '';
    document.getElementById('video-order').value = '0';
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
        document.getElementById('video-order').value = v.display_order || 0;
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
    const display_order = parseInt(document.getElementById('video-order').value, 10) || 0;
    const thumbnail_path = document.getElementById('video-thumb-path').value.trim();

    if (!title) { showToast('Tiêu đề không được trống', 'error'); return; }
    if (!TIKTOK_URL_RE.test(tiktok_url)) {
        showToast('TikTok URL không hợp lệ — phải bắt đầu bằng https://(www.|vt.|m.)tiktok.com/', 'error');
        return;
    }
    const payload = { title, tiktok_url, thumbnail_path, views_count, display_order };
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
    if (!confirm('Ẩn video này khỏi public site?')) return;
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
    if (!confirm('Xóa VĨNH VIỄN video này? Không thể hoàn tác.')) return;
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

// ===================== F09 — NEWS ADMIN =====================
function _escNews(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
}

async function loadNewsAdmin(query) {
    try {
        const url = query
            ? '/api/admin/news?q=' + encodeURIComponent(query)
            : '/api/admin/news';
        const res = await fetch(url);
        const json = await res.json();
        const tbody = document.getElementById('news-table-body');
        if (!tbody) return;
        if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:2rem">Chưa có tin tức</td></tr>';
            return;
        }
        tbody.innerHTML = json.data.map(n => {
            const statusClass = n.status === 'active' ? 'status-active' : 'status-inactive';
            const statusLabel = n.status === 'active' ? 'Hiển thị' : 'Đã ẩn';
            const created = n.created_at ? new Date(n.created_at).toLocaleDateString('en-AU') : '';
            return `
                <tr data-id="${n.id}">
                    <td>${n.id}</td>
                    <td>${_escNews(n.title || '')}</td>
                    <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                    <td>${n.display_order || 0}</td>
                    <td>${created}</td>
                    <td>
                        <button class="btn-edit" onclick="editNewsItem(${n.id})" title="Sửa"><i class="fas fa-edit"></i></button>
                        ${n.status === 'active'
                            ? `<button class="btn-cancel" onclick="softDeleteNews(${n.id})" title="Ẩn"><i class="fas fa-eye-slash"></i></button>`
                            : `<button class="btn-add" onclick="restoreNewsStatus(${n.id})" title="Hiện lại"><i class="fas fa-eye"></i></button>`}
                        <button class="btn-cancel" onclick="hardDeleteNews(${n.id})" title="Xóa vĩnh viễn"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
    } catch (err) {
        console.error('loadNewsAdmin:', err);
        showToast('Error loading news: ' + err.message, 'error');
    }
}

function searchNews() {
    const q = document.getElementById('news-search').value.trim();
    loadNewsAdmin(q || undefined);
}

function openNewsModal() {
    document.getElementById('news-modal-title').textContent = 'Add News';
    document.getElementById('news-id').value = '';
    document.getElementById('news-form-title').value = '';
    document.getElementById('news-form-summary').value = '';
    document.getElementById('news-form-content').value = '';
    document.getElementById('news-form-cover').value = '';
    document.getElementById('news-form-order').value = '0';
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
        document.getElementById('news-form-order').value = n.display_order || 0;
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
    const display_order = parseInt(document.getElementById('news-form-order').value, 10) || 0;
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

    const payload = { title, summary, content, cover_image, display_order, external_url };
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
    if (!confirm('Ẩn tin tức này khỏi public site?')) return;
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
    if (!confirm('Xóa VĨNH VIỄN tin tức này? Không thể hoàn tác.')) return;
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
