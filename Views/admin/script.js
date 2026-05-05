// ===================== STATE =====================
let currentProjectKeyword = '';
let currentEditId = null;
let currentAccountEditId = null;
let projectSearchTimeout = null;
let contactSearchTimeout = null;
let currentProjectImages = []; // { id: dbId|null, image_path: string, isNew: bool }
let imageUploadQueue = [];    // files to upload on form submit

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

    // Project images upload handler
    const uploadTrigger = document.getElementById('image-upload-trigger');
    const fileInput = document.getElementById('project-media-file');
    if (uploadTrigger && fileInput) {
        uploadTrigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                for (const file of e.target.files) {
                    await handleNewImageFile(file);
                }
                e.target.value = '';
            }
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
        case 'dashboard': loadDashboard(); break;
        case 'projects': loadProjects(); break;
        case 'contacts': loadContacts(); break;
        case 'accounts': loadAccounts(); break;
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

// ===================== SETTINGS UPLOAD HELPERS =====================
function setupSettingsUpload() {
    // Logo upload
    const logoBtn = document.getElementById('logo-upload-btn');
    const logoInput = document.getElementById('logo-file-input');
    if (logoBtn && logoInput) {
        logoBtn.addEventListener('click', () => logoInput.click());
        logoInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                currentLogoFile = e.target.files[0];
                const previewUrl = URL.createObjectURL(currentLogoFile);
                document.getElementById('current-logo-img').src = previewUrl;
                document.getElementById('current-logo-img').style.display = 'block';
                document.getElementById('logo-preview-placeholder').style.display = 'none';
                document.getElementById('logo-remove-btn').style.display = 'inline-flex';
            }
        });
    }

    // Main image upload
    const mainBtn = document.getElementById('main-image-upload-btn');
    const mainInput = document.getElementById('main-image-file-input');
    if (mainBtn && mainInput) {
        mainBtn.addEventListener('click', () => mainInput.click());
        mainInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                currentMainImageFile = e.target.files[0];
                const previewUrl = URL.createObjectURL(currentMainImageFile);
                document.getElementById('current-main-image-img').src = previewUrl;
                document.getElementById('current-main-image-img').style.display = 'block';
                document.getElementById('main-image-preview-placeholder').style.display = 'none';
                document.getElementById('main-image-remove-btn').style.display = 'inline-flex';
            }
        });
    }
}

function removeLogoImage() {
    currentLogoFile = null;
    currentLogoPath = '';
    document.getElementById('current-logo-img').style.display = 'none';
    document.getElementById('logo-preview-placeholder').style.display = 'flex';
    document.getElementById('logo-remove-btn').style.display = 'none';
    document.getElementById('logo-file-input').value = '';
}

function removeMainImage() {
    currentMainImageFile = null;
    currentMainImagePath = '';
    document.getElementById('current-main-image-img').style.display = 'none';
    document.getElementById('main-image-preview-placeholder').style.display = 'flex';
    document.getElementById('main-image-remove-btn').style.display = 'none';
    document.getElementById('main-image-file-input').value = '';
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
                mainImageValue = result.path.replace(/^\/images\//, '');
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
            showToast('Settings saved successfully!', 'success');
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
                    <button class="action-btn delete" onclick="confirmAction('Stop this project?', () => softDeleteProject(${p.id}))" title="Stop"><i class="fas fa-ban"></i></button>
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
                    <button class="action-btn delete" onclick="confirmAction('Permanently delete this project?', () => permanentlyDeleteProject(${p.id}))" title="Delete"><i class="fas fa-trash"></i></button>
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
        small_content: document.getElementById('project-content').value
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
                const cleanPath = (firstImg.image_path || '').replace(/^\/images\//, '').replace(/^\/uploads\//, '');
                console.log('Setting image_path to:', cleanPath);
                await fetch(`/api/admin/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_path: cleanPath })
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
                    <button class="action-btn delete" onclick="confirmAction('Delete this contact?', () => deleteContact(${c.id}))" title="Delete"><i class="fas fa-trash"></i></button>
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
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#95a5a6;">No accounts found</td></tr>';
        return;
    }

    tbody.innerHTML = accounts.map(a => `
        <tr>
            <td>${a.id}</td>
            <td>${escapeHtml(a.username)}</td>
            <td>${formatDate(a.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editAccount(${a.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="confirmAction('Delete this account?', () => deleteAccount(${a.id}))" title="Delete"><i class="fas fa-trash"></i></button>
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

    if (!currentAccountEditId && !password) {
        showToast('Password is required', 'error');
        return;
    }

    try {
        let res, result;
        if (currentAccountEditId) {
            const body = { username };
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
                body: JSON.stringify({ username, password })
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

// ===================== LOGOUT =====================
function logoutAdmin() {
    fetch('/logout', { method: 'POST' })
        .then(() => window.location.href = '/login')
        .catch(() => window.location.href = '/login');
}
