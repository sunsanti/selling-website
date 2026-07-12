const fs = require('fs').promises;
const path = require('path');
const { MEDIA_LIST_LIMIT } = require('../config/constants');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Files in /uploads that are system assets — never shown in the media library
// and cannot be deleted via the delete API.
const PROTECTED_FILES = new Set(['fillinfo.jpg']);

const getMedia = async (req, res) => {
    try {
        const entries = await fs.readdir(UPLOADS_DIR);
        const stats = await Promise.all(entries.map(async name => {
            try {
                if (PROTECTED_FILES.has(name)) return null;
                const st = await fs.stat(path.join(UPLOADS_DIR, name));
                if (!st.isFile()) return null;
                return {
                    url: '/uploads/' + name,
                    name,
                    size: st.size,
                    mtime: st.mtimeMs
                };
            } catch {
                return null;
            }
        }));
        const files = stats
            .filter(Boolean)
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, MEDIA_LIST_LIMIT);
        res.json({ success: true, data: files });
    } catch (err) {
        console.error('getMedia:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const deleteMedia = async (req, res) => {
    try {
        const { names } = req.body;
        if (!Array.isArray(names) || names.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có file nào được chỉ định' });
        }
        if (names.length > 200) {
            return res.status(400).json({ success: false, message: 'Không thể xóa quá 200 file một lần' });
        }
        const deleted = [];
        const errors = [];
        for (const name of names) {
            if (!name || typeof name !== 'string' || name.includes('/') || name.includes('\\') || name.includes('..')) {
                errors.push({ name, reason: 'Tên file không hợp lệ' });
                continue;
            }
            if (PROTECTED_FILES.has(name)) {
                errors.push({ name, reason: 'File hệ thống, không thể xóa' });
                continue;
            }
            try {
                await fs.unlink(path.join(UPLOADS_DIR, name));
                deleted.push(name);
            } catch (err) {
                errors.push({ name, reason: err.message });
            }
        }
        if (deleted.length === 0 && errors.length > 0) {
            return res.status(422).json({ success: false, deleted, errors });
        }
        res.json({ success: true, deleted, errors });
    } catch (err) {
        console.error('deleteMedia:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getMedia, deleteMedia };
