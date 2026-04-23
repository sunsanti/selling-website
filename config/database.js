const sql = require('mssql');

const config = {
    user: 'sa',
    password: '123',
    server: 'localhost',
    database: 'sellingweb',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Đã kết nối thành công tới SQL Server!');
        return pool;
    })

    .catch(err => {
        console.error('❌ Lỗi kết nối SQL Server:', err);
    });

module.exports = {
    sql,
    poolPromise
};