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

async function hasTable(table) {
    const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
        [table]
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

        if (await hasTable('users')) {
            await pool.query('DROP TABLE users');
            console.log('✅ Dropped legacy table `users` (login moved to `accounts`)');
        } else {
            console.log('⏭️  Legacy table `users` already absent');
        }

        // ============== HOME CONTENT TABLES ==============
        if (!(await hasTable('about_section'))) {
            await pool.query(`
                CREATE TABLE about_section (
                    id INT PRIMARY KEY DEFAULT 1,
                    banner TEXT NOT NULL,
                    paragraph_left TEXT NOT NULL,
                    paragraph_right TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CHECK (id = 1)
                )
            `);
            console.log('✅ Created about_section');
        } else {
            console.log('⏭️  about_section already exists');
        }

        await pool.query(`
            INSERT IGNORE INTO about_section (id, banner, paragraph_left, paragraph_right) VALUES (1, ?, ?, ?)
        `, [
            'MANY BEAUTIFUL PLACES ARE WAITING FOR YOU TO SEE',
            'We are a passionate real estate team dedicated to developing modern and sustainable properties that blend aesthetic design with practical functionality, creating high-quality living and working spaces that offer lasting value and reflect distinctive character.',
            'With a strong commitment to quality and professionalism, we collaborate closely with our clients to turn their real estate goals into reality. From project planning and development to final delivery, we focus on exceeding expectations and providing properties that offer comfort, value, and long-term satisfaction.'
        ]);

        if (!(await hasTable('about_stats'))) {
            await pool.query(`
                CREATE TABLE about_stats (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    slot TINYINT NOT NULL UNIQUE,
                    num VARCHAR(20) NOT NULL DEFAULT '',
                    label VARCHAR(255) NOT NULL DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Created about_stats');
        } else {
            console.log('⏭️  about_stats already exists');
        }

        const aboutStatsSeed = [
            [1, '20+', 'years of experience'],
            [2, '200+', 'projects have done'],
            [3, '7+', 'awards received'],
            [4, '15+', 'team members']
        ];
        for (const [slot, num, label] of aboutStatsSeed) {
            await pool.query(
                'INSERT IGNORE INTO about_stats (slot, num, label) VALUES (?, ?, ?)',
                [slot, num, label]
            );
        }

        if (!(await hasTable('services'))) {
            await pool.query(`
                CREATE TABLE services (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    slot TINYINT NOT NULL UNIQUE,
                    title VARCHAR(255) NOT NULL DEFAULT '',
                    description TEXT NOT NULL,
                    image_path VARCHAR(255) NOT NULL DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Created services');
        } else {
            console.log('⏭️  services already exists');
        }

        const servicesSeed = [
            [1, 'See more about our business', 'Our company specializes in buying and selling real estate with a focus on value and long-term investment.', '/images/service1.jpg'],
            [2, 'Take a look at our projects', 'Take a look at our projects and discover properties designed for value, quality, and long-term investment.', '/images/service2.jpg'],
            [3, 'Be confident to be one of our partner', 'Sell or buy properties from our company', '/images/service3_3.jpg']
        ];
        for (const [slot, title, description, image_path] of servicesSeed) {
            await pool.query(
                'INSERT IGNORE INTO services (slot, title, description, image_path) VALUES (?, ?, ?, ?)',
                [slot, title, description, image_path]
            );
        }

        if (!(await hasTable('footer_persons'))) {
            await pool.query(`
                CREATE TABLE footer_persons (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    slot TINYINT NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL DEFAULT '',
                    avatar_path VARCHAR(255) NOT NULL DEFAULT '',
                    email VARCHAR(255) NOT NULL DEFAULT '',
                    phone1 VARCHAR(50) NOT NULL DEFAULT '',
                    phone2 VARCHAR(50) NOT NULL DEFAULT '',
                    facebook_url VARCHAR(500) NOT NULL DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Created footer_persons');
        } else {
            console.log('⏭️  footer_persons already exists');
        }

        const footerSeed = [
            [1, 'Hoang Long', '/images/footer/Long.jpg', 'Leong@sealandproperty.com.au', '+61 432 285 678', '+84 905 160 805', 'https://www.facebook.com/longg1313'],
            [2, 'Tran Minh Phat (Jeremy)', '/images/footer/Phat.jpg', 'Jeremy@sealandproperty.com.au', '+61 45 246 7893', '+84 787665388', 'https://www.facebook.com/minhphat88']
        ];
        for (const [slot, name, avatar_path, email, phone1, phone2, facebook_url] of footerSeed) {
            await pool.query(
                'INSERT IGNORE INTO footer_persons (slot, name, avatar_path, email, phone1, phone2, facebook_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [slot, name, avatar_path, email, phone1, phone2, facebook_url]
            );
        }

        console.log('\n🎉 Migration hoàn tất.');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
