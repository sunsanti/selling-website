const pool = require('../config/database');
const { HOME_ABOUT_STATS_COUNT } = require('../config/constants');

const getAbout = async () => {
    const [sectionRows] = await pool.query(
        'SELECT banner, paragraph_left, paragraph_right FROM about_section WHERE id = 1'
    );
    const [statsRows] = await pool.query(
        'SELECT slot, num, label FROM about_stats ORDER BY slot ASC'
    );
    if (sectionRows.length === 0) return null;
    return { ...sectionRows[0], stats: statsRows };
};

const updateAbout = async ({ banner, paragraph_left, paragraph_right, stats }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            'UPDATE about_section SET banner = ?, paragraph_left = ?, paragraph_right = ? WHERE id = 1',
            [banner || '', paragraph_left || '', paragraph_right || '']
        );

        if (Array.isArray(stats)) {
            for (const s of stats) {
                if (!s || typeof s.slot !== 'number') continue;
                if (s.slot < 1 || s.slot > HOME_ABOUT_STATS_COUNT) continue;
                await conn.query(
                    'UPDATE about_stats SET num = ?, label = ? WHERE slot = ?',
                    [s.num || '', s.label || '', s.slot]
                );
            }
        }

        await conn.commit();
        return true;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

module.exports = { getAbout, updateAbout };
