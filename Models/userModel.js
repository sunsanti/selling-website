const bcrypt = require('bcrypt');
const pool = require('../config/database');

const checkCredentials = async (username, password) => {
    try {
        if (!username || !password) {
            return null;
        }

        const [rows] = await pool.query(
            'SELECT * FROM accounts WHERE username = ?',
            [username]
        );

        if (rows.length === 0) return null;

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        return match ? user : null;

    } catch (error) {
        console.error("Lỗi khi truy vấn dữ liệu:", error);
        throw error;
    }
};

module.exports = {
    checkCredentials
};
