const pool = require('../config/database');

const getSetting = async (key) => {
    try {
        const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
        return rows.length > 0 ? rows[0].setting_value : null;
    } catch (error) {
        console.error('Lỗi getSetting:', error);
        throw error;
    }
};

const getAllSettings = async () => {
    try {
        const [rows] = await pool.query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        return settings;
    } catch (error) {
        console.error('Lỗi getAllSettings:', error);
        throw error;
    }
};

const updateSetting = async (key, value) => {
    try {
        const [result] = await pool.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP',
            [key, value, value]
        );
        return result;
    } catch (error) {
        console.error('Lỗi updateSetting:', error);
        throw error;
    }
};

module.exports = {
    getSetting,
    getAllSettings,
    updateSetting
};
