const pool = require('../config/database');
const { HOME_FOOTER_PERSONS_COUNT } = require('../config/constants');

const getFooterPersons = async () => {
    const [rows] = await pool.query(
        'SELECT slot, name, avatar_path, email, phone1, phone2, facebook_url FROM footer_persons ORDER BY slot ASC'
    );
    return rows;
};

const getFooterPerson = async (slot) => {
    const [rows] = await pool.query(
        'SELECT slot, name, avatar_path, email, phone1, phone2, facebook_url FROM footer_persons WHERE slot = ?',
        [slot]
    );
    return rows[0] || null;
};

const updateFooterPerson = async (slot, { name, avatar_path, email, phone1, phone2, facebook_url }) => {
    if (!Number.isInteger(slot) || slot < 1 || slot > HOME_FOOTER_PERSONS_COUNT) {
        throw new Error(`slot must be 1..${HOME_FOOTER_PERSONS_COUNT}`);
    }
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name || ''); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email || ''); }
    if (phone1 !== undefined) { fields.push('phone1 = ?'); values.push(phone1 || ''); }
    if (phone2 !== undefined) { fields.push('phone2 = ?'); values.push(phone2 || ''); }
    if (facebook_url !== undefined) { fields.push('facebook_url = ?'); values.push(facebook_url || ''); }
    if (avatar_path !== undefined && avatar_path !== null && avatar_path !== '') {
        fields.push('avatar_path = ?');
        values.push(avatar_path);
    }
    if (fields.length === 0) return false;
    values.push(slot);
    const [result] = await pool.query(
        `UPDATE footer_persons SET ${fields.join(', ')} WHERE slot = ?`,
        values
    );
    return result.affectedRows > 0;
};

module.exports = { getFooterPersons, getFooterPerson, updateFooterPerson };
