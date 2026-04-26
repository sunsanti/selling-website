const pool = require('../../config/database');

const checkCredentials = async (username, password) => {
    if (!username || !password) return null;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Lỗi khi truy vấn users:', error);
        return null;
    }
};

module.exports = { checkCredentials };
