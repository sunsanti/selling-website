const pool = require('../config/database');

const getAllContacts = async () => {
    try {
        const [rows] = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
        return rows;
    } catch (error) {
        console.error('Lỗi getAllContacts:', error);
        throw error;
    }
};

const createContact = async (contactData) => {
    try {
        const { name, phone, email } = contactData;
        const [result] = await pool.query(
            'INSERT INTO contacts (name, phone, email) VALUES (?, ?, ?)',
            [name, phone || '', email || '']
        );
        return result.insertId;
    } catch (error) {
        console.error('Lỗi createContact:', error);
        throw error;
    }
};

const deleteContact = async (id) => {
    try {
        const [result] = await pool.query('DELETE FROM contacts WHERE id = ?', [id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Lỗi deleteContact:', error);
        throw error;
    }
};

module.exports = {
    getAllContacts,
    createContact,
    deleteContact
};
