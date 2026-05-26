const aboutModel = require('../Models/aboutSectionModel');
const serviceModel = require('../Models/serviceModel');
const footerPersonModel = require('../Models/footerPersonModel');

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
        const { title, description, image_path } = req.body;
        const ok = await serviceModel.updateService(slot, { title, description, image_path });
        if (!ok) return res.status(400).json({ success: false, message: 'Không có thay đổi nào' });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateService:', err.message);
        const isValidation = err.message.startsWith('slot must');
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
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateFooterPerson:', err.message);
        const isValidation = err.message.startsWith('slot must');
        res.status(isValidation ? 400 : 500).json({ success: false, message: isValidation ? err.message : 'Lỗi server' });
    }
};

module.exports = {
    getAbout, updateAbout,
    getServices, getServiceBySlot, updateService,
    getFooterPersons, getFooterPersonBySlot, updateFooterPerson
};
