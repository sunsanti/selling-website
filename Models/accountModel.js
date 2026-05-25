const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { BCRYPT_ROUNDS } = require('../config/constants');

const getAllAccounts = async () => {
    try {
        const [rows] = await pool.query('SELECT id, username, name, role, created_at FROM accounts ORDER BY created_at DESC');
        return rows;
    } catch (error) {
        console.error('Lỗi getAllAccounts:', error);
        throw error;
    }
};

const getAccountById = async (id) => {
    try {
        const [rows] = await pool.query('SELECT id, username, name, role, created_at FROM accounts WHERE id = ?', [id]);
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

const createAccount = async (username, password, name, role = 'employee') => {
    try {
        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const [result] = await pool.query(
            'INSERT INTO accounts (username, password, name, role) VALUES (?, ?, ?, ?)',
            [username, hashed, name, role]
        );
        return result.insertId;
    } catch (error) {
        console.error('Lỗi createAccount:', error);
        throw error;
    }
};

const updateAccount = async (id, username, password, name, role) => {
    try {
        let query, params;

        // Build dynamic update based on what was provided
        const fields = [];
        const values = [];

        if (username !== undefined) {
            fields.push('username = ?');
            values.push(username);
        }
        if (password !== undefined && password !== '') {
            const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
            fields.push('password = ?');
            values.push(hashed);
        }
        if (name !== undefined) {
            fields.push('name = ?');
            values.push(name);
        }
        if (role !== undefined) {
            fields.push('role = ?');
            values.push(role);
        }

        if (fields.length === 0) return false;

        values.push(id);
        query = `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`;

        const [result] = await pool.query(query, values);
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
