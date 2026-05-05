const path = require('path');
const settingModel = require('../Models/settingModel');
const projectModel = require('../Models/projectModel');
const contactModel = require('../Models/contactModel');
const accountModel = require('../Models/accountModel');
const searchModel = require('../Models/searchModel');
const uploadService = require('../Services/uploadService');
const renumberService = require('../Services/renumberService');
const tableimagesModel = require('../Models/tableimagesModel');

// ===================== ADMIN PAGE =====================
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
        if (main_image !== undefined) {
            await settingModel.updateSetting('main_image', main_image.replace(/^\/images\//, ''));
        }
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
        // Normalize image_path with /images/ prefix
        projects.forEach(p => {
            if (p.image_path && !p.image_path.startsWith('/images/') && !p.image_path.startsWith('/uploads/')) {
                p.image_path = '/images/' + p.image_path;
            }
        });
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
        const images = await tableimagesModel.getImagesByProjectId(req.params.id);
        res.json({ success: true, data: { ...project, images } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const createProject = async (req, res) => {
    try {
        const { name, area, square_meters, category, year, style, small_content, image_path } = req.body;
        if (!name || !area) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }
        const cleanImagePath = (image_path || '').replace(/^\/images\//, '');
        const id = await projectModel.createProject({
            name, area, square_meters, category, year, style,
            small_content, image_path: cleanImagePath
        });
        res.json({ success: true, message: 'Thêm dự án thành công', id });
    } catch (error) {
        const message = error.message.includes('Maximum') ? error.message : 'Lỗi server';
        res.status(400).json({ success: false, message });
    }
};

const updateProject = async (req, res) => {
    try {
        const { name, area, square_meters, category, year, style, small_content, image_path, display_order } = req.body;

        // Build fields to update (only defined values)
        const fields = {};
        if (name !== undefined) fields.name = name;
        if (area !== undefined) fields.area = area;
        if (square_meters !== undefined) fields.square_meters = square_meters;
        if (category !== undefined) fields.category = category;
        if (year !== undefined) fields.year = year;
        if (style !== undefined) fields.style = style;
        if (small_content !== undefined) fields.small_content = small_content;
        if (image_path !== undefined) {
            fields.image_path = image_path.replace(/^\/images\//, '');
        }
        if (display_order !== undefined) fields.display_order = display_order;

        const success = await projectModel.updateProjectFields(req.params.id, fields);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        console.error('updateProject error:', error);
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

const deleteProject = async (req, res) => {
    try {
        const success = await projectModel.deleteProject(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
        }
        // Renumber display_order after deletion
        await renumberService.renumberProjectDisplayOrder();
        res.json({ success: true, message: 'Đã xóa vĩnh viễn dự án' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ===================== PROJECT SEARCH =====================
const searchProjects = async (req, res) => {
    try {
        const { keyword, status } = req.query;
        const projects = await searchModel.searchProjects(keyword || '', status || 'active');
        // Normalize image_path with /images/ prefix
        projects.forEach(p => {
            if (p.image_path && !p.image_path.startsWith('/images/') && !p.image_path.startsWith('/uploads/')) {
                p.image_path = '/images/' + p.image_path;
            }
        });
        res.json({ success: true, data: projects });
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

const deleteContact = async (req, res) => {
    try {
        const success = await contactModel.deleteContact(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy liên hệ' });
        }
        // Renumber IDs after deletion
        await renumberService.renumberContactIds();
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

// ===================== PROJECT IMAGES (tableimages) =====================
const getProjectImages = async (req, res) => {
    try {
        const images = await tableimagesModel.getImagesByProjectId(req.params.projectId);
        res.json({ success: true, data: images });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getAllProjectImages = async (req, res) => {
    try {
        const images = await tableimagesModel.getAllImages();
        res.json({ success: true, data: images });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const addProjectImage = async (req, res) => {
    try {
        const { project_id, image_path, display_order } = req.body;
        if (!project_id || !image_path) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }
        const id = await tableimagesModel.createImage({ project_id, image_path, display_order });
        res.json({ success: true, message: 'Thêm ảnh thành công', id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateProjectImage = async (req, res) => {
    try {
        const { image_path, display_order } = req.body;
        const success = await tableimagesModel.updateImage(req.params.id, { image_path, display_order });
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
        }
        res.json({ success: true, message: 'Cập nhật ảnh thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const deleteProjectImage = async (req, res) => {
    try {
        const success = await tableimagesModel.deleteImage(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
        }
        res.json({ success: true, message: 'Xóa ảnh thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ===================== UPLOAD =====================
const handleUpload = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, path: fileUrl });
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
    deleteProject,
    searchProjects,
    getContacts,
    searchContacts,
    deleteContact,
    getAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getProjectImages,
    getAllProjectImages,
    addProjectImage,
    updateProjectImage,
    deleteProjectImage,
    handleUpload,
    uploadMiddleware: uploadService.upload
};
