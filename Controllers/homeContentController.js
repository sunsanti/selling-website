const aboutModel = require('../Models/aboutSectionModel');
const serviceModel = require('../Models/serviceModel');
const footerPersonModel = require('../Models/footerPersonModel');
const teamMemberModel = require('../Models/teamMemberModel');
const auditLogModel = require('../Models/auditLogModel');

const URL_HTTPS_RE = /^https:\/\/[^\s<>"']+$/i;

// ============= ABOUT =============
const getAbout = async (req, res) => {
    try {
        const data = await aboutModel.getAbout();
        if (!data) return res.status(404).json({ success: false, message: 'About section chưa được seed' });
        res.json({ success: true, data });
    } catch (err) {
        console.error('getAbout:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateAbout = async (req, res) => {
    try {
        const { banner, paragraph_left, paragraph_right, stats } = req.body;
        await aboutModel.updateAbout({ banner, paragraph_left, paragraph_right, stats });
        auditLogModel.log({
            req, action: 'ABOUT_UPDATE', target_type: 'about_section', target_id: 1,
            details: { stats_count: Array.isArray(stats) ? stats.length : 0 }
        });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateAbout:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ============= SERVICES =============
const getServices = async (req, res) => {
    try {
        const data = await serviceModel.getServices();
        res.json({ success: true, data });
    } catch (err) {
        console.error('getServices:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getServiceBySlot = async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        const data = await serviceModel.getService(slot);
        if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy slot' });
        res.json({ success: true, data });
    } catch (err) {
        console.error('getServiceBySlot:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateService = async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        const { title, description, image_path, icon } = req.body;
        const ok = await serviceModel.updateService(slot, { title, description, image_path, icon });
        if (!ok) return res.status(400).json({ success: false, message: 'Không có thay đổi nào' });
        auditLogModel.log({
            req, action: 'SERVICE_UPDATE', target_type: 'service', target_id: slot,
            details: { fields: Object.keys(req.body || {}) }
        });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateService:', err.message);
        const isValidation = (err.status === 400) || err.message.startsWith('slot must');
        res.status(isValidation ? 400 : 500).json({ success: false, message: isValidation ? err.message : 'Lỗi server' });
    }
};

// ============= FOOTER PERSONS =============
const getFooterPersons = async (req, res) => {
    try {
        const data = await footerPersonModel.getFooterPersons();
        res.json({ success: true, data });
    } catch (err) {
        console.error('getFooterPersons:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getFooterPersonBySlot = async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        const data = await footerPersonModel.getFooterPerson(slot);
        if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy slot' });
        res.json({ success: true, data });
    } catch (err) {
        console.error('getFooterPersonBySlot:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateFooterPerson = async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        const { name, avatar_path, email, phone1, phone2, facebook_url } = req.body;

        if (facebook_url && !URL_HTTPS_RE.test(facebook_url)) {
            return res.status(400).json({ success: false, message: 'facebook_url phải bắt đầu bằng https://' });
        }

        const ok = await footerPersonModel.updateFooterPerson(slot, {
            name, avatar_path, email, phone1, phone2, facebook_url
        });
        if (!ok) return res.status(400).json({ success: false, message: 'Không có thay đổi nào' });
        auditLogModel.log({
            req, action: 'FOOTER_PERSON_UPDATE', target_type: 'footer_person', target_id: slot
        });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateFooterPerson:', err.message);
        const isValidation = err.message.startsWith('slot must');
        res.status(isValidation ? 400 : 500).json({ success: false, message: isValidation ? err.message : 'Lỗi server' });
    }
};

// ============= TEAM MEMBERS (v13) =============
const getTeamMembers = async (req, res) => {
    try {
        const data = await teamMemberModel.getAll();
        res.json({ success: true, data });
    } catch (err) {
        console.error('getTeamMembers:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
const updateTeamMember = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, role, avatar_path } = req.body;
        const ok = await teamMemberModel.updateById(id, { name, role, avatar_path });
        if (!ok) return res.status(400).json({ success: false, message: 'Không có thay đổi nào' });
        auditLogModel.log({
            req, action: 'TEAM_MEMBER_UPDATE', target_type: 'team_member', target_id: id,
            details: { fields: Object.keys(req.body || {}) }
        });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateTeamMember:', err.message);
        const isValidation = err.message.startsWith('id must');
        res.status(isValidation ? 400 : 500).json({ success: false, message: isValidation ? err.message : 'Lỗi server' });
    }
};

// v22: dynamic add/remove for Our Team members
const createTeamMember = async (req, res) => {
    try {
        const { name, role, avatar_path } = req.body;
        const id = await teamMemberModel.create({ name, role, avatar_path });
        auditLogModel.log({
            req, action: 'TEAM_MEMBER_CREATE', target_type: 'team_member', target_id: id,
            details: { name }
        });
        res.json({ success: true, message: 'Đã thêm thành viên', data: { id } });
    } catch (err) {
        console.error('createTeamMember:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
const deleteTeamMember = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const ok = await teamMemberModel.remove(id);
        if (!ok) return res.status(404).json({ success: false, message: 'Không tìm thấy thành viên' });
        auditLogModel.log({ req, action: 'TEAM_MEMBER_DELETE', target_type: 'team_member', target_id: id });
        res.json({ success: true, message: 'Đã xóa thành viên' });
    } catch (err) {
        console.error('deleteTeamMember:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getAbout, updateAbout,
    getServices, getServiceBySlot, updateService,
    getFooterPersons, getFooterPersonBySlot, updateFooterPerson,
    // v13 / v22
    getTeamMembers, updateTeamMember, createTeamMember, deleteTeamMember
};
