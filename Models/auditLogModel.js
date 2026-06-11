const pool = require('../config/database');

/**
 * Insert an audit row. Errors are caught + logged but never thrown — an audit
 * failure must not block the action being audited.
 *
 *   await auditLogModel.log({
 *       req,                                  // optional: extracts user + IP
 *       action: 'PROJECT_CREATE',
 *       target_type: 'project',
 *       target_id: 42,
 *       details: { name: 'X', area: 'sydney' }
 *   });
 */
const log = async ({ req, action, target_type, target_id, details } = {}) => {
    if (!action) return;
    const user = (req && req.session && req.session.user) ? req.session.user : {};
    const ip = req
        ? (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || null
        : null;
    try {
        await pool.query(
            'INSERT INTO audit_log (user_id, username, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                user.id || null,
                user.username || null,
                action,
                target_type || null,
                target_id || null,
                details ? JSON.stringify(details) : null,
                ip
            ]
        );
    } catch (err) {
        console.error('audit log fail:', err.message);
    }
};

/**
 * Read recent audit rows. Optional filters: action, target_type, user_id, q (search in username/action/target).
 * Limit hard-capped at 1000 to avoid runaway responses.
 */
const getRecent = async ({ limit, offset, action, target_type, user_id, q } = {}) => {
    const where = [];
    const params = [];
    if (action) { where.push('action = ?'); params.push(action); }
    if (target_type) { where.push('target_type = ?'); params.push(target_type); }
    if (user_id) { where.push('user_id = ?'); params.push(parseInt(user_id, 10)); }
    if (q) {
        where.push('(username LIKE ? OR action LIKE ? OR target_type LIKE ?)');
        const like = '%' + q + '%';
        params.push(like, like, like);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const lim = Math.min(parseInt(limit, 10) || 200, 1000);
    const off = Math.max(parseInt(offset, 10) || 0, 0);
    params.push(lim, off);
    const [rows] = await pool.query(
        `SELECT id, user_id, username, action, target_type, target_id, details, ip_address, created_at
         FROM audit_log ${whereClause}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        params
    );
    return rows;
};

const getDistinctActions = async () => {
    const [rows] = await pool.query('SELECT DISTINCT action FROM audit_log ORDER BY action ASC');
    return rows.map(r => r.action);
};

module.exports = { log, getRecent, getDistinctActions };
