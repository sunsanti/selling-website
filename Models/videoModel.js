// F08: Video model — TikTok / YouTube external link cards
const pool = require('../config/database');

// Accept TikTok (www/vt/m subdomains) and YouTube (youtube.com + youtu.be)
const VIDEO_URL_RE = /^https?:\/\/((www\.|vt\.|m\.)?tiktok\.com\/|(www\.)?youtube\.com\/|youtu\.be\/)/i;

function validateVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.length === 0 || trimmed.length > 500) return false;
    return VIDEO_URL_RE.test(trimmed);
}

const UPDATABLE_FIELDS = ['title', 'thumbnail_path', 'tiktok_url', 'views_count', 'status'];

const getActive = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM videos WHERE status = 'active' ORDER BY id DESC"
    );
    return rows;
};

const getAll = async () => {
    const [rows] = await pool.query(
        'SELECT * FROM videos ORDER BY id DESC'
    );
    return rows;
};

const getById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM videos WHERE id = ?', [id]);
    return rows[0] || null;
};

// v3: featured videos (up to 6) for /main carousel
const getFeatured = async (limit = 6) => {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 6);
    const [rows] = await pool.query(
        "SELECT * FROM videos WHERE status = 'active' AND is_featured = 1 ORDER BY id DESC LIMIT ?",
        [lim]
    );
    return rows;
};

// v3: enforce max 6 featured videos atomically
const setFeaturedIds = async (ids) => {
    const sanitized = (Array.isArray(ids) ? ids : []).map(n => parseInt(n, 10)).filter(n => Number.isInteger(n) && n > 0).slice(0, 6);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('UPDATE videos SET is_featured = 0');
        if (sanitized.length > 0) {
            await conn.query(`UPDATE videos SET is_featured = 1 WHERE id IN (${sanitized.map(() => '?').join(',')})`, sanitized);
        }
        await conn.commit();
        return sanitized;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

const create = async ({ title, thumbnail_path, tiktok_url, views_count }) => {
    if (!title || String(title).trim().length === 0) {
        const err = new Error('Tiêu đề không được để trống');
        err.status = 400;
        throw err;
    }
    if (!validateVideoUrl(tiktok_url)) {
        const err = new Error('URL không hợp lệ — phải là TikTok (tiktok.com, vt.tiktok.com) hoặc YouTube (youtube.com, youtu.be)');
        err.status = 400;
        throw err;
    }
    const [r] = await pool.query(
        'INSERT INTO videos (title, thumbnail_path, tiktok_url, views_count) VALUES (?, ?, ?, ?)',
        [
            String(title).slice(0, 255),
            String(thumbnail_path || '').slice(0, 255),
            String(tiktok_url).trim().slice(0, 500),
            String(views_count || '0').slice(0, 20)
        ]
    );
    return r.insertId;
};

const update = async (id, fields) => {
    if (fields.tiktok_url !== undefined && !validateVideoUrl(fields.tiktok_url)) {
        const err = new Error('URL video không hợp lệ — cần TikTok hoặc YouTube');
        err.status = 400;
        throw err;
    }
    const keys = Object.keys(fields).filter(k => UPDATABLE_FIELDS.includes(k));
    if (keys.length === 0) return 0;
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => {
        const v = fields[k];
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

module.exports = { getActive, getAll, getById, getFeatured, setFeaturedIds, create, update, softDelete, hardDelete, validateVideoUrl };
