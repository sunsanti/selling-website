// F08: Video model — TikTok external link cards
const pool = require('../config/database');

// Allow www, vt (short), m (mobile) subdomains; anchor + path required
const TIKTOK_RE = /^https?:\/\/(www\.|vt\.|m\.)?tiktok\.com\//i;

function validateTikTokUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.length === 0 || trimmed.length > 500) return false;
    return TIKTOK_RE.test(trimmed);
}

const UPDATABLE_FIELDS = ['title', 'thumbnail_path', 'tiktok_url', 'views_count', 'display_order', 'status'];

const getActive = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM videos WHERE status = 'active' ORDER BY display_order ASC, id DESC"
    );
    return rows;
};

const getAll = async () => {
    const [rows] = await pool.query(
        'SELECT * FROM videos ORDER BY display_order ASC, id DESC'
    );
    return rows;
};

const getById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM videos WHERE id = ?', [id]);
    return rows[0] || null;
};

const create = async ({ title, thumbnail_path, tiktok_url, views_count, display_order }) => {
    if (!title || String(title).trim().length === 0) {
        const err = new Error('Tiêu đề không được để trống');
        err.status = 400;
        throw err;
    }
    if (!validateTikTokUrl(tiktok_url)) {
        const err = new Error('TikTok URL không hợp lệ — phải bắt đầu bằng https://www.tiktok.com/ (hoặc vt./m.)');
        err.status = 400;
        throw err;
    }
    const [r] = await pool.query(
        'INSERT INTO videos (title, thumbnail_path, tiktok_url, views_count, display_order) VALUES (?, ?, ?, ?, ?)',
        [
            String(title).slice(0, 255),
            String(thumbnail_path || '').slice(0, 255),
            String(tiktok_url).trim().slice(0, 500),
            String(views_count || '0').slice(0, 20),
            parseInt(display_order, 10) || 0
        ]
    );
    return r.insertId;
};

const update = async (id, fields) => {
    if (fields.tiktok_url !== undefined && !validateTikTokUrl(fields.tiktok_url)) {
        const err = new Error('TikTok URL không hợp lệ');
        err.status = 400;
        throw err;
    }
    const keys = Object.keys(fields).filter(k => UPDATABLE_FIELDS.includes(k));
    if (keys.length === 0) return 0;
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => {
        const v = fields[k];
        if (k === 'display_order') return parseInt(v, 10) || 0;
        if (k === 'status') return (v === 'inactive' ? 'inactive' : 'active');
        return String(v || '').slice(0, k === 'tiktok_url' ? 500 : (k === 'title' || k === 'thumbnail_path' ? 255 : 20));
    });
    params.push(id);
    const [r] = await pool.query(`UPDATE videos SET ${sets} WHERE id = ?`, params);
    return r.affectedRows;
};

const softDelete = async (id) => {
    const [r] = await pool.query("UPDATE videos SET status = 'inactive' WHERE id = ?", [id]);
    return r.affectedRows;
};

const hardDelete = async (id) => {
    const [r] = await pool.query('DELETE FROM videos WHERE id = ?', [id]);
    return r.affectedRows;
};

module.exports = { getActive, getAll, getById, create, update, softDelete, hardDelete, validateTikTokUrl };
