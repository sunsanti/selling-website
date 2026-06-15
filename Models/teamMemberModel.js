// v22: Team members for /about Our Team grid — dynamic list (add/remove), ordered by slot
const pool = require('../config/database');

const getAll = async () => {
    const [rows] = await pool.query('SELECT id, slot, name, role, avatar_path FROM team_members ORDER BY slot ASC');
    return rows;
};

const updateById = async (id, { name, role, avatar_path }) => {
    if (!Number.isInteger(id) || id < 1) {
        throw new Error('id must be a positive integer');
    }
    const fields = [];
    const values = [];
    if (name !== undefined)        { fields.push('name = ?');        values.push(String(name || '').slice(0, 255)); }
    if (role !== undefined)        { fields.push('role = ?');        values.push(String(role || '').slice(0, 255)); }
    if (avatar_path !== undefined) { fields.push('avatar_path = ?'); values.push(String(avatar_path || '').slice(0, 255)); }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.query(`UPDATE team_members SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
};

const create = async ({ name, role, avatar_path }) => {
    const [[{ next }]] = await pool.query('SELECT COALESCE(MAX(slot), 0) + 1 AS next FROM team_members');
    const [result] = await pool.query(
        'INSERT INTO team_members (slot, name, role, avatar_path) VALUES (?, ?, ?, ?)',
        [next, String(name || '').slice(0, 255), String(role || '').slice(0, 255), String(avatar_path || '').slice(0, 255)]
    );
    return result.insertId;
};

const remove = async (id) => {
    const [result] = await pool.query('DELETE FROM team_members WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

module.exports = { getAll, updateById, create, remove };
