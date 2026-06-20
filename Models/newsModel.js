// F09: News model — articles with summary + plain-text content
const pool = require('../config/database');

const SUMMARY_CAP = 200;          // shorten for list endpoint
const TITLE_MAX = 255;
const SUMMARY_MAX = 500;

const UPDATABLE_FIELDS = ['title', 'summary', 'content', 'cover_image', 'status', 'external_url'];
const URL_RE = /^https?:\/\//i;

function truncate(s, n) {
    if (!s) return '';
    return s.length > n ? s.substr(0, n - 1) + '…' : s;
}

const getActive = async ({ limit = 12 } = {}) => {
    const lim = Math.min(parseInt(limit, 10) || 12, 500);
    const [rows] = await pool.query(
        "SELECT id, title, summary, cover_image, external_url, created_at FROM news WHERE status = 'active' ORDER BY created_at DESC LIMIT ?",
        [lim]
    );
    return rows.map(r => ({ ...r, summary: truncate(r.summary, SUMMARY_CAP) }));
};

const getActiveById = async (id) => {
    const [rows] = await pool.query("SELECT * FROM news WHERE id = ? AND status = 'active'", [id]);
    return rows[0] || null;
};

const getAll = async () => {
    const [rows] = await pool.query(
        'SELECT id, title, summary, cover_image, status, is_featured, created_at FROM news ORDER BY created_at DESC'
    );
    return rows;
};

const getById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [id]);
    return rows[0] || null;
};

const search = async ({ q, date_from, date_to } = {}) => {
    const conditions = [];
    const params = [];
    if (q) {
        conditions.push('title LIKE ?');
        params.push('%' + String(q).slice(0, 200) + '%');
    }
    if (date_from) {
        conditions.push('DATE(created_at) >= ?');
        params.push(String(date_from).slice(0, 10));
    }
    if (date_to) {
        conditions.push('DATE(created_at) <= ?');
        params.push(String(date_to).slice(0, 10));
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await pool.query(
        `SELECT id, title, status, is_featured, created_at FROM news ${where} ORDER BY created_at DESC LIMIT 500`,
        params
    );
    return rows;
};

const create = async ({ title, summary, content, cover_image, external_url }) => {
    const t = String(title || '').trim();
    if (!t) { const err = new Error('Tiêu đề bắt buộc'); err.status = 400; throw err; }
    if (t.length > TITLE_MAX) { const err = new Error(`Tiêu đề tối đa ${TITLE_MAX} ký tự`); err.status = 400; throw err; }
    const s = String(summary || '');
    if (s.length > SUMMARY_MAX) { const err = new Error(`Tóm tắt tối đa ${SUMMARY_MAX} ký tự`); err.status = 400; throw err; }
    const ext = String(external_url || '').trim().slice(0, 500);
    if (ext && !URL_RE.test(ext)) { const err = new Error('External URL phải bắt đầu bằng http(s)://'); err.status = 400; throw err; }
    const [r] = await pool.query(
        'INSERT INTO news (title, summary, content, cover_image, external_url) VALUES (?, ?, ?, ?, ?)',
        [t, s, String(content || ''), String(cover_image || '').slice(0, 255), ext]
    );
    return r.insertId;
};

const update = async (id, fields) => {
    if (fields.title !== undefined) {
        const t = String(fields.title || '').trim();
        if (!t) { const err = new Error('Tiêu đề bắt buộc'); err.status = 400; throw err; }
        if (t.length > TITLE_MAX) { const err = new Error(`Tiêu đề tối đa ${TITLE_MAX} ký tự`); err.status = 400; throw err; }
        fields.title = t;
    }
    if (fields.summary !== undefined && String(fields.summary).length > SUMMARY_MAX) {
        const err = new Error(`Tóm tắt tối đa ${SUMMARY_MAX} ký tự`); err.status = 400; throw err;
    }
    if (fields.external_url !== undefined) {
        const ext = String(fields.external_url || '').trim();
        if (ext && !URL_RE.test(ext)) { const err = new Error('External URL phải bắt đầu bằng http(s)://'); err.status = 400; throw err; }
        fields.external_url = ext.slice(0, 500);
    }
    const keys = Object.keys(fields).filter(k => UPDATABLE_FIELDS.includes(k));
    if (keys.length === 0) return 0;
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => {
        const v = fields[k];
        if (k === 'status') return (v === 'inactive' ? 'inactive' : 'active');
        if (k === 'cover_image') return String(v || '').slice(0, 255);
        return String(v == null ? '' : v);
    });
    params.push(id);
    const [r] = await pool.query(`UPDATE news SET ${sets} WHERE id = ?`, params);
    return r.affectedRows;
};

const softDelete = async (id) => {
    const [r] = await pool.query("UPDATE news SET status = 'inactive' WHERE id = ?", [id]);
    return r.affectedRows;
};

const hardDelete = async (id) => {
    const [r] = await pool.query('DELETE FROM news WHERE id = ?', [id]);
    return r.affectedRows;
};

module.exports = {
    getActive, getActiveById, getAll, getById, search,
    create, update, softDelete, hardDelete,
    SUMMARY_CAP, TITLE_MAX, SUMMARY_MAX
};
