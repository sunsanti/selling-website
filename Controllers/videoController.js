// F08: Video controller
const videoModel = require('../Models/videoModel');
const auditLogModel = require('../Models/auditLogModel');

const getPublic = async (req, res) => {
    try {
        const list = await videoModel.getActive();
        res.json({ success: true, data: list });
    } catch (err) {
        console.error('getPublic videos:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getAll = async (req, res) => {
    try {
        const list = await videoModel.getAll();
        res.json({ success: true, data: list });
    } catch (err) {
        console.error('getAll videos:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// v3: featured videos (up to 4) for /main carousel
const getFeatured = async (req, res) => {
    try {
        const list = await videoModel.getFeatured(4);
        res.json({ success: true, data: list });
    } catch (err) {
        console.error('getFeatured videos:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// v3: replace featured selection (max 4)
const setFeatured = async (req, res) => {
    try {
        const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
        if (ids.length > 4) {
            return res.status(400).json({ success: false, message: 'Tối đa 4 videos featured' });
        }
        const applied = await videoModel.setFeaturedIds(ids);
        auditLogModel.log({
            req, action: 'VIDEO_FEATURED_SET', target_type: 'video',
            details: { ids: applied }
        });
        res.json({ success: true, message: 'Đã cập nhật featured videos', ids: applied });
    } catch (err) {
        console.error('setFeatured videos:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        const v = await videoModel.getById(id);
        if (!v) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
        res.json({ success: true, data: v });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const create = async (req, res) => {
    try {
        const id = await videoModel.create(req.body);
        auditLogModel.log({
            req, action: 'VIDEO_CREATE', target_type: 'video', target_id: id,
            details: { title: req.body.title, tiktok_url: req.body.tiktok_url }
        });
        res.json({ success: true, id, message: 'Thêm video thành công' });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi server' });
    }
};

const update = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        const affected = await videoModel.update(id, req.body);
        const fields = Object.keys(req.body);
        auditLogModel.log({
            req, action: 'VIDEO_UPDATE', target_type: 'video', target_id: id,
            details: { fields }
        });
        res.json({ success: true, affected, message: 'Cập nhật thành công' });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi server' });
    }
};

const softDelete = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        await videoModel.softDelete(id);
        auditLogModel.log({ req, action: 'VIDEO_SOFTDELETE', target_type: 'video', target_id: id });
        res.json({ success: true, message: 'Đã ẩn video' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const hardDelete = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        await videoModel.hardDelete(id);
        auditLogModel.log({ req, action: 'VIDEO_DELETE', target_type: 'video', target_id: id });
        res.json({ success: true, message: 'Đã xóa video' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getPublic, getAll, getById, getFeatured, setFeatured, create, update, softDelete, hardDelete };
