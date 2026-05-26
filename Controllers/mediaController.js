const fs = require('fs').promises;
const path = require('path');
const { MEDIA_LIST_LIMIT } = require('../config/constants');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const getMedia = async (req, res) => {
    try {
        const entries = await fs.readdir(UPLOADS_DIR);
        const stats = await Promise.all(entries.map(async name => {
            try {
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

module.exports = { getMedia };
