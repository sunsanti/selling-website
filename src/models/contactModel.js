const pool = require('../../config/database');

const contactModel = {
    async getAll() {
        const [rows] = await pool.query('SELECT * FROM contact_lists ORDER BY created_at DESC');
        return rows;
    },

    async getById(id) {
        const [rows] = await pool.query('SELECT * FROM contact_lists WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async create({ name, phone, email }) {
        const [result] = await pool.query(
            'INSERT INTO contact_lists (name, phone, email) VALUES (?, ?, ?)',
            [name, phone, email]
        );
        return this.getById(result.insertId);
    },

    async update(id, { name, phone, email }) {
        await pool.query(
            'UPDATE contact_lists SET name = ?, phone = ?, email = ? WHERE id = ?',
            [name, phone, email, id]
        );
        return this.getById(id);
    },

    async delete(id) {
        const [result] = await pool.query('DELETE FROM contact_lists WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = contactModel;
