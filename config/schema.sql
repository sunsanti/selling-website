-- =============================================
-- DATABASE SCHEMA FOR SELLING WEBSITE
-- Run this in MySQL to create all tables
-- =============================================

CREATE DATABASE IF NOT EXISTS sellingweb;
USE sellingweb;

-- ----------------------------
-- 1. SETTINGS TABLE (logo, phone, main image)
-- ----------------------------
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
('logo', 'LOGO'),
('phone', 'phone number'),
('main_image', '/uploads/service3.jpg');

-- ----------------------------
-- 2. PROJECTS TABLE
-- ----------------------------
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area VARCHAR(50) NOT NULL COMMENT 'Sydney, Melbourne, Brisbane, Goldcoast (legacy filter)',
    square_meters INT,
    category VARCHAR(100),
    year INT,
    style VARCHAR(100),
    small_content TEXT,
    image_path VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    display_order INT DEFAULT 0,
    -- F05a extended fields for Property Search Bar + premium card display
    price VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'e.g. From $699,000',
    beds VARCHAR(20) NOT NULL DEFAULT '',
    baths VARCHAR(20) NOT NULL DEFAULT '',
    cars VARCHAR(20) NOT NULL DEFAULT '',
    address VARCHAR(255) NOT NULL DEFAULT '',
    state VARCHAR(20) NOT NULL DEFAULT '' COMMENT 'NSW/VIC/QLD/... for search filter',
    property_type VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'apartment/house/townhouse/land',
    area_label VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'e.g. LIVERPOOL badge text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_projects_area_status (area, status),
    INDEX idx_projects_display_order (display_order),
    INDEX idx_projects_state_type (state, property_type)
);

-- ----------------------------
-- 2b. PROJECT IMAGES TABLE
-- ----------------------------
CREATE TABLE IF NOT EXISTS tableimages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tableimages_project_id (project_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ----------------------------
-- 3. CONTACTS TABLE (from contact form)
-- ----------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contacts_email (email),
    INDEX idx_contacts_created_at (created_at)
);

-- ----------------------------
-- 4. ACCOUNTS TABLE
-- ----------------------------
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee') DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin account (password: admin123, bcrypt rounds=10)
INSERT IGNORE INTO accounts (username, password, name, role) VALUES
('admin', '$2b$10$yfdejtIDbvDGhuudguCFVOZTBz.U1EC0vDNZ1LNmsURHW7vEutvQa', 'Administrator', 'admin');

-- ----------------------------
-- 5. ABOUT SECTION (single row, id=1)
-- ----------------------------
CREATE TABLE IF NOT EXISTS about_section (
    id INT PRIMARY KEY DEFAULT 1,
    banner TEXT NOT NULL,
    paragraph_left TEXT NOT NULL,
    paragraph_right TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (id = 1)
);

INSERT IGNORE INTO about_section (id, banner, paragraph_left, paragraph_right) VALUES
(1,
 'MANY BEAUTIFUL PLACES ARE WAITING FOR YOU TO SEE',
 'We are a passionate real estate team dedicated to developing modern and sustainable properties that blend aesthetic design with practical functionality, creating high-quality living and working spaces that offer lasting value and reflect distinctive character.',
 'With a strong commitment to quality and professionalism, we collaborate closely with our clients to turn their real estate goals into reality. From project planning and development to final delivery, we focus on exceeding expectations and providing properties that offer comfort, value, and long-term satisfaction.'
);

-- ----------------------------
-- 6. ABOUT STATS (4 slots)
-- ----------------------------
CREATE TABLE IF NOT EXISTS about_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot TINYINT NOT NULL UNIQUE,
    num VARCHAR(20) NOT NULL DEFAULT '',
    label VARCHAR(255) NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO about_stats (slot, num, label) VALUES
(1, '20+', 'years of experience'),
(2, '200+', 'projects have done'),
(3, '7+', 'awards received'),
(4, '15+', 'team members');

-- ----------------------------
-- 7. SERVICES (3 slots)
-- ----------------------------
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot TINYINT NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    image_path VARCHAR(255) NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO services (slot, title, description, image_path) VALUES
(1, 'See more about our business', 'Our company specializes in buying and selling real estate with a focus on value and long-term investment.', '/uploads/service1.jpg'),
(2, 'Take a look at our projects', 'Take a look at our projects and discover properties designed for value, quality, and long-term investment.', '/uploads/service2.jpg'),
(3, 'Be confident to be one of our partner', 'Sell or buy properties from our company', '/uploads/service3_3.jpg');

-- ----------------------------
-- 8. FOOTER PERSONS (2 slots)
-- ----------------------------
CREATE TABLE IF NOT EXISTS footer_persons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot TINYINT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL DEFAULT '',
    avatar_path VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone1 VARCHAR(50) NOT NULL DEFAULT '',
    phone2 VARCHAR(50) NOT NULL DEFAULT '',
    facebook_url VARCHAR(500) NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO footer_persons (slot, name, avatar_path, email, phone1, phone2, facebook_url) VALUES
(1, 'Hoang Long', '/uploads/footer-Long.jpg', 'Leong@sealandproperty.com.au', '+61 432 285 678', '+84 905 160 805', 'https://www.facebook.com/longg1313'),
(2, 'Tran Minh Phat (Jeremy)', '/uploads/footer-Phat.jpg', 'Jeremy@sealandproperty.com.au', '+61 45 246 7893', '+84 787665388', 'https://www.facebook.com/minhphat88');

-- ----------------------------
-- 9. AUDIT LOG
-- ----------------------------
CREATE TABLE IF NOT EXISTS audit_log (
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
);
