const pool = require('../config/database');
const { HOME_SERVICES_COUNT } = require('../config/constants');

// v2: icon column (FA class) replaces visual image picker
const ICON_RE = /^fa-[a-z0-9-]{2,40}$/i;

const getServices = async () => {
    const [rows] = await pool.query(
        'SELECT slot, title, description, image_path, icon FROM services ORDER BY slot ASC'
    );
    return rows;
};

const getService = async (slot) => {
    const [rows] = await pool.query(
        'SELECT slot, title, description, image_path, icon FROM services WHERE slot = ?',
        [slot]
    );
    return rows[0] || null;
};

const updateService = async (slot, { title, description, image_path, icon }) => {
    if (!Number.isInteger(slot) || slot < 1 || slot > HOME_SERVICES_COUNT) {
        throw new Error(`slot must be 1..${HOME_SERVICES_COUNT}`);
    }
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title || ''); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description || ''); }
    if (image_path !== undefined && image_path !== null && image_path !== '') {
        fields.push('image_path = ?');
        values.push(image_path);
    }
    if (icon !== undefined) {
        const cleaned = String(icon || '').trim();
        if (cleaned && !ICON_RE.test(cleaned)) {
            const err = new Error('Icon không hợp lệ (format: fa-xxx)');
            err.status = 400;
            throw err;
        }
        fields.push('icon = ?');
        values.push(cleaned);
    }
    if (fields.length === 0) return false;
    values.push(slot);
    const [result] = await pool.query(
        `UPDATE services SET ${fields.join(', ')} WHERE slot = ?`,
        values
    );
    return result.affectedRows > 0;
};

module.exports = { getServices, getService, updateService };
