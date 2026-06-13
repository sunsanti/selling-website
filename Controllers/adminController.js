const path = require('path');
const settingModel = require('../Models/settingModel');
const projectModel = require('../Models/projectModel');
const contactModel = require('../Models/contactModel');
const accountModel = require('../Models/accountModel');
const searchModel = require('../Models/searchModel');
const uploadService = require('../Services/uploadService');
const renumberService = require('../Services/renumberService');
const tableimagesModel = require('../Models/tableimagesModel');
const translateService = require('../Services/translateService');
const auditLogModel = require('../Models/auditLogModel');

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
        auditLogModel.log({
            req,
            action: 'SETTINGS_UPDATE',
            target_type: 'settings',
            details: { fields: Object.keys(req.body) }
        });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ===================== PROJECTS =====================
const getProjects = async (req, res) => {
    try {
        const { state, suburb, type, price, area, includeInactive } = req.query;
        // F05a: if any filter present, use whitelist-based searchProjects
        if (state || suburb || type || price || area) {
            const projects = await projectModel.searchProjects({ state, suburb, type, price, area });
            return res.json({ success: true, data: projects });
        }
        const useInactive = includeInactive === 'true';
        const projects = useInactive
            ? await projectModel.getAllProjects(true)
            : await projectModel.getAllProjects();
        projects.forEach(p => {
            if (p.image_path && !p.image_path.startsWith('/images/') && !p.image_path.startsWith('/uploads/')) {
                p.image_path = '/images/' + p.image_path;
            }
        });
        res.json({ success: true, data: projects });
    } catch (error) {
        console.error('Lỗi getProjects:', error.message);
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
        auditLogModel.log({
            req, action: 'PROJECT_CREATE', target_type: 'project', target_id: id,
            details: { name, area }
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
        auditLogModel.log({
            req, action: 'PROJECT_UPDATE', target_type: 'project', target_id: parseInt(req.params.id, 10),
            details: { fields: Object.keys(fields) }
        });
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
        auditLogModel.log({
            req, action: 'PROJECT_SOFTDELETE', target_type: 'project', target_id: parseInt(req.params.id, 10)
        });
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
        auditLogModel.log({
            req, action: 'PROJECT_RESTORE', target_type: 'project', target_id: parseInt(req.params.id, 10)
        });
        res.json({ success: true, message: 'Đã khôi phục dự án' });
    } catch (error) {
        const message = error.message.includes('Maximum') ? error.message : 'Lỗi server';
        res.status(message === 'Lỗi server' ? 500 : 400).json({ success: false, message });
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
        auditLogModel.log({
            req, action: 'PROJECT_DELETE', target_type: 'project', target_id: parseInt(req.params.id, 10)
        });
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
        auditLogModel.log({
            req, action: 'CONTACT_DELETE', target_type: 'contact', target_id: parseInt(req.params.id, 10)
        });
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
        const { username, password, name, role } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }
        const existing = await accountModel.getAccountByUsername(username);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
        }
        const id = await accountModel.createAccount(username, password, name, role || 'employee');
        auditLogModel.log({
            req, action: 'ACCOUNT_CREATE', target_type: 'account', target_id: id,
            details: { username, role: role || 'employee' }
        });
        res.json({ success: true, message: 'Thêm tài khoản thành công', id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateAccount = async (req, res) => {
    try {
        const { username, password, name, role } = req.body;
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
        const success = await accountModel.updateAccount(req.params.id, username, password, name, role);
        // If updating own account, update session
        if (req.session.user && req.session.user.id == req.params.id) {
            req.session.user.name = name || req.session.user.name;
            req.session.user.role = role || req.session.user.role;
            req.session.user.username = username || req.session.user.username;
        }
        const changed = [];
        if (username) changed.push('username');
        if (password) changed.push('password');
        if (name) changed.push('name');
        if (role) changed.push('role');
        auditLogModel.log({
            req, action: 'ACCOUNT_UPDATE', target_type: 'account', target_id: parseInt(req.params.id, 10),
            details: { fields: changed }
        });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const targetId = parseInt(req.params.id, 10);
        const sessionId = req.session.user ? parseInt(req.session.user.id, 10) : null;
        if (sessionId !== null && targetId === sessionId) {
            return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản đang đăng nhập' });
        }
        const success = await accountModel.deleteAccount(targetId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }
        auditLogModel.log({
            req, action: 'ACCOUNT_DELETE', target_type: 'account', target_id: targetId
        });
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

// ===================== TRANSLATION =====================
const translateText = async (req, res) => {
    try {
        const { text, targetLang, sourceLang } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, message: 'Text is required' });
        }
        if (!targetLang) {
            return res.status(400).json({ success: false, message: 'Target language is required' });
        }

        const result = await translateService.translateText(text, targetLang, sourceLang || 'auto');

        if (result.success) {
            res.json({
                success: true,
                original: result.original,
                translated: result.translated,
                detectedSource: result.detectedSource || null
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Translation failed',
                original: text
            });
        }
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ success: false, message: 'Server error during translation' });
    }
};

const detectTextLanguage = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, message: 'Text is required' });
        }

        const result = await translateService.detectLanguage(text);

        if (result.success) {
            res.json({
                success: true,
                language: result.language,
                confidence: result.confidence
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error || 'Language detection failed'
            });
        }
    } catch (error) {
        console.error('Language detection error:', error);
        res.status(500).json({ success: false, message: 'Server error during detection' });
    }
};

module.exports = {
    getAdminPage,
    getSettings,
    updateSettings,
    getProjects,
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
    uploadMiddleware: uploadService.upload,
    translateText,
    detectTextLanguage
};
