const { sql, poolPromise } = require('../config/database.js');

const pool = require('../config/database'); // nhớ đúng path

const checkCredentials = async (username, password) => {
    try {
        if (!username || !password) {
            return null;
        }

        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        );

        return rows.length > 0 ? rows[0] : null;

    } catch (error) {
        console.error("Lỗi khi truy vấn dữ liệu:", error);
        throw error;
    }
};

module.exports = {
    checkCredentials
};

module.exports = {
    checkCredentials
};