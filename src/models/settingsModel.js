const pool = require('../../config/database');

const settingsModel = {
    async get() {
        const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');
        return rows[0] || null;
    },

    async update({ logo_url, phone_number, main_image_url }) {
        await pool.query(
            'UPDATE settings SET logo_url = ?, phone_number = ?, main_image_url = ? WHERE id = 1',
            [logo_url || '', phone_number || '', main_image_url || '']
        );
        return this.get();
    }
};

module.exports = settingsModel;
