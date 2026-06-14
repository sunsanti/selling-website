// v13: Team members for /about Our Team grid (6 fixed slots, mirrors footer_persons)
const pool = require('../config/database');

const SLOT_COUNT = 6;

const getAll = async () => {
    const [rows] = await pool.query('SELECT slot, name, role, avatar_path FROM team_members ORDER BY slot ASC');
    return rows;
};

const getBySlot = async (slot) => {
    const [rows] = await pool.query('SELECT slot, name, role, avatar_path FROM team_members WHERE slot = ?', [slot]);
    return rows[0] || null;
};

const updateBySlot = async (slot, { name, role, avatar_path }) => {
    if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) {
        throw new Error(`slot must be 1..${SLOT_COUNT}`);
    }
    const fields = [];
    const values = [];
    if (name !== undefined)         { fields.push('name = ?');         values.push(String(name || '').slice(0, 255)); }
    if (role !== undefined)         { fields.push('role = ?');         values.push(String(role || '').slice(0, 255)); }
    if (avatar_path !== undefined)  { fields.push('avatar_path = ?');  values.push(String(avatar_path || '').slice(0, 255)); }
    if (fields.length === 0) return false;
    values.push(slot);
    const [result] = await pool.query(`UPDATE team_members SET ${fields.join(', ')} WHERE slot = ?`, values);
    return result.affectedRows > 0;
};

module.exports = { getAll, getBySlot, updateBySlot, SLOT_COUNT };
