const pool = require('../config/database');
const { HOME_SERVICES_COUNT } = require('../config/constants');

const getServices = async () => {
    const [rows] = await pool.query(
        'SELECT slot, title, description, image_path FROM services ORDER BY slot ASC'
    );
    return rows;
};

const getService = async (slot) => {
    const [rows] = await pool.query(
        'SELECT slot, title, description, image_path FROM services WHERE slot = ?',
        [slot]
    );
    return rows[0] || null;
};

const updateService = async (slot, { title, description, image_path }) => {
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
    if (fields.length === 0) return false;
    values.push(slot);
    const [result] = await pool.query(
        `UPDATE services SET ${fields.join(', ')} WHERE slot = ?`,
        values
    );
    return result.affectedRows > 0;
};

module.exports = { getServices, getService, updateService };
