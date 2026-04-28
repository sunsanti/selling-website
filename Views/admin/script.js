// ===================== STATE =====================
let currentProjectKeyword = '';
let currentEditId = null;
let currentAccountEditId = null;
let projectSearchTimeout = null;
let contactSearchTimeout = null;

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    setupNavigation();
    setupForms();

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

    // Media upload handlers
    const uploadArea = document.getElementById('media-upload-area');
    const fileInput = document.getElementById('project-media-file');
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('dragover'); });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) handleMediaFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleMediaFile(e.target.files[0]);
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
            document.getElementById('setting-logo').value = settingsData.data.logo || '';
            document.getElementById('setting-phone').value = settingsData.data.phone || '';
            document.getElementById('setting-main-image').value = settingsData.data.main_image || '';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ===================== SETTINGS =====================
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        logo: document.getElementById('setting-logo').value,
        phone: document.getElementById('setting-phone').value,
        main_image: document.getElementById('setting-main-image').value
    };

    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            showToast('Settings saved successfully!', 'success');
        } else {
            showToast(result.message || 'Error saving settings', 'error');
        }
    } catch (error) {
        showToast('Error saving settings', 'error');
    }
});

// ===================== PROJECTS =====================
function handleMediaFile(file) {
    const acceptTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!acceptTypes.includes(file.type)) {
        showToast('Only JPG, PNG, GIF, MP4, WEBM allowed', 'error');
        return;
    }
    if (file.size > 50 * 1024 * 1024) {
        showToast('File must be under 50MB', 'error');
        return;
    }

    document.getElementById('project-media-path').value = '';
    document.getElementById('media-placeholder').style.display = 'none';
    document.getElementById('media-preview').style.display = 'block';

    if (file.type.startsWith('image/')) {
        document.getElementById('media-preview-img').style.display = 'block';
        document.getElementById('media-preview-img').src = URL.createObjectURL(file);
        document.getElementById('media-preview-video').style.display = 'none';
    } else {
        document.getElementById('media-preview-video').style.display = 'block';
        document.getElementById('media-preview-video').src = URL.createObjectURL(file);
        document.getElementById('media-preview-img').style.display = 'none';
    }

    const hiddenInput = document.getElementById('project-media-file');
    const dt = new DataTransfer();
    dt.items.add(file);
    hiddenInput.files = dt.files;
}

function removeMediaPreview() {
    document.getElementById('project-media-file').value = '';
    document.getElementById('project-media-path').value = '';
    document.getElementById('media-placeholder').style.display = 'block';
    document.getElementById('media-preview').style.display = 'none';
    document.getElementById('media-preview-img').src = '';
    document.getElementById('media-preview-video').src = '';
}

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
        document.getElementById('project-order').value = p.display_order || 0;
        document.getElementById('project-content').value = p.small_content || '';
        document.getElementById('project-media-path').value = p.image_path || '';

        if (p.image_path) {
            document.getElementById('media-placeholder').style.display = 'none';
            document.getElementById('media-preview').style.display = 'block';
            document.getElementById('media-preview-img').style.display = 'block';
            document.getElementById('media-preview-img').src = p.image_path;
            document.getElementById('media-preview-video').style.display = 'none';
        } else {
            removeMediaPreview();
        }

        document.getElementById('project-modal').style.display = 'flex';
    } catch (error) {
        showToast('Error loading project', 'error');
    }
}

function openProjectModal() {
    currentEditId = null;
    document.getElementById('project-modal-title').textContent = 'Add Project';
    document.getElementById('project-form').reset();
    document.getElementById('project-id').value = '';
    removeMediaPreview();
    document.getElementById('project-modal').style.display = 'flex';
}

function closeProjectModal() {
    document.getElementById('project-modal').style.display = 'none';
    currentEditId = null;
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
    const fileInput = document.getElementById('project-media-file');
    const mediaPath = document.getElementById('project-media-path').value;
    let imagePath = mediaPath;

    if (fileInput.files.length > 0) {
        showToast('Uploading media...', 'info');
        const formData = new FormData();
        formData.append('media', fileInput.files[0]);
        try {
            const uploadRes = await fetch('/api/admin/projects/upload', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
                imagePath = uploadData.path;
            } else {
                showToast(uploadData.message || 'Upload failed', 'error');
                return;
            }
        } catch (error) {
            showToast('Upload error', 'error');
            return;
        }
    }

    const payload = {
        name: document.getElementById('project-name').value,
        area: document.getElementById('project-area').value,
        square_meters: document.getElementById('project-square').value,
        category: document.getElementById('project-category').value,
        year: document.getElementById('project-year').value,
        style: document.getElementById('project-style').value,
        display_order: document.getElementById('project-order').value,
        image_path: imagePath,
        small_content: document.getElementById('project-content').value
    };

    try {
        const url = currentEditId ? `/api/admin/projects/${currentEditId}` : '/api/admin/projects';
        const method = currentEditId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            showToast(currentEditId ? 'Project updated!' : 'Project added!', 'success');
            closeProjectModal();
            removeMediaPreview();
            loadActiveProjects();
            loadInactiveProjects();
        } else {
            showToast(result.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error saving project', 'error');
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
