const pool = require('../config/database');

const getAllAccounts = async () => {
    try {
        const [rows] = await pool.query('SELECT id, username, created_at FROM accounts ORDER BY created_at DESC');
        return rows;
    } catch (error) {
        console.error('Lỗi getAllAccounts:', error);
        throw error;
    }
};

const getAccountById = async (id) => {
    try {
        const [rows] = await pool.query('SELECT id, username, created_at FROM accounts WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Lỗi getAccountById:', error);
        throw error;
    }
};

const getAccountByUsername = async (username) => {
    try {
        const [rows] = await pool.query('SELECT * FROM accounts WHERE username = ?', [username]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Lỗi getAccountByUsername:', error);
        throw error;
    }
};

const createAccount = async (username, password) => {
    try {
        const [result] = await pool.query(
            'INSERT INTO accounts (username, password) VALUES (?, ?)',
            [username, password]
        );
        return result.insertId;
    } catch (error) {
        console.error('Lỗi createAccount:', error);
        throw error;
    }
};

const updateAccount = async (id, username, password) => {
    try {
        let query, params;
        if (password) {
            query = 'UPDATE accounts SET username = ?, password = ? WHERE id = ?';
            params = [username, password, id];
        } else {
            query = 'UPDATE accounts SET username = ? WHERE id = ?';
            params = [username, id];
        }
        const [result] = await pool.query(query, params);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi updateAccount:', error);
        throw error;
    }
};

const deleteAccount = async (id) => {
    try {
        const [result] = await pool.query('DELETE FROM accounts WHERE id = ?', [id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi deleteAccount:', error);
        throw error;
    }
};

module.exports = {
    getAllAccounts,
    getAccountById,
    getAccountByUsername,
    createAccount,
    updateAccount,
    deleteAccount
};
