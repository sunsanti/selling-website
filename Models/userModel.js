const { sql, poolPromise } = require('../config/database');

const checkCredentials = async (username, password) => {
    try {
        if (!username || !password) {
            return false;
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_name', sql.VarChar, username)
            .input('user_pass', sql.VarChar, password)
            .query('SELECT * FROM users WHERE username = @user_name AND password = @user_pass');
        
        return result.recordset.length > 0;
    } catch (error) {
        console.error("Lỗi khi truy vấn dữ liệu:", error);
        throw error; 
    }
};

module.exports = {
    checkCredentials
};