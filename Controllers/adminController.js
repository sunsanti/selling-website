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
        const {
            logo, phone, main_image, purpose_video_url, purpose_video_thumbnail,
            // v11: footer dynamic content
            footer_desc, footer_address, footer_copyright,
            footer_facebook_url, footer_linkedin_url, footer_youtube_url, footer_tiktok_url,
            // v12 — /about page content
            about_hero_tag, about_hero_title, about_mission,
            // v16 — /about Offices (dynamic list, JSON array of {name, flag, address, phone, email})
            about_offices,
            // v13 — /about Our Services (3 cards × icon/title/desc)
            about_service_1_icon, about_service_1_title, about_service_1_desc,
            about_service_2_icon, about_service_2_title, about_service_2_desc,
            about_service_3_icon, about_service_3_title, about_service_3_desc,
            // v14 — /main "Why Invest in Australia" (Purpose-Invest) section content
            purpose_tagline, purpose_heading,
            purpose_list_1, purpose_list_2, purpose_list_3, purpose_list_4,
            purpose_cta_text, purpose_video_caption
        } = req.body;
        if (logo !== undefined) await settingModel.updateSetting('logo', logo);
        if (phone !== undefined) await settingModel.updateSetting('phone', phone);
        if (main_image !== undefined) {
            // F10.fix: store path as-is; Media Library always returns /uploads/<file>
            await settingModel.updateSetting('main_image', String(main_image).slice(0, 500));
        }
        // F06: Purpose-Invest video — thumbnail (image path) + url (mp4)
        if (purpose_video_thumbnail !== undefined) {
            const thumb = String(purpose_video_thumbnail).slice(0, 500);
            await settingModel.updateSetting('purpose_video_thumbnail', thumb);
        }
        if (purpose_video_url !== undefined) {
            const url = String(purpose_video_url).slice(0, 500);
            // Allow empty (clear), relative /uploads/..., or http(s)
            if (url === '' || /^(\/uploads\/|https?:\/\/)/i.test(url)) {
                await settingModel.updateSetting('purpose_video_url', url);
            } else {
                return res.status(400).json({ success: false, message: 'Video URL phải bắt đầu bằng /uploads/ hoặc https://' });
            }
        }

        // v11: Footer dynamic content
        const setFooterText = async (key, val, max = 1000) => {
            if (val === undefined) return;
            await settingModel.updateSetting(key, String(val).slice(0, max));
        };
        const setFooterUrl = async (key, val) => {
            if (val === undefined) return;
            const url = String(val).trim();
            if (url === '' || /^https?:\/\//i.test(url)) {
                await settingModel.updateSetting(key, url.slice(0, 500));
            } else {
                throw Object.assign(new Error(`${key} phải bắt đầu bằng http(s)://`), { status: 400 });
            }
        };
        try {
            await setFooterText('footer_desc', footer_desc, 2000);
            await setFooterText('footer_address', footer_address, 500);
            await setFooterText('footer_copyright', footer_copyright, 500);
            await setFooterUrl('footer_facebook_url', footer_facebook_url);
            await setFooterUrl('footer_linkedin_url', footer_linkedin_url);
            await setFooterUrl('footer_youtube_url', footer_youtube_url);
            await setFooterUrl('footer_tiktok_url', footer_tiktok_url);
            // v12 /about content
            await setFooterText('about_hero_tag', about_hero_tag, 100);
            await setFooterText('about_hero_title', about_hero_title, 200);
            await setFooterText('about_mission', about_mission, 2000);
            // v16 — /about Offices (dynamic list, replaces fixed Sydney/HCM fields)
            if (about_offices !== undefined) {
                let list = about_offices;
                if (typeof list === 'string') {
                    try { list = JSON.parse(list); } catch (_) { list = []; }
                }
                if (!Array.isArray(list)) list = [];
                const clean = list.slice(0, 12).map(o => ({
                    name:    String((o && o.name)    || '').slice(0, 100),
                    flag:    String((o && o.flag)    || '').slice(0, 10),
                    address: String((o && o.address) || '').slice(0, 300),
                    phone:   String((o && o.phone)   || '').slice(0, 50),
                    email:   String((o && o.email)   || '').slice(0, 255)
                }));
                await settingModel.updateSetting('about_offices', JSON.stringify(clean));
            }
            // v13 — /about Our Services (3 cards × 3 fields)
            const svc = {
                1: { icon: about_service_1_icon, title: about_service_1_title, desc: about_service_1_desc },
                2: { icon: about_service_2_icon, title: about_service_2_title, desc: about_service_2_desc },
                3: { icon: about_service_3_icon, title: about_service_3_title, desc: about_service_3_desc }
            };
            for (const i of [1, 2, 3]) {
                await setFooterText(`about_service_${i}_icon`,  svc[i].icon,  60);
                await setFooterText(`about_service_${i}_title`, svc[i].title, 200);
                await setFooterText(`about_service_${i}_desc`,  svc[i].desc,  1000);
            }
            // v14 — /main "Why Invest in Australia" (Purpose-Invest) section content
            await setFooterText('purpose_tagline', purpose_tagline, 100);
            await setFooterText('purpose_heading', purpose_heading, 300);
            await setFooterText('purpose_list_1', purpose_list_1, 200);
            await setFooterText('purpose_list_2', purpose_list_2, 200);
            await setFooterText('purpose_list_3', purpose_list_3, 200);
            await setFooterText('purpose_list_4', purpose_list_4, 200);
            await setFooterText('purpose_cta_text', purpose_cta_text, 100);
            await setFooterText('purpose_video_caption', purpose_video_caption, 300);
        } catch (e) {
            if (e.status === 400) return res.status(400).json({ success: false, message: e.message });
            throw e;
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
// v2: featured projects (up to 4) — used by /main carousel
const getFeaturedProjects = async (req, res) => {
    try {
        const list = await projectModel.getFeaturedProjects(4);
        res.json({ success: true, data: list });
    } catch (err) {
        console.error('getFeaturedProjects:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// v2: replace featured selection (max 4)
const setFeaturedProjects = async (req, res) => {
    try {
        const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
        if (ids.length > 4) {
            return res.status(400).json({ success: false, message: 'Tối đa 4 projects featured' });
        }
        const applied = await projectModel.setFeaturedIds(ids);
        auditLogModel.log({
            req, action: 'PROJECT_FEATURED_SET', target_type: 'project',
            details: { ids: applied }
        });
        res.json({ success: true, message: 'Đã cập nhật featured projects', ids: applied });
    } catch (err) {
        console.error('setFeaturedProjects:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getProjects = async (req, res) => {
    try {
        const { state, type, price, area, includeInactive } = req.query;
        // F05a: if any filter present, use whitelist-based searchProjects
        if (state || type || price || area) {
            const projects = await projectModel.searchProjects({ state, type, price, area });
            return res.json({ success: true, data: projects });
        }
        const useInactive = includeInactive === 'true';
        const projects = useInactive
            ? await projectModel.getAllProjects(true)
            : await projectModel.getAllProjects();
        // F10.fix: projectModel already normalizes image_path to /uploads/ — no extra prefix work here
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
        const {
            name, area, square_meters, category, year, style, small_content, image_path,
            // F05d extended fields
            price, beds, baths, cars, address, state, property_type, area_label
        } = req.body;
        if (!name || !area) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }
        // F10.fix: store image_path verbatim (Media Library returns /uploads/<file>)
        const id = await projectModel.createProject({
            name, area, square_meters, category, year, style,
            small_content, image_path: image_path || '',
            // F05d
            price: price ? String(price).slice(0, 50) : null,
            beds: beds ? String(beds).slice(0, 20) : null,
            baths: baths ? String(baths).slice(0, 20) : null,
            cars: cars ? String(cars).slice(0, 20) : null,
            address: address ? String(address).slice(0, 255) : null,
            state: state ? String(state).toUpperCase().slice(0, 20) : null,
            property_type: property_type ? String(property_type).toLowerCase().slice(0, 50) : null,
            area_label: area_label ? String(area_label).slice(0, 100) : null
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
        const {
            name, area, square_meters, category, year, style, small_content, image_path, display_order,
            // F05d extended fields
            price, beds, baths, cars, address, state, property_type, area_label
        } = req.body;

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
            // F10.fix: store image_path verbatim under /uploads/
            fields.image_path = String(image_path || '').slice(0, 255);
        }
        if (display_order !== undefined) fields.display_order = display_order;
        // F05d extended
        if (price !== undefined) fields.price = String(price).slice(0, 50);
        if (beds !== undefined) fields.beds = String(beds).slice(0, 20);
        if (baths !== undefined) fields.baths = String(baths).slice(0, 20);
        if (cars !== undefined) fields.cars = String(cars).slice(0, 20);
        if (address !== undefined) fields.address = String(address).slice(0, 255);
        if (state !== undefined) fields.state = String(state).toUpperCase().slice(0, 20);
        if (property_type !== undefined) fields.property_type = String(property_type).toLowerCase().slice(0, 50);
        if (area_label !== undefined) fields.area_label = String(area_label).slice(0, 100);

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
        // F10.fix: searchModel already normalizes image_path to /uploads/
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
    // v2
    getFeaturedProjects,
    setFeaturedProjects,
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
