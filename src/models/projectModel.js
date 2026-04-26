const pool = require('../../config/database');

const projectModel = {
    async getAll(includeDeleted = false) {
        let query = 'SELECT * FROM projects';
        if (!includeDeleted) query += ' WHERE is_deleted = 0';
        query += ' ORDER BY display_order ASC, created_at DESC';
        const [rows] = await pool.query(query);
        return rows;
    },

    async getById(id) {
        const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async create({ name, size, category, year, style, description, region, image_url, display_order = 0 }) {
        const [result] = await pool.query(
            `INSERT INTO projects (name, size, category, year, style, description, region, image_url, display_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, size, category, year, style, description || '', region, image_url, display_order]
        );
        return this.getById(result.insertId);
    },

    async update(id, { name, size, category, year, style, description, region, image_url, display_order }) {
        await pool.query(
            `UPDATE projects SET name = ?, size = ?, category = ?, year = ?, style = ?,
             description = ?, region = ?, image_url = ?, display_order = ? WHERE id = ?`,
            [name, size, category, year, style, description || '', region, image_url, display_order || 0, id]
        );
        return this.getById(id);
    },

    async softDelete(id) {
        await pool.query('UPDATE projects SET is_deleted = 1 WHERE id = ?', [id]);
        return this.getById(id);
    },

    async restore(id) {
        await pool.query('UPDATE projects SET is_deleted = 0 WHERE id = ?', [id]);
        return this.getById(id);
    }
};

module.exports = projectModel;
