// ===================== STATE =====================
let currentProjectFilter = 'active';
let currentProjectKeyword = '';
let currentEditId = null;
let currentAccountEditId = null;
let projectSearchTimeout = null;

// ===================== INIT =====================
let contactSearchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    setupNavigation();
    setupForms();
    setupProjectFilter();

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
function setupProjectFilter() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentProjectFilter = btn.dataset.filter;
            if (currentProjectKeyword) {
                searchProjects();
            } else {
                loadProjects();
            }
        });
    });

    // Realtime search with debounce
    document.getElementById('project-search').addEventListener('input', (e) => {
        clearTimeout(projectSearchTimeout);
        projectSearchTimeout = setTimeout(() => {
            currentProjectKeyword = e.target.value.trim();
            if (currentProjectKeyword) {
                searchProjects();
            } else {
                loadProjects();
            }
        }, 400);
    });

    // Enter key search
    document.getElementById('project-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(projectSearchTimeout);
            currentProjectKeyword = e.target.value.trim();
            if (currentProjectKeyword) {
                searchProjects();
            } else {
                loadProjects();
            }
        }
    });
}

async function loadProjects() {
    try {
        const res = await fetch(`/api/admin/projects/search?keyword=&status=${currentProjectFilter}`);
        const data = await res.json();
        if (!data.success) return;
        renderProjectsTable(data.data);
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function searchProjects() {
    try {
        const res = await fetch(
            `/api/admin/projects/search?keyword=${encodeURIComponent(currentProjectKeyword)}&status=${currentProjectFilter}`
        );
        const data = await res.json();
        if (!data.success) return;
        renderProjectsTable(data.data);
    } catch (error) {
        console.error('Error searching projects:', error);
    }
}

function resetProjectSearch() {
    document.getElementById('project-search').value = '';
    currentProjectKeyword = '';
    loadProjects();
}

function renderProjectsTable(projects) {
    const tbody = document.getElementById('projects-tbody');
    if (!projects || projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:#95a5a6;">No projects found</td></tr>';
        return;
    }

    tbody.innerHTML = projects.map(p => `
        <tr>
            <td>${p.id}</td>
            <td><img src="${p.image_path || 'images/placeholder.jpg'}" alt="" onerror="this.src='https://via.placeholder.com/60x40?text=No+Image'"></td>
            <td>${escapeHtml(p.name)}</td>
            <td><span class="status-badge status-${p.area}">${capitalize(p.area)}</span></td>
            <td>${p.square_meters || '-'}</td>
            <td>${escapeHtml(p.category || '-')}</td>
            <td>${p.year || '-'}</td>
            <td>${escapeHtml(p.style || '-')}</td>
            <td><span class="status-badge ${p.status === 'active' ? 'status-active' : 'status-inactive'}">${p.status === 'active' ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-btns">
                    ${p.status === 'inactive'
                        ? `<button class="action-btn restore" onclick="restoreProject(${p.id})" title="Restore"><i class="fas fa-undo"></i></button>`
                        : `<button class="action-btn edit" onclick="editProject(${p.id})" title="Edit"><i class="fas fa-edit"></i></button>
                           <button class="action-btn delete" onclick="confirmAction('Stop this project?', () => softDeleteProject(${p.id}))" title="Stop"><i class="fas fa-ban"></i></button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

async function editProject(id) {
    try {
        const res = await fetch(`/api/admin/projects/${id}`);
        const data = await res.json();
        if (!data.success) {
            showToast('Project not found', 'error');
            return;
        }
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
        document.getElementById('project-image').value = p.image_path || '';
        document.getElementById('project-content').value = p.small_content || '';
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
            showToast('Project stopped successfully', 'success');
            loadProjects();
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
            showToast('Project restored successfully', 'success');
            loadProjects();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error restoring project', 'error');
    }
}

document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('project-name').value,
        area: document.getElementById('project-area').value,
        square_meters: document.getElementById('project-square').value,
        category: document.getElementById('project-category').value,
        year: document.getElementById('project-year').value,
        style: document.getElementById('project-style').value,
        display_order: document.getElementById('project-order').value,
        image_path: document.getElementById('project-image').value,
        small_content: document.getElementById('project-content').value
    };

    try {
        const url = currentEditId ? `/api/admin/projects/${currentEditId}` : '/api/admin/projects';
        const method = currentEditId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            showToast(currentEditId ? 'Project updated!' : 'Project added!', 'success');
            closeProjectModal();
            loadProjects();
        } else {
            showToast(result.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error saving project', 'error');
    }
});

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
