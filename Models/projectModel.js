const pool = require('../config/database');

const getAllProjects = async (includeInactive = false) => {
    try {
        let query = 'SELECT * FROM projects';
        if (!includeInactive) {
            query += ' WHERE status = "active"';
        }
        query += ' ORDER BY display_order ASC, id DESC';
        const [rows] = await pool.query(query);
        return rows;
    } catch (error) {
        console.error('Lỗi getAllProjects:', error);
        throw error;
    }
};

const getProjectById = async (id) => {
    try {
        const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Lỗi getProjectById:', error);
        throw error;
    }
};

const createProject = async (projectData) => {
    try {
        const { name, area, square_meters, category, year, style, small_content, image_path, display_order } = projectData;
        const [result] = await pool.query(
            'INSERT INTO projects (name, area, square_meters, category, year, style, small_content, image_path, display_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "active")',
            [name, area, square_meters, category, year, style, small_content, image_path, display_order || 0]
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
        return rows;
    } catch (error) {
        console.error('Lỗi getInactiveProjects:', error);
        throw error;
    }
};

module.exports = {
    getAllProjects,
    getProjectById,
    createProject,
    updateProject,
    softDeleteProject,
    restoreProject,
    getInactiveProjects
};
