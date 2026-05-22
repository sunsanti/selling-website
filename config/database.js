const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',     // user bạn đã tạo
    password: '1234',
    database: 'sellingweb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// test kết nối
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Đã kết nối thành công tới MySQL!');
        connection.release();
    } catch (err) {
        console.error('❌ Lỗi kết nối MySQL:', err);
    }
})();

module.exports = pool;