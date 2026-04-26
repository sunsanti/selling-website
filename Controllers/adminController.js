const path = require('path');
const settingModel = require('../Models/settingModel');
const projectModel = require('../Models/projectModel');
const contactModel = require('../Models/contactModel');
const accountModel = require('../Models/accountModel');
const searchModel = require('../Models/searchModel');

const getAdminPage = (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '../Views/admin/index.html'));
};

// ===================== SETTINGS =====================
const getSettings = async (req, res) => {
    try {
        const settings = await settingModel.getAllSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { logo, phone, main_image } = req.body;
        if (logo !== undefined) await settingModel.updateSetting('logo', logo);
        if (phone !== undefined) await settingModel.updateSetting('phone', phone);
        if (main_image !== undefined) await settingModel.updateSetting('main_image', main_image);
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ===================== PROJECTS =====================
const getProjects = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const projects = includeInactive
            ? await projectModel.getAllProjects(true)
            : await projectModel.getAllProjects();
        res.json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getInactiveProjects = async (req, res) => {
    try {
        const projects = await projectModel.getInactiveProjects();
        res.json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getProjectById = async (req, res) => {
    try {
        const project = await projectModel.getProjectById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        res.json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const createProject = async (req, res) => {
    try {
        const { name, area, square_meters, category, year, style, small_content, image_path, display_order } = req.body;
        if (!name || !area) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }
        const id = await projectModel.createProject({
            name, area, square_meters, category, year, style,
            small_content, image_path, display_order
        });
        res.json({ success: true, message: 'Thêm dự án thành công', id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateProject = async (req, res) => {
    try {
        const { name, area, square_meters, category, year, style, small_content, image_path, display_order } = req.body;
        const success = await projectModel.updateProject(req.params.id, {
            name, area, square_meters, category, year, style,
            small_content, image_path, display_order
        });
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const softDeleteProject = async (req, res) => {
    try {
        const success = await projectModel.softDeleteProject(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        res.json({ success: true, message: 'Đã ngừng kinh doanh dự án' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const restoreProject = async (req, res) => {
    try {
        const success = await projectModel.restoreProject(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        res.json({ success: true, message: 'Đã khôi phục dự án' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ===================== CONTACTS =====================
const getContacts = async (req, res) => {
    try {
        const contacts = await contactModel.getAllContacts();
        res.json({ success: true, data: contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const searchContacts = async (req, res) => {
    try {
        const { keyword } = req.query;
        const contacts = await searchModel.searchContacts(keyword || '');
        res.json({ success: true, data: contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ===================== PROJECT SEARCH =====================
const searchProjects = async (req, res) => {
    try {
        const { keyword } = req.query;
        const { status } = req.query; // active, inactive, all
        let projects = await searchModel.searchProjects(keyword || '');

        if (status === 'active') {
            projects = projects.filter(p => p.status === 'active');
        } else if (status === 'inactive') {
            projects = projects.filter(p => p.status === 'inactive');
        }

        res.json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const deleteContact = async (req, res) => {
    try {
        const success = await contactModel.deleteContact(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ' });
        }
        res.json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ===================== ACCOUNTS =====================
const getAccounts = async (req, res) => {
    try {
        const accounts = await accountModel.getAllAccounts();
        res.json({ success: true, data: accounts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const createAccount = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }
        const existing = await accountModel.getAccountByUsername(username);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
        }
        const id = await accountModel.createAccount(username, password);
        res.json({ success: true, message: 'Thêm tài khoản thành công', id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateAccount = async (req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await accountModel.getAccountById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }
        if (username && username !== existing.username) {
            const other = await accountModel.getAccountByUsername(username);
            if (other) {
                return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
            }
        }
        const success = await accountModel.updateAccount(req.params.id, username, password);
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const success = await accountModel.deleteAccount(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }
        res.json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getAdminPage,
    getSettings,
    updateSettings,
    getProjects,
    getInactiveProjects,
    getProjectById,
    createProject,
    updateProject,
    softDeleteProject,
    restoreProject,
    getContacts,
    searchContacts,
    deleteContact,
    searchProjects,
    getAccounts,
    createAccount,
    updateAccount,
    deleteAccount
};
