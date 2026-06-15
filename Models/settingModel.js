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
        // v16: /about Offices became a dynamic list (about_offices, JSON array of
        // {name, flag, address, phone, email}). If it hasn't been saved yet,
        // synthesize it from the old fixed Sydney/HCM settings so existing data
        // isn't lost on first load after the upgrade.
        if (!settings.about_offices) {
            const legacy = [];
            if (settings.about_office_sydney_address || settings.about_office_sydney_phone || settings.about_office_sydney_email) {
                legacy.push({
                    name: 'Sydney', flag: '🇦🇺',
                    address: settings.about_office_sydney_address || '',
                    phone: settings.about_office_sydney_phone || '',
                    email: settings.about_office_sydney_email || ''
                });
            }
            if (settings.about_office_hcm_address || settings.about_office_hcm_phone || settings.about_office_hcm_email) {
                legacy.push({
                    name: 'Ho Chi Minh City', flag: '🇻🇳',
                    address: settings.about_office_hcm_address || '',
                    phone: settings.about_office_hcm_phone || '',
                    email: settings.about_office_hcm_email || ''
                });
            }
            settings.about_offices = JSON.stringify(legacy);
        }
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
