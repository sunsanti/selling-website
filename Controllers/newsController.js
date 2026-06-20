// F09: News controller
const newsModel = require('../Models/newsModel');
const auditLogModel = require('../Models/auditLogModel');

const getPublic = async (req, res) => {
    try {
        const list = await newsModel.getActive({ limit: req.query.limit });
        res.json({ success: true, data: list });
    } catch (err) {
        console.error('news getPublic:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getPublicById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        const n = await newsModel.getActiveById(id);
        if (!n) return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
        res.json({ success: true, data: n });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getAll = async (req, res) => {
    try {
        const { q, date_from, date_to } = req.query;
        const list = (q || date_from || date_to)
            ? await newsModel.search({ q, date_from, date_to })
            : await newsModel.getAll();
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        const n = await newsModel.getById(id);
        if (!n) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true, data: n });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const create = async (req, res) => {
    try {
        const id = await newsModel.create(req.body);
        auditLogModel.log({
            req, action: 'NEWS_CREATE', target_type: 'news', target_id: id,
            details: { title: req.body.title }
        });
        res.json({ success: true, id, message: 'Tạo tin tức thành công' });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi server' });
    }
};

const update = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        const affected = await newsModel.update(id, req.body);
        auditLogModel.log({
            req, action: 'NEWS_UPDATE', target_type: 'news', target_id: id,
            details: { fields: Object.keys(req.body) }
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
        await newsModel.softDelete(id);
        auditLogModel.log({ req, action: 'NEWS_SOFTDELETE', target_type: 'news', target_id: id });
        res.json({ success: true, message: 'Đã ẩn tin tức' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const hardDelete = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        await newsModel.hardDelete(id);
        auditLogModel.log({ req, action: 'NEWS_DELETE', target_type: 'news', target_id: id });
        res.json({ success: true, message: 'Đã xóa tin tức' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getPublic, getPublicById, getAll, getById, create, update, softDelete, hardDelete };
