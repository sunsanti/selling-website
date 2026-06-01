/**
 * Run: node config/migrate_db_schema.js [--reset]
 *
 * Mặc định (không flag):
 *   - Nếu table CHƯA tồn tại → CREATE + seed default data
 *   - Nếu table ĐÃ tồn tại  → fetch row count + sample data
 *
 * Với --reset (HOẶC --fresh):
 *   - DROP TẤT CẢ table trong DB hiện tại (kể cả table cũ ngoài 10 table của app)
 *   - Recreate sạch + seed default
 *   - ⚠️  XÓA HẾT DATA — chỉ dùng cho dev/setup mới
 *
 * Idempotent: chạy nhiều lần an toàn (không flag).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('./database');

const RESET = process.argv.includes('--reset') || process.argv.includes('--fresh');

// ============================================================
// TABLE DEFINITIONS
// ============================================================
const TABLES = [
    {
        name: 'settings',
        create: `
            CREATE TABLE settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) NOT NULL UNIQUE,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `,
        seed: [
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['logo', 'LOGO']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['phone', 'phone number']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['main_image', 'service3.jpg']]
        ],
        summaryCols: ['setting_key', 'setting_value']
    },

    {
        name: 'projects',
        create: `
            CREATE TABLE projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                area VARCHAR(50) NOT NULL COMMENT 'sydney/melbourne/brisbane/goldcoast',
                square_meters INT,
                category VARCHAR(100),
                year INT,
                style VARCHAR(100),
                small_content TEXT,
                image_path VARCHAR(255),
                status ENUM('active','inactive') DEFAULT 'active',
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_projects_area_status (area, status),
                INDEX idx_projects_display_order (display_order)
            )
        `,
        seed: [],
        summaryCols: ['id', 'name', 'area', 'status']
    },

    {
        name: 'tableimages',
        create: `
            CREATE TABLE tableimages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                image_path VARCHAR(255) NOT NULL,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tableimages_project_id (project_id),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        `,
        seed: [],
        summaryCols: ['id', 'project_id', 'image_path']
    },

    {
        name: 'contacts',
        create: `
            CREATE TABLE contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_contacts_email (email),
                INDEX idx_contacts_created_at (created_at)
            )
        `,
        seed: [],
        summaryCols: ['id', 'name', 'phone', 'email']
    },

    {
        name: 'accounts',
        create: `
            CREATE TABLE accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role ENUM('admin','employee') DEFAULT 'employee',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        seed: [
            [
                'INSERT IGNORE INTO accounts (username, password, name, role) VALUES (?, ?, ?, ?)',
                ['admin', '$2b$10$yfdejtIDbvDGhuudguCFVOZTBz.U1EC0vDNZ1LNmsURHW7vEutvQa', 'Administrator', 'admin']
            ]
        ],
        summaryCols: ['id', 'username', 'name', 'role']
    },

    {
        name: 'about_section',
        create: `
            CREATE TABLE about_section (
                id INT PRIMARY KEY DEFAULT 1,
                banner TEXT NOT NULL,
                paragraph_left TEXT NOT NULL,
                paragraph_right TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CHECK (id = 1)
            )
        `,
        seed: [
            [
                'INSERT IGNORE INTO about_section (id, banner, paragraph_left, paragraph_right) VALUES (?, ?, ?, ?)',
                [
                    1,
                    'MANY BEAUTIFUL PLACES ARE WAITING FOR YOU TO SEE',
                    'We are a passionate real estate team dedicated to developing modern and sustainable properties that blend aesthetic design with practical functionality, creating high-quality living and working spaces that offer lasting value and reflect distinctive character.',
                    'With a strong commitment to quality and professionalism, we collaborate closely with our clients to turn their real estate goals into reality. From project planning and development to final delivery, we focus on exceeding expectations and providing properties that offer comfort, value, and long-term satisfaction.'
                ]
            ]
        ],
        summaryCols: ['id', 'banner']
    },

    {
        name: 'about_stats',
        create: `
            CREATE TABLE about_stats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slot TINYINT NOT NULL UNIQUE,
                num VARCHAR(20) NOT NULL DEFAULT '',
                label VARCHAR(255) NOT NULL DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `,
        seed: [
            ['INSERT IGNORE INTO about_stats (slot, num, label) VALUES (?, ?, ?)', [1, '20+', 'years of experience']],
            ['INSERT IGNORE INTO about_stats (slot, num, label) VALUES (?, ?, ?)', [2, '200+', 'projects have done']],
            ['INSERT IGNORE INTO about_stats (slot, num, label) VALUES (?, ?, ?)', [3, '7+', 'awards received']],
            ['INSERT IGNORE INTO about_stats (slot, num, label) VALUES (?, ?, ?)', [4, '15+', 'team members']]
        ],
        summaryCols: ['slot', 'num', 'label']
    },

    {
        name: 'services',
        create: `
            CREATE TABLE services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slot TINYINT NOT NULL UNIQUE,
                title VARCHAR(255) NOT NULL DEFAULT '',
                description TEXT NOT NULL,
                image_path VARCHAR(255) NOT NULL DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `,
        seed: [
            [
                'INSERT IGNORE INTO services (slot, title, description, image_path) VALUES (?, ?, ?, ?)',
                [1, 'See more about our business', 'Our company specializes in buying and selling real estate with a focus on value and long-term investment.', '/uploads/service1.jpg']
            ],
            [
                'INSERT IGNORE INTO services (slot, title, description, image_path) VALUES (?, ?, ?, ?)',
                [2, 'Take a look at our projects', 'Take a look at our projects and discover properties designed for value, quality, and long-term investment.', '/uploads/service2.jpg']
            ],
            [
                'INSERT IGNORE INTO services (slot, title, description, image_path) VALUES (?, ?, ?, ?)',
                [3, 'Be confident to be one of our partner', 'Sell or buy properties from our company', '/uploads/service3_3.jpg']
            ]
        ],
        summaryCols: ['slot', 'title']
    },

    {
        name: 'footer_persons',
        create: `
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
        `,
        seed: [
            [
                'INSERT IGNORE INTO footer_persons (slot, name, avatar_path, email, phone1, phone2, facebook_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [1, 'Hoang Long', '/uploads/footer-Long.jpg', 'Leong@sealandproperty.com.au', '+61 432 285 678', '+84 905 160 805', 'https://www.facebook.com/longg1313']
            ],
            [
                'INSERT IGNORE INTO footer_persons (slot, name, avatar_path, email, phone1, phone2, facebook_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [2, 'Tran Minh Phat (Jeremy)', '/uploads/footer-Phat.jpg', 'Jeremy@sealandproperty.com.au', '+61 45 246 7893', '+84 787665388', 'https://www.facebook.com/minhphat88']
            ]
        ],
        summaryCols: ['slot', 'name', 'email']
    },

    {
        name: 'audit_log',
        create: `
            CREATE TABLE audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                username VARCHAR(50),
                action VARCHAR(64) NOT NULL,
                target_type VARCHAR(50),
                target_id INT,
                details TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_audit_created (created_at DESC),
                INDEX idx_audit_user (user_id, created_at DESC),
                INDEX idx_audit_target (target_type, target_id)
            )
        `,
        seed: [],
        summaryCols: ['id', 'username', 'action', 'target_type', 'created_at']
    }
];

// ============================================================
// HELPERS
// ============================================================
async function hasTable(name) {
    const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
        [name]
    );
    return rows.length > 0;
}

async function rowCount(name) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS n FROM \`${name}\``);
    return rows[0].n;
}

async function processTable(t) {
    if (!(await hasTable(t.name))) {
        await pool.query(t.create);
        console.log(`✅ Created \`${t.name}\``);

        let seeded = 0;
        for (const [sql, params] of t.seed) {
            const [r] = await pool.query(sql, params);
            seeded += r.affectedRows;
        }
        if (seeded > 0) console.log(`   ↳ Seeded ${seeded} row(s)`);
    } else {
        const count = await rowCount(t.name);
        console.log(`⏭️  \`${t.name}\` exists — ${count} row(s)`);

        if (count > 0 && t.summaryCols && t.summaryCols.length) {
            const cols = t.summaryCols.map(c => `\`${c}\``).join(', ');
            const [rows] = await pool.query(
                `SELECT ${cols} FROM \`${t.name}\` ORDER BY id DESC LIMIT 3`
            );
            console.table(rows);
        }
    }
}

async function dropAllTables() {
    const [rows] = await pool.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()`
    );
    if (rows.length === 0) {
        console.log('   (no tables to drop)');
        return;
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
        for (const r of rows) {
            const name = r.TABLE_NAME;
            await pool.query(`DROP TABLE IF EXISTS \`${name}\``);
            console.log(`   🗑️  Dropped \`${name}\``);
        }
    } finally {
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    console.log(`   Dropped ${rows.length} table(s).`);
}

// ============================================================
// MAIN
// ============================================================
(async () => {
    try {
        if (RESET) {
            console.log('⚠️  --reset mode: dropping ALL tables in current database\n');
            await dropAllTables();
            console.log('\n🔨 Creating fresh schema...\n');
        } else {
            console.log('🔍 Checking schema...\n');
        }

        // FK-aware order: parents before children. tableimages references projects.
        for (const t of TABLES) {
            await processTable(t);
        }

        console.log('\n🎉 Migration hoàn tất.');
    } catch (err) {
        console.error('\n❌ Migration error:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
