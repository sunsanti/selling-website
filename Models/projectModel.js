const pool = require('../config/database');
const { MAX_PROJECTS_PER_AREA, AREAS } = require('../config/constants');

// F05a: search filter whitelists
const ALLOWED_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const ALLOWED_TYPES = ['apartment', 'house', 'townhouse', 'land'];
const PRICE_RANGES = {
    '500k-800k': [500000, 800000],
    '800k-1m':   [800000, 1000000],
    '1m-2m':     [1000000, 2000000],
    '2m+':       [2000000, 999999999]
};
const SUBURB_RE = /^[a-z0-9-]{1,50}$/i;

const EXTENDED_FIELDS = ['price', 'beds', 'baths', 'cars', 'address', 'state', 'property_type', 'area_label'];

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

        // Limit max active projects per area
        const [existing] = await pool.query(
            'SELECT COUNT(*) as count FROM projects WHERE area = ? AND status = "active"',
            [area]
        );
        if (existing[0].count >= MAX_PROJECTS_PER_AREA) {
            throw new Error(`Maximum ${MAX_PROJECTS_PER_AREA} active projects allowed per area (${area}).`);
        }

        // Auto-calculate display_order: max + 1 for this area
        const [rows] = await pool.query(
            'SELECT COALESCE(MAX(display_order), -1) as max_order FROM projects WHERE area = ?',
            [area]
        );
        const display_order = (rows[0].max_order || 0) + 1;

        // F05a extended fields (optional, default empty string in DB)
        const ext = EXTENDED_FIELDS.reduce((acc, k) => {
            acc[k] = (projectData[k] !== undefined && projectData[k] !== null) ? String(projectData[k]) : '';
            return acc;
        }, {});

        const [result] = await pool.query(
            `INSERT INTO projects
             (name, area, square_meters, category, year, style, small_content, image_path, display_order, status,
              price, beds, baths, cars, address, state, property_type, area_label)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "active",
                     ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, area, square_meters, category, year, style, small_content, image_path, display_order,
             ext.price, ext.beds, ext.baths, ext.cars, ext.address, ext.state, ext.property_type, ext.area_label]
        );
        return result.insertId;
    } catch (error) {
        console.error('Lỗi createProject:', error);
        throw error;
    }
};

// F05a: Property Search filter — whitelist + prepared statements
const searchProjects = async ({ state, suburb, type, price, area, status = 'active' } = {}) => {
    try {
        const where = ['status = ?'];
        const params = [status];

        if (state && ALLOWED_STATES.includes(String(state).toUpperCase())) {
            where.push('state = ?');
            params.push(String(state).toUpperCase());
        }
        if (type && ALLOWED_TYPES.includes(String(type).toLowerCase())) {
            where.push('property_type = ?');
            params.push(String(type).toLowerCase());
        }
        if (suburb && SUBURB_RE.test(suburb)) {
            where.push('(LOWER(address) LIKE ? OR LOWER(area_label) LIKE ?)');
            const like = '%' + String(suburb).toLowerCase() + '%';
            params.push(like, like);
        }
        if (price && PRICE_RANGES[price]) {
            const [min, max] = PRICE_RANGES[price];
            // Use REGEXP_REPLACE to strip non-digits then cast to UNSIGNED for comparison.
            // This handles VARCHAR price like 'From $699,000' → 699000.
            where.push('(CAST(REGEXP_REPLACE(price, "[^0-9]", "") AS UNSIGNED) BETWEEN ? AND ?)');
            params.push(min, max);
        }
        if (area && AREAS && AREAS.includes(String(area).toLowerCase())) {
            where.push('area = ?');
            params.push(String(area).toLowerCase());
        }

        const sql = `SELECT * FROM projects WHERE ${where.join(' AND ')} ORDER BY display_order ASC, id DESC`;
        const [rows] = await pool.query(sql, params);
        rows.forEach(p => {
            if (p.image_path && !p.image_path.startsWith('/images/') && !p.image_path.startsWith('/uploads/')) {
                p.image_path = '/images/' + p.image_path;
            }
        });
        return rows;
    } catch (error) {
        console.error('Lỗi searchProjects:', error);
        throw error;
    }
};

const updateProject = async (id, projectData) => {
    try {
        const { name, area, square_meters, category, year, style, small_content, image_path, display_order } = projectData;
        const ext = EXTENDED_FIELDS.reduce((acc, k) => {
            acc[k] = (projectData[k] !== undefined && projectData[k] !== null) ? String(projectData[k]) : '';
            return acc;
        }, {});
        const [result] = await pool.query(
            `UPDATE projects SET
                name = ?, area = ?, square_meters = ?, category = ?, year = ?, style = ?,
                small_content = ?, image_path = ?, display_order = ?,
                price = ?, beds = ?, baths = ?, cars = ?, address = ?, state = ?, property_type = ?, area_label = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, area, square_meters, category, year, style, small_content, image_path, display_order || 0,
             ext.price, ext.beds, ext.baths, ext.cars, ext.address, ext.state, ext.property_type, ext.area_label,
             id]
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
        // Look up the inactive project's area to enforce per-area cap
        const [projectRows] = await pool.query(
            'SELECT area FROM projects WHERE id = ?',
            [id]
        );
        if (projectRows.length === 0) return false;
        const area = projectRows[0].area;

        const [count] = await pool.query(
            'SELECT COUNT(*) as count FROM projects WHERE area = ? AND status = "active"',
            [area]
        );
        if (count[0].count >= MAX_PROJECTS_PER_AREA) {
            throw new Error(`Maximum ${MAX_PROJECTS_PER_AREA} active projects allowed per area (${area}).`);
        }

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
    deleteProject,
    // F05a
    searchProjects,
    ALLOWED_STATES,
    ALLOWED_TYPES,
    PRICE_RANGES,
    EXTENDED_FIELDS
};
