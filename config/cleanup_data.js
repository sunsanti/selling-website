/**
 * Run once: node config/cleanup_data.js
 *
 * Clears user data from contacts, projects, tableimages, accounts
 * and re-seeds a single admin (admin/admin123, role=admin).
 *
 * Does NOT touch home content tables (about_section, about_stats,
 * services, footer_persons) or settings — those are CMS data, not
 * user-generated.
 *
 * Safe to re-run: TRUNCATE is idempotent and admin is re-inserted
 * with the same hashed password each time.
 */
const bcrypt = require('bcrypt');
const pool = require('./database');
const { BCRYPT_ROUNDS } = require('./constants');

(async () => {
    const conn = await pool.getConnection();
    try {
        console.log('🔓 Disabling FK checks...');
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('🧹 Truncating contacts...');
        await conn.query('TRUNCATE TABLE contacts');

        console.log('🧹 Truncating tableimages (child of projects)...');
        await conn.query('TRUNCATE TABLE tableimages');

        console.log('🧹 Truncating projects...');
        await conn.query('TRUNCATE TABLE projects');

        console.log('🧹 Truncating accounts...');
        await conn.query('TRUNCATE TABLE accounts');

        console.log('🔒 Re-enabling FK checks...');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('👤 Re-seeding default admin (admin / admin123)...');
        const hashed = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
        await conn.query(
            'INSERT INTO accounts (username, password, name, role) VALUES (?, ?, ?, ?)',
            ['admin', hashed, 'Administrator', 'admin']
        );

        const [rows] = await conn.query(
            'SELECT id, username, name, role FROM accounts'
        );
        console.log('\n✅ Done. Current accounts:');
        console.table(rows);

        const [counts] = await conn.query(`
            SELECT
                (SELECT COUNT(*) FROM contacts) AS contacts,
                (SELECT COUNT(*) FROM projects) AS projects,
                (SELECT COUNT(*) FROM tableimages) AS tableimages,
                (SELECT COUNT(*) FROM accounts) AS accounts
        `);
        console.log('Row counts after cleanup:');
        console.table(counts);
    } catch (err) {
        console.error('❌ Cleanup error:', err);
        try { await conn.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
        process.exitCode = 1;
    } finally {
        conn.release();
        await pool.end();
    }
})();
