const pool = require('./config/database.js'); // file config mysql của bạn

async function testDB() {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        console.log('📦 Data:', rows);
    } catch (err) {
        console.error('❌ Lỗi query:', err);
    }
}

testDB();