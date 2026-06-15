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
            // v23 — full snapshot of current settings (38 keys)
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['logo', '/uploads/1779806261352-521765523.jpg']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['phone', '999']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['main_image', '/uploads/1779806261352-521765523.jpg']],
            // F06 — Purpose-Invest video keys
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_video_url', '/uploads/1781444338485-487224072.mp4']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_video_thumbnail', '/uploads/1779791405552-226752425.jpg']],
            // v11 — Footer dynamic content
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['footer_desc', 'Helping investors and homeowners across Australia build long-term wealth through trusted real-estate guidance.']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['footer_address', 'Level 12, 1 Market Street, Sydney NSW 2000, Australia']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['footer_facebook_url', '']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['footer_linkedin_url', '']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['footer_youtube_url', '']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['footer_tiktok_url', '']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['footer_copyright', '© 2026 Sealand Property | Made By TAOWORK']],
            // v12 — /about page editable content
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_hero_tag', 'SEALAND PROPERTY']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_hero_title', 'ABOUT US']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_mission', 'Our core mission is to become a trusted agency for buyers, sellers and investors looking to achieve property ownership in Australia — connecting people, knowledge and opportunity across Sydney, Melbourne, Brisbane and the Gold Coast.']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_office_sydney_address', 'Level 20, 135 King Street, Sydney NSW 2000']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_office_sydney_phone', '+61 432 285 678']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_office_sydney_email', 'hello@sealandproperty.com.au']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_office_hcm_address', 'Level 18, 72 Le Thanh Ton, Ben Nghe Ward, District 1, HCMC']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_office_hcm_phone', '+84 905 160 805']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_office_hcm_email', 'vn@sealandproperty.com.au']],
            // v13 — /about Our Services (3 cards)
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_1_icon', 'fa-house-chimney']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_1_title', 'Real Estate Consultation & Brokerage']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_1_desc', 'Buyer agent advisory, off-the-plan apartments, established homes and investment-grade properties — independent advice grounded in market data.']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_2_icon', 'fa-scale-balanced']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_2_title', 'Legal & Financial Services Support']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_2_desc', 'Conveyancing referrals, mortgage broker introductions, FIRB compliance and finance structuring for overseas investors.']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_3_icon', 'fa-suitcase-rolling']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_3_title', 'Resettlement Assistance']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['about_service_3_desc', 'Settling-in support for overseas families relocating to Australia — schools, neighbourhoods, banking, healthcare and post-purchase management.']],
            // v14 — /main "Why Invest in Australia" (Purpose-Invest) section content
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_tagline', 'WHY INVEST IN AUSTRALIA']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_heading', 'A Strong Market.\nA Brighter Future.']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_list_1', 'Stable economy and secure legal system']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_list_2', 'High rental demand and low vacancy rates']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_list_3', 'Capital growth in key locations']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_list_4', 'Foreign ownership opportunities']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_cta_text', 'LEARN MORE ABOUT AUSTRALIA']],
            ['INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['purpose_video_caption', "Discover why Australia is one of the world's most trusted property markets."]]
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
                price VARCHAR(50) NOT NULL DEFAULT '',
                beds VARCHAR(20) NOT NULL DEFAULT '',
                baths VARCHAR(20) NOT NULL DEFAULT '',
                cars VARCHAR(20) NOT NULL DEFAULT '',
                address VARCHAR(255) NOT NULL DEFAULT '',
                state VARCHAR(20) NOT NULL DEFAULT '',
                property_type VARCHAR(50) NOT NULL DEFAULT '',
                area_label VARCHAR(100) NOT NULL DEFAULT '',
                is_featured TINYINT(1) NOT NULL DEFAULT 0,
                INDEX idx_projects_area_status (area, status),
                INDEX idx_projects_display_order (display_order),
                INDEX idx_projects_featured (is_featured)
            )
        `,
        seed: [
            // v23 — full snapshot of current projects (ids preserved for tableimages FK)
            ['INSERT IGNORE INTO projects (id, name, area, square_meters, category, year, style, small_content, image_path, status, display_order, price, beds, baths, cars, address, state, property_type, area_label, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [8, 'Botanica Test', 'sydney', 75, 'Apartment', 2026, 'Modern', 'yet so', '/uploads/service1.jpg', 'active', 1, 'From $999,000', '2-3', '2', '1', '99 Smoke Test Ave, Sydney', 'NSW', 'apartment', 'SYDNEY', 1]],
            ['INSERT IGNORE INTO projects (id, name, area, square_meters, category, year, style, small_content, image_path, status, display_order, price, beds, baths, cars, address, state, property_type, area_label, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [9, 'Test', 'sydney', 20, 'Apartment', 2026, 'Modern', 'I just want to say I just want to sayI just want to say I just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to sayI just want to say', '/uploads/project2.jpg', 'active', 2, 'From $200,000', '10', '1', '1', 'abc', 'WA', 'apartment', 'SYDNEY', 0]],
            ['INSERT IGNORE INTO projects (id, name, area, square_meters, category, year, style, small_content, image_path, status, display_order, price, beds, baths, cars, address, state, property_type, area_label, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [10, 'test2', 'melbourne', 30, 'LIVING ROOM', 2025, 'MODERN', 'Best in AUS', '/uploads/project1.jpg', 'active', 0, 'From $200,000', '2', '3', '1', 'address here', 'TAS', 'townhouse', 'MELBOURNE', 1]],
            ['INSERT IGNORE INTO projects (id, name, area, square_meters, category, year, style, small_content, image_path, status, display_order, price, beds, baths, cars, address, state, property_type, area_label, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [11, 'test3', 'goldcoast', 25, 'Apartment', 2020, 'MODERN', 'Testing here\n', '/uploads/service3_3.jpg', 'active', 0, 'From $600,000', '2', '1', '1', 'address here2', 'SA', 'house', 'GOLD COAST', 1]],
            ['INSERT IGNORE INTO projects (id, name, area, square_meters, category, year, style, small_content, image_path, status, display_order, price, beds, baths, cars, address, state, property_type, area_label, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [12, 'test4', 'brisbane', 20, 'BEDROOM ROOM', 2025, 'MODERN', '', '/uploads/service3_3.jpg', 'active', 0, 'From $600,000', '2', '1', '2', 'address here3', 'WA', 'house', 'BRISBANE', 1]]
        ],
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
        seed: [
            // v23 — full snapshot of current tableimages (FK → projects ids 8-12 above)
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [1, 8, '/uploads/service1.jpg', 1]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [2, 8, '/uploads/service2.jpg', 2]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [3, 8, '/uploads/service3_3.jpg', 3]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [4, 8, '/uploads/main_image.jpg', 4]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [5, 9, '/uploads/project2.jpg', 1]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [6, 9, '/uploads/project1_1.jpg', 2]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [7, 9, '/uploads/project1.jpg', 3]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [8, 10, '/uploads/project1.jpg', 1]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [9, 10, '/uploads/main_image.jpg', 2]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [10, 10, '/uploads/fillinfo.jpg', 3]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [11, 10, '/uploads/project4.jpg', 4]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [12, 11, '/uploads/service3_3.jpg', 1]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [13, 11, '/uploads/service2.jpg', 2]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [14, 11, '/uploads/service1.jpg', 3]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [15, 11, '/uploads/main_image.jpg', 4]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [16, 12, '/uploads/service3_3.jpg', 1]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [17, 12, '/uploads/project1_1.jpg', 2]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [18, 12, '/uploads/project1.jpg', 3]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [19, 12, '/uploads/main_image.jpg', 4]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [20, 12, '/uploads/service1.jpg', 5]],
            ['INSERT IGNORE INTO tableimages (id, project_id, image_path, display_order) VALUES (?, ?, ?, ?)', [21, 12, '/uploads/project3.jpg', 6]]
        ],
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
            // v23 — full snapshot of current accounts
            [
                'INSERT IGNORE INTO accounts (username, password, name, role) VALUES (?, ?, ?, ?)',
                ['admin', '$2b$10$UVY54S1hF/8DRTTBYhHWzexIAszIGxu52XYb.KXQnwd3ALRUyMlCe', 'Administrator', 'admin']
            ],
            [
                'INSERT IGNORE INTO accounts (username, password, name, role) VALUES (?, ?, ?, ?)',
                ['test', '$2b$10$SgDZ0AgCRdiCU.0rU78o3OaYG68B8AKz/U3qsjAbg6SNeGN7oPWcO', 'Employee', 'employee']
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
            // v23 — full snapshot of current about_section (cleared by admin)
            [
                'INSERT IGNORE INTO about_section (id, banner, paragraph_left, paragraph_right) VALUES (?, ?, ?, ?)',
                [1, '', '', '']
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
            // v23 — full snapshot of current about_stats (admin-edited)
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                icon VARCHAR(50) NOT NULL DEFAULT ''
            )
        `,
        seed: [
            // v23 — full snapshot of current services (icon column included)
            [
                'INSERT IGNORE INTO services (slot, title, description, image_path, icon) VALUES (?, ?, ?, ?, ?)',
                [1, 'See more about our business', 'Our company specializes in buying and selling real estate with a focus on value and long-term investment.', '/uploads/service1.jpg', 'fa-house']
            ],
            [
                'INSERT IGNORE INTO services (slot, title, description, image_path, icon) VALUES (?, ?, ?, ?, ?)',
                [2, 'Take a look at our projects', 'Take a look at our projects and discover properties designed for value, quality, and long-term investment.', '/uploads/service2.jpg', 'fa-chart-line']
            ],
            [
                'INSERT IGNORE INTO services (slot, title, description, image_path, icon) VALUES (?, ?, ?, ?, ?)',
                [3, 'Be confident to be one of our partner', 'Sell or buy properties from our company', '/uploads/service3_3.jpg', 'fa-building']
            ],
            // F07: 2 more slots for 5-card grid (Loan & Finance + FIRB Support)
            [
                'INSERT IGNORE INTO services (slot, title, description, image_path, icon) VALUES (?, ?, ?, ?, ?)',
                [4, 'Loan & Finance', 'Connect with trusted mortgage brokers to secure your investment.', '', 'fa-hand-holding-dollar']
            ],
            [
                'INSERT IGNORE INTO services (slot, title, description, image_path, icon) VALUES (?, ?, ?, ?, ?)',
                [5, 'FIRB Support', 'We help overseas buyers comply with Foreign Investment Review Board rules.', '', 'fa-shield-halved']
            ]
        ],
        summaryCols: ['slot', 'title']
    },

    // F09: news table — articles + carousel + /news pages
    {
        name: 'news',
        create: `
            CREATE TABLE news (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                summary VARCHAR(500) NOT NULL DEFAULT '',
                content TEXT,
                cover_image VARCHAR(255) NOT NULL DEFAULT '',
                display_order INT DEFAULT 0,
                status ENUM('active','inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                external_url VARCHAR(500) NOT NULL DEFAULT '',
                is_featured TINYINT(1) NOT NULL DEFAULT 0,
                INDEX idx_news_status_order (status, display_order),
                INDEX idx_news_created (created_at DESC),
                INDEX idx_news_featured (is_featured)
            )
        `,
        seed: [
            // v23 — full snapshot of current news (external_url + is_featured included)
            ['INSERT IGNORE INTO news (id, title, summary, content, cover_image, display_order, external_url, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [1, 'THE ALBANESE GOVERNMENT WILL DELIVER NEW HOUSING POLICY',
                 'New federal policy expected to boost foreign investment in the Australian property market.',
                 'The Albanese government has announced a new national housing policy designed to stimulate foreign investment while protecting first-home buyers.\n\nThe policy includes simplified FIRB processes, additional incentives for build-to-rent developments, and stronger oversight of foreign ownership in residential markets.\n\nIndustry analysts expect the changes to take effect in the second half of 2026.',
                 '/uploads/main_image.jpg', 1, 'https://www.abc.net.au/news/test', 1]],
            ['INSERT IGNORE INTO news (id, title, summary, content, cover_image, display_order, external_url, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [2, 'SYDNEY HOUSE PRICES UP 8% IN Q1 2026',
                 'Sydney property market shows strong growth despite global headwinds and rising rates.',
                 'Sydney property prices rose 8% in the first quarter of 2026, outperforming all other capital cities. Key drivers include inner-city apartment demand, limited new supply, and renewed international migration.\n\nAnalysts predict continued growth through Q2.',
                 '/uploads/main_image.jpg', 2, '', 1]],
            ['INSERT IGNORE INTO news (id, title, summary, content, cover_image, display_order, external_url, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [3, 'FIRB UPDATES RULES FOR OVERSEAS BUYERS',
                 'New compliance requirements coming into effect July 2026 — what investors need to know.',
                 'The Foreign Investment Review Board has tightened compliance rules for overseas property buyers. Changes include mandatory pre-approval for off-the-plan apartments, stricter source-of-funds checks, and updated thresholds.\n\nContact our team for personalised advice.',
                 '/uploads/main_image.jpg', 3, '', 1]]
        ],
        summaryCols: ['id', 'title', 'status']
    },

    // F08: videos table — TikTok external link cards
    {
        name: 'videos',
        create: `
            CREATE TABLE videos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                thumbnail_path VARCHAR(255) NOT NULL DEFAULT '',
                tiktok_url VARCHAR(500) NOT NULL,
                views_count VARCHAR(20) NOT NULL DEFAULT '0',
                display_order INT DEFAULT 0,
                status ENUM('active','inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_featured TINYINT(1) NOT NULL DEFAULT 0,
                INDEX idx_videos_status_order (status, display_order),
                INDEX idx_videos_created (created_at DESC),
                INDEX idx_videos_featured (is_featured)
            )
        `,
        seed: [
            // v23 — full snapshot of current videos (id=2 was removed by admin; is_featured included)
            ['INSERT IGNORE INTO videos (id, title, thumbnail_path, tiktok_url, views_count, display_order, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [1, 'SYDNEY MARKET UPDATE',   '/uploads/main_image.jpg', 'https://www.tiktok.com/@sealandproperty/video/1', '12.4K', 1, 1]],
            ['INSERT IGNORE INTO videos (id, title, thumbnail_path, tiktok_url, views_count, display_order, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [3, 'MELBOURNE INSIDE LOOK',  '/uploads/main_image.jpg', 'https://www.tiktok.com/@sealandproperty/video/3', '15.1K', 3, 1]]
        ],
        summaryCols: ['id', 'title', 'status']
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
            // v23 — full snapshot of current footer_persons (avatar_path updated)
            [
                'INSERT IGNORE INTO footer_persons (slot, name, avatar_path, email, phone1, phone2, facebook_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [1, 'Hoang Long', '/uploads/1777904991160-438175381.jpg', 'Leong@sealandproperty.com.au', '+61 432 285 678', '+84 905 160 805', 'https://www.facebook.com/longg1313']
            ],
            [
                'INSERT IGNORE INTO footer_persons (slot, name, avatar_path, email, phone1, phone2, facebook_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [2, 'Tran Minh Phat (Jeremy)', '/uploads/1777905362602-653637808.jpg', 'Jeremy@sealandproperty.com.au', '+61 45 246 7893', '+84 787665388', 'https://www.facebook.com/minhphat88']
            ]
        ],
        summaryCols: ['slot', 'name', 'email']
    },

    // v13 — /about page Our Team grid (6 fixed slots, mirrors footer_persons)
    {
        name: 'team_members',
        create: `
            CREATE TABLE team_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slot TINYINT NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL DEFAULT '',
                role VARCHAR(255) NOT NULL DEFAULT '',
                avatar_path VARCHAR(255) NOT NULL DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `,
        seed: [
            ['INSERT IGNORE INTO team_members (slot, name, role, avatar_path) VALUES (?, ?, ?, ?)', [1, 'Anh Tran',         'Office Manager',      '']],
            ['INSERT IGNORE INTO team_members (slot, name, role, avatar_path) VALUES (?, ?, ?, ?)', [2, 'Helen Nguyen',     'Marketing Manager',   '']],
            ['INSERT IGNORE INTO team_members (slot, name, role, avatar_path) VALUES (?, ?, ?, ?)', [3, 'Aley Nguyen',      'Creative Specialist', '']],
            ['INSERT IGNORE INTO team_members (slot, name, role, avatar_path) VALUES (?, ?, ?, ?)', [4, 'Anny Vu',          'Property Consultant', '']],
            ['INSERT IGNORE INTO team_members (slot, name, role, avatar_path) VALUES (?, ?, ?, ?)', [5, 'Lucas Doan',       'Property Consultant', '']],
            ['INSERT IGNORE INTO team_members (slot, name, role, avatar_path) VALUES (?, ?, ?, ?)', [6, 'Apollo Raymundo',  'Property Consultant', '']]
        ],
        summaryCols: ['slot', 'name', 'role']
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

// F05a: Idempotent ALTER for adding columns
async function hasColumn(table, column) {
    const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [table, column]
    );
    return rows.length > 0;
}

// F10.fix: normalize legacy /images/<file> and bare-filename media paths to /uploads/<file>
// — idempotent: skips rows already /uploads/, http(s)://, data:, or empty
async function normalizeMediaPaths() {
    const targets = [
        // [table, column, where-clause-for-filter]
        ['settings',       'setting_value', "WHERE setting_key IN ('logo','main_image','purpose_video_url','purpose_video_thumbnail')"],
        ['projects',       'image_path',    "WHERE image_path IS NOT NULL AND image_path != ''"],
        ['tableimages',    'image_path',    "WHERE image_path IS NOT NULL AND image_path != ''"],
        ['services',       'image_path',    "WHERE image_path IS NOT NULL AND image_path != ''"],
        ['news',           'cover_image',   "WHERE cover_image IS NOT NULL AND cover_image != ''"],
        ['videos',         'thumbnail_path',"WHERE thumbnail_path IS NOT NULL AND thumbnail_path != ''"],
        ['footer_persons', 'avatar_path',   "WHERE avatar_path IS NOT NULL AND avatar_path != ''"]
    ];
    // about_section banner column (older schemas may differ — wrap in try/catch)
    const optionalTargets = [
        ['about_section', 'banner', "WHERE banner IS NOT NULL AND banner != ''"]
    ];

    const toUploads = (v) => {
        if (!v) return v;
        const s = String(v);
        if (s.startsWith('/uploads/')) return s;
        if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
        if (s.startsWith('/images/')) return '/uploads/' + s.slice('/images/'.length);
        if (s.startsWith('/')) return s;          // already an absolute path we don't own — leave
        return '/uploads/' + s;                   // bare filename
    };

    for (const [t, col, where] of [...targets, ...optionalTargets]) {
        try {
            if (!(await hasTable(t))) continue;
            const pkCol = (t === 'settings') ? 'setting_key'
                        : (t === 'services' || t === 'footer_persons') ? 'slot'
                        : 'id';
            const [rows] = await pool.query(`SELECT ${pkCol}, ${col} FROM ${t} ${where}`);
            let fixed = 0;
            for (const r of rows) {
                const oldVal = r[col];
                const newVal = toUploads(oldVal);
                if (newVal !== oldVal) {
                    await pool.query(`UPDATE ${t} SET ${col} = ? WHERE ${pkCol} = ?`, [newVal, r[pkCol]]);
                    fixed++;
                }
            }
            console.log(`   ${fixed > 0 ? '✅' : '⏭️ '} ${t}.${col}: ${fixed} row(s) normalized`);
        } catch (e) {
            console.log(`   ⚠️  ${t}.${col}: skipped (${e.message})`);
        }
    }
}

// v2: idempotent ALTER for news.external_url + projects.is_featured
async function ensureNewsExternalUrl() {
    if (!(await hasTable('news'))) return;
    if (await hasColumn('news', 'external_url')) {
        console.log('   ⏭️  news.external_url already exists');
    } else {
        await pool.query("ALTER TABLE news ADD COLUMN external_url VARCHAR(500) NOT NULL DEFAULT ''");
        console.log('   ✅ Added news.external_url');
    }
}
async function ensureProjectFeatured() {
    if (!(await hasTable('projects'))) return;
    if (await hasColumn('projects', 'is_featured')) {
        console.log('   ⏭️  projects.is_featured already exists');
    } else {
        await pool.query("ALTER TABLE projects ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0, ADD INDEX idx_projects_featured (is_featured)");
        console.log('   ✅ Added projects.is_featured + index');
    }
}

// v3: idempotent ALTER for videos.is_featured + news.is_featured (replaces display_order on homepage)
async function ensureVideosFeatured() {
    if (!(await hasTable('videos'))) return;
    if (await hasColumn('videos', 'is_featured')) {
        console.log('   ⏭️  videos.is_featured already exists');
    } else {
        await pool.query("ALTER TABLE videos ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0, ADD INDEX idx_videos_featured (is_featured)");
        console.log('   ✅ Added videos.is_featured + index');
    }
}
async function ensureNewsFeatured() {
    if (!(await hasTable('news'))) return;
    if (await hasColumn('news', 'is_featured')) {
        console.log('   ⏭️  news.is_featured already exists');
    } else {
        await pool.query("ALTER TABLE news ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0, ADD INDEX idx_news_featured (is_featured)");
        console.log('   ✅ Added news.is_featured + index');
    }
}
// v2: idempotent ALTER for services.icon (font-awesome class) — replace image picker
async function ensureServiceIcon() {
    if (!(await hasTable('services'))) return;
    if (await hasColumn('services', 'icon')) {
        console.log('   ⏭️  services.icon already exists');
    } else {
        await pool.query("ALTER TABLE services ADD COLUMN icon VARCHAR(50) NOT NULL DEFAULT ''");
        console.log('   ✅ Added services.icon');
        // Seed default icons per slot (matches SERVICE_ICONS in render.js)
        const defaults = [
            [1, 'fa-key'], [2, 'fa-chart-line'], [3, 'fa-building'],
            [4, 'fa-hand-holding-dollar'], [5, 'fa-shield-halved']
        ];
        for (const [slot, icn] of defaults) {
            await pool.query('UPDATE services SET icon = ? WHERE slot = ? AND (icon IS NULL OR icon = "")', [icn, slot]);
        }
        console.log('   ✅ Seeded default icons for slots 1-5');
    }
}

// F07: idempotent top-up for service slots 4-5
async function ensureServiceSlots() {
    if (!(await hasTable('services'))) return;
    const slots = [
        [4, 'Loan & Finance',  'Connect with trusted mortgage brokers to secure your investment.'],
        [5, 'FIRB Support',    'We help overseas buyers comply with Foreign Investment Review Board rules.']
    ];
    for (const [slot, title, desc] of slots) {
        const [r] = await pool.query(
            'INSERT IGNORE INTO services (slot, title, description, image_path) VALUES (?, ?, ?, ?)',
            [slot, title, desc, '']
        );
        console.log(`   ${r.affectedRows ? '✅ Inserted' : '⏭️  Exists'} services.slot=${slot}`);
    }
}

// F06: idempotent top-up for settings rows that may be added after first install
async function ensureSettingsKeys() {
    if (!(await hasTable('settings'))) return;
    const keys = [
        ['purpose_video_url', ''],
        ['purpose_video_thumbnail', ''],
        // v11 — Footer dynamic content (editable in admin Dashboard tab)
        ['footer_desc', 'Helping investors and homeowners across Australia build long-term wealth through trusted real-estate guidance.'],
        ['footer_address', 'Level 12, 1 Market Street, Sydney NSW 2000, Australia'],
        ['footer_facebook_url', ''],
        ['footer_linkedin_url', ''],
        ['footer_youtube_url', ''],
        ['footer_tiktok_url', ''],
        ['footer_copyright', '© 2026 Sealand Property. All rights reserved.'],
        // v12 — /about page editable content
        ['about_hero_tag', 'SEALAND PROPERTY'],
        ['about_hero_title', 'ABOUT US'],
        ['about_mission', 'Our core mission is to become a trusted agency for buyers, sellers and investors looking to achieve property ownership in Australia — connecting people, knowledge and opportunity across Sydney, Melbourne, Brisbane and the Gold Coast.'],
        ['about_office_sydney_address', 'Level 20, 135 King Street, Sydney NSW 2000'],
        ['about_office_sydney_phone',   '+61 432 285 678'],
        ['about_office_sydney_email',   'hello@sealandproperty.com.au'],
        ['about_office_hcm_address',    'Level 18, 72 Le Thanh Ton, Ben Nghe Ward, District 1, HCMC'],
        ['about_office_hcm_phone',      '+84 905 160 805'],
        ['about_office_hcm_email',      'vn@sealandproperty.com.au'],
        // v13 — /about Our Services (3 cards)
        ['about_service_1_icon',  'fa-house-chimney'],
        ['about_service_1_title', 'Real Estate Consultation & Brokerage'],
        ['about_service_1_desc',  'Buyer agent advisory, off-the-plan apartments, established homes and investment-grade properties — independent advice grounded in market data.'],
        ['about_service_2_icon',  'fa-scale-balanced'],
        ['about_service_2_title', 'Legal & Financial Services Support'],
        ['about_service_2_desc',  'Conveyancing referrals, mortgage broker introductions, FIRB compliance and finance structuring for overseas investors.'],
        ['about_service_3_icon',  'fa-suitcase-rolling'],
        ['about_service_3_title', 'Resettlement Assistance'],
        ['about_service_3_desc',  'Settling-in support for overseas families relocating to Australia — schools, neighbourhoods, banking, healthcare and post-purchase management.'],
        // v14 — /main "Why Invest in Australia" (Purpose-Invest) section content
        ['purpose_tagline', 'WHY INVEST IN AUSTRALIA'],
        ['purpose_heading', 'A Strong Market.\nA Brighter Future.'],
        ['purpose_list_1', 'Stable economy and secure legal system'],
        ['purpose_list_2', 'High rental demand and low vacancy rates'],
        ['purpose_list_3', 'Capital growth in key locations'],
        ['purpose_list_4', 'Foreign ownership opportunities'],
        ['purpose_cta_text', 'LEARN MORE ABOUT AUSTRALIA'],
        ['purpose_video_caption', "Discover why Australia is one of the world's most trusted property markets."]
    ];
    for (const [k, v] of keys) {
        const [r] = await pool.query(
            'INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)',
            [k, v]
        );
        console.log(`   ${r.affectedRows ? '✅ Inserted' : '⏭️  Exists'} settings.${k}`);
    }
}

async function ensureProjectColumns() {
    if (!(await hasTable('projects'))) return;
    const cols = [
        ['price',         "VARCHAR(50) NOT NULL DEFAULT ''"],
        ['beds',          "VARCHAR(20) NOT NULL DEFAULT ''"],
        ['baths',         "VARCHAR(20) NOT NULL DEFAULT ''"],
        ['cars',          "VARCHAR(20) NOT NULL DEFAULT ''"],
        ['address',       "VARCHAR(255) NOT NULL DEFAULT ''"],
        ['state',         "VARCHAR(20) NOT NULL DEFAULT ''"],
        ['property_type', "VARCHAR(50) NOT NULL DEFAULT ''"],
        ['area_label',    "VARCHAR(100) NOT NULL DEFAULT ''"]
    ];
    for (const [name, type] of cols) {
        if (await hasColumn('projects', name)) {
            console.log(`   ⏭️  projects.${name} already exists`);
        } else {
            await pool.query(`ALTER TABLE projects ADD COLUMN ${name} ${type}`);
            console.log(`   ✅ Added projects.${name}`);
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

        // F05a: ensure projects has 8 extended columns (idempotent ALTER)
        console.log('\n🔧 Ensuring extended columns on projects...');
        await ensureProjectColumns();

        // F06: top-up settings keys for purpose-invest video
        console.log('\n🔧 Ensuring settings keys (F06 purpose-invest)...');
        await ensureSettingsKeys();

        // F07: top-up service slots 4-5 for 5-card grid
        console.log('\n🔧 Ensuring service slots (F07 5-card grid)...');
        await ensureServiceSlots();

        // v2: ALTER for news.external_url + projects.is_featured + services.icon
        console.log('\n🔧 v2: extending news / projects / services schema...');
        await ensureNewsExternalUrl();
        await ensureProjectFeatured();
        await ensureServiceIcon();

        // v3: ALTER for videos.is_featured + news.is_featured (Featured-on-Homepage panels)
        console.log('\n🔧 v3: adding videos.is_featured + news.is_featured...');
        await ensureVideosFeatured();
        await ensureNewsFeatured();

        // F10.fix: normalize all legacy /images/ + bare-filename media paths to /uploads/
        console.log('\n🔧 Normalizing media paths to /uploads/...');
        await normalizeMediaPaths();

        console.log('\n🎉 Migration hoàn tất.');
    } catch (err) {
        console.error('\n❌ Migration error:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
