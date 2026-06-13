const pool = require('../config/database');

const getImagesByProjectId = async (projectId) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM tableimages WHERE project_id = ? ORDER BY display_order ASC, id ASC',
            [projectId]
        );
        rows.forEach(r => {
            // F10.fix: unify under /uploads/ (rewrite legacy /images/ + bare filenames)
            if (r.image_path) {
                if (r.image_path.startsWith('/images/')) {
                    r.image_path = '/uploads/' + r.image_path.slice('/images/'.length);
                } else if (!r.image_path.startsWith('/uploads/') && !/^https?:\/\//i.test(r.image_path) && !r.image_path.startsWith('data:') && !r.image_path.startsWith('/')) {
                    r.image_path = '/uploads/' + r.image_path;
                }
            }
        });
        return rows;
    } catch (error) {
        console.error('Lỗi getImagesByProjectId:', error);
        throw error;
    }
};

const getAllImages = async () => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM tableimages ORDER BY project_id ASC, display_order ASC, id ASC'
        );
        rows.forEach(r => {
            // F10.fix: unify under /uploads/ (rewrite legacy /images/ + bare filenames)
            if (r.image_path) {
                if (r.image_path.startsWith('/images/')) {
                    r.image_path = '/uploads/' + r.image_path.slice('/images/'.length);
                } else if (!r.image_path.startsWith('/uploads/') && !/^https?:\/\//i.test(r.image_path) && !r.image_path.startsWith('data:') && !r.image_path.startsWith('/')) {
                    r.image_path = '/uploads/' + r.image_path;
                }
            }
        });
        return rows;
    } catch (error) {
        console.error('Lỗi getAllImages:', error);
        throw error;
    }
};

const createImage = async (imageData) => {
    try {
        const { project_id, image_path, display_order } = imageData;
        const [result] = await pool.query(
            'INSERT INTO tableimages (project_id, image_path, display_order) VALUES (?, ?, ?)',
            [project_id, image_path, display_order || 0]
        );
        return result.insertId;
    } catch (error) {
        console.error('Lỗi createImage:', error);
        throw error;
    }
};

const updateImage = async (id, imageData) => {
    try {
        const { image_path, display_order } = imageData;
        const [result] = await pool.query(
            'UPDATE tableimages SET image_path = ?, display_order = ? WHERE id = ?',
            [image_path, display_order || 0, id]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi updateImage:', error);
        throw error;
    }
};

const deleteImage = async (id) => {
    try {
        const [result] = await pool.query('DELETE FROM tableimages WHERE id = ?', [id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi deleteImage:', error);
        throw error;
    }
};

const deleteImagesByProjectId = async (projectId) => {
    try {
        const [result] = await pool.query('DELETE FROM tableimages WHERE project_id = ?', [projectId]);
        return result.affectedRows;
    } catch (error) {
        console.error('Lỗi deleteImagesByProjectId:', error);
        throw error;
    }
};

module.exports = {
    getImagesByProjectId,
    getAllImages,
    createImage,
    updateImage,
    deleteImage,
    deleteImagesByProjectId
};
