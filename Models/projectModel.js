const pool = require('../config/database');

const getAllProjects = async (includeInactive = false) => {
    try {
        let query = 'SELECT * FROM projects';
        if (!includeInactive) {
            query += ' WHERE status = "active"';
        }
        query += ' ORDER BY display_order ASC, id DESC';
        const [rows] = await pool.query(query);
        rows.forEach(p => {
            if (p.image_path && !p.image_path.startsWith('/images/') && !p.image_path.startsWith('/uploads/')) {
                p.image_path = '/images/' + p.image_path;
            }
        });
        return rows;
    } catch (error) {
        console.error('Lỗi getAllProjects:', error);
        throw error;
    }
};

const getProjectById = async (id) => {
    try {
        const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].image_path && !rows[0].image_path.startsWith('/images/') && !rows[0].image_path.startsWith('/uploads/')) {
            rows[0].image_path = '/images/' + rows[0].image_path;
        }
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Lỗi getProjectById:', error);
        throw error;
    }
};

const createProject = async (projectData) => {
    try {
        const { name, area, square_meters, category, year, style, small_content, image_path } = projectData;

        // Limit max 6 active projects per area
        const [existing] = await pool.query(
            'SELECT COUNT(*) as count FROM projects WHERE area = ? AND status = "active"',
            [area]
        );
        if (existing[0].count >= 6) {
            throw new Error(`Maximum 6 active projects allowed per area (${area}).`);
        }

        // Auto-calculate display_order: max + 1 for this area
        const [rows] = await pool.query(
            'SELECT COALESCE(MAX(display_order), -1) as max_order FROM projects WHERE area = ?',
            [area]
        );
        const display_order = (rows[0].max_order || 0) + 1;

        const [result] = await pool.query(
            'INSERT INTO projects (name, area, square_meters, category, year, style, small_content, image_path, display_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "active")',
            [name, area, square_meters, category, year, style, small_content, image_path, display_order]
        );
        return result.insertId;
    } catch (error) {
        console.error('Lỗi createProject:', error);
        throw error;
    }
};

const updateProject = async (id, projectData) => {
    try {
        const { name, area, square_meters, category, year, style, small_content, image_path, display_order } = projectData;
        const [result] = await pool.query(
            'UPDATE projects SET name = ?, area = ?, square_meters = ?, category = ?, year = ?, style = ?, small_content = ?, image_path = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, area, square_meters, category, year, style, small_content, image_path, display_order || 0, id]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi updateProject:', error);
        throw error;
    }
};

const updateProjectFields = async (id, fields) => {
    try {
        const keys = Object.keys(fields);
        if (keys.length === 0) return true;
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(fields), id];
        const [result] = await pool.query(
            `UPDATE projects SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi updateProjectFields:', error);
        throw error;
    }
};

const softDeleteProject = async (id) => {
    try {
        const [result] = await pool.query(
            'UPDATE projects SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi softDeleteProject:', error);
        throw error;
    }
};

const restoreProject = async (id) => {
    try {
        const [result] = await pool.query(
            'UPDATE projects SET status = "active", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi restoreProject:', error);
        throw error;
    }
};

const getInactiveProjects = async () => {
    try {
        const [rows] = await pool.query('SELECT * FROM projects WHERE status = "inactive" ORDER BY updated_at DESC');
        rows.forEach(p => {
            if (p.image_path && !p.image_path.startsWith('/images/') && !p.image_path.startsWith('/uploads/')) {
                p.image_path = '/images/' + p.image_path;
            }
        });
        return rows;
    } catch (error) {
        console.error('Lỗi getInactiveProjects:', error);
        throw error;
    }
};

const deleteProject = async (id) => {
    try {
        const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi deleteProject:', error);
        throw error;
    }
};

module.exports = {
    getAllProjects,
    getProjectById,
    createProject,
    updateProject,
    updateProjectFields,
    softDeleteProject,
    restoreProject,
    getInactiveProjects,
    deleteProject
};
