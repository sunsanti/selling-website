-- =============================================
-- DATABASE SCHEMA FOR SELLING WEBSITE
-- Run this in MySQL to create all tables
-- =============================================

CREATE DATABASE IF NOT EXISTS sellingweb;
USE sellingweb;

-- ----------------------------
-- 1. USERS TABLE (existing)
-- ----------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------
-- 2. SETTINGS TABLE (logo, phone, main image)
-- ----------------------------
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
('logo', 'LOGO'),
('phone', 'phone number'),
('main_image', 'service3.jpg');

-- ----------------------------
-- 3. PROJECTS TABLE
-- ----------------------------
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area VARCHAR(50) NOT NULL COMMENT 'Sydney, Melbourne, Brisbane, Goldcoast',
    square_meters INT,
    category VARCHAR(100),
    year INT,
    style VARCHAR(100),
    small_content TEXT,
    image_path VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------
-- 3b. PROJECT IMAGES TABLE (one row per image, linked to project)
-- ----------------------------
CREATE TABLE IF NOT EXISTS tableimages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Insert default project images
INSERT IGNORE INTO tableimages (project_id, image_path, display_order) VALUES
(1, 'project1_1.jpg', 1),
(1, 'project1.jpg', 2),
(1, 'project3.jpg', 3),
(2, 'project2_2.jpg', 1),
(2, 'project2.jpg', 2),
(2, 'project4.jpg', 3),
(3, 'project3_3.jpg', 1),
(3, 'project1.jpg', 2),
(3, 'project2.jpg', 3),
(4, 'project4.jpg', 1),
(4, 'project3.jpg', 2),
(4, 'project1_1.jpg', 3);

-- Insert default projects (keep image_path for backward compatibility, tableimages has full data)
INSERT IGNORE INTO projects (name, area, square_meters, category, year, style, small_content, image_path, status, display_order) VALUES
('QUANDUONG COMPLEX', 'sydney', 25, 'LIVING ROOM', 2024, 'MODERN', 'A 25m² house designed to maximize every inch of space, offering comfort and practicality in a compact layout. Despite its small size, it provides all the essential amenities for modern and convenient living.', 'project1_1.jpg', 'active', 1),
('NGUYENTHIEN COMPLEX', 'melbourne', 20, 'BEDROOM ROOM', 2025, 'MODERN', 'A cozy bedroom overlooking the stunning skyline of Sydney, offering a peaceful space to relax while enjoying the vibrant city view. Designed with comfort and style, it creates a perfect balance between modern living and urban scenery.', 'project2_2.jpg', 'active', 2),
('TUANANH COMPLEX', 'brisbane', 30, 'LIVING ROOM', 2023, 'MODERN', 'A modern living room connected to a small private garden, bringing natural light and fresh air into the home. This relaxing space blends indoor comfort with a touch of greenery, creating a calm and inviting atmosphere.', 'project3_3.jpg', 'active', 3),
('PHONG COMPLEX', 'goldcoast', 25, 'BEDROOM ROOM', 2025, 'MODERN', 'A comfortable bedroom facing the city center, offering a beautiful view of the vibrant skyline and urban lights. Designed to provide a relaxing space while staying connected to the energy of the city.', 'project4.jpg', 'active', 4);

-- ----------------------------
-- 4. CONTACTS TABLE (from contact form)
-- ----------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------
-- 5. ACCOUNTS TABLE (employees)
-- ----------------------------
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin account
INSERT IGNORE INTO accounts (username, password) VALUES
('admin', 'admin123');
