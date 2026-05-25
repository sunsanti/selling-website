/**
 * Run once: node config/migrate_db_schema.js
 *
 * Idempotent schema migrator:
 *   - Adds `accounts.name` and `accounts.role` columns if missing
 *   - Seeds the admin account's name/role
 *   - Creates indexes on hot query paths
 *
 * Safe to re-run — every step checks INFORMATION_SCHEMA first.
 */
const pool = require('./database');

async function hasColumn(table, column) {
    const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [table, column]
    );
    return rows.length > 0;
}

async function hasIndex(table, indexName) {
    const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [table, indexName]
    );
    return rows.length > 0;
}

(async () => {
    try {
        if (!(await hasColumn('accounts', 'name'))) {
            await pool.query(
                `ALTER TABLE accounts ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'User' AFTER password`
            );
            console.log('✅ Added accounts.name');
        } else {
            console.log('⏭️  accounts.name already exists');
        }

        if (!(await hasColumn('accounts', 'role'))) {
            await pool.query(
                `ALTER TABLE accounts ADD COLUMN role ENUM('admin', 'employee') DEFAULT 'employee' AFTER name`
            );
            console.log('✅ Added accounts.role');
        } else {
            console.log('⏭️  accounts.role already exists');
        }

        const [updateResult] = await pool.query(
            `UPDATE accounts SET name = 'Administrator', role = 'admin'
             WHERE username = 'admin' AND (name = 'User' OR role <> 'admin')`
        );
        if (updateResult.affectedRows > 0) {
            console.log(`✅ Seeded admin account name/role (${updateResult.affectedRows} row)`);
        }

        const indexes = [
            { table: 'projects', name: 'idx_projects_area_status', cols: '(area, status)' },
            { table: 'projects', name: 'idx_projects_display_order', cols: '(display_order)' },
            { table: 'contacts', name: 'idx_contacts_email', cols: '(email)' },
            { table: 'contacts', name: 'idx_contacts_created_at', cols: '(created_at)' },
            { table: 'tableimages', name: 'idx_tableimages_project_id', cols: '(project_id)' }
        ];

        for (const { table, name, cols } of indexes) {
            if (await hasIndex(table, name)) {
                console.log(`⏭️  Index ${name} already exists`);
                continue;
            }
            await pool.query(`CREATE INDEX ${name} ON ${table} ${cols}`);
            console.log(`✅ Created index ${name} on ${table}${cols}`);
        }

        console.log('\n🎉 Migration hoàn tất.');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
