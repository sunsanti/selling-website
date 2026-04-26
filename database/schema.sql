-- Database: sellingweb
-- Run this SQL script to set up the required tables.
-- Run once: mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS sellingweb;
USE sellingweb;

-- =============================================
-- Table: users (admin login)
-- Default: username=admin, password=admin123
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

INSERT IGNORE INTO users (id, username, password) VALUES
(1, 'admin', 'admin123');

-- =============================================
-- Table: settings (website configuration)
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    logo_url VARCHAR(500) DEFAULT '',
    phone_number VARCHAR(50) DEFAULT '',
    main_image_url VARCHAR(500) DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO settings (id, logo_url, phone_number, main_image_url)
VALUES (1, '', '', '');

-- =============================================
-- Table: projects
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    size VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    year VARCHAR(10) NOT NULL,
    style VARCHAR(100) NOT NULL,
    description TEXT,
    region ENUM('sydney', 'melbourne', 'brisbane', 'goldcoast') NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO projects (name, size, category, year, style, description, region, image_url, display_order) VALUES
('QUANDUONG COMPLEX', '25', 'LIVING ROOM', '2024', 'MODERN', 'A 25m2 house designed to maximize every inch of space, offering comfort and practicality in a compact layout.', 'sydney', 'images/project1_1.jpg', 1),
('NGUYENTHIEN COMPLEX', '20', 'BEDROOM ROOM', '2025', 'MODERN', 'A cozy bedroom overlooking the stunning skyline of Sydney, offering a peaceful space to relax while enjoying the vibrant city view.', 'sydney', 'images/project2_2.jpg', 2),
('TUANANH COMPLEX', '30', 'LIVING ROOM', '2023', 'MODERN', 'A modern living room connected to a small private garden, bringing natural light and fresh air into the home.', 'melbourne', 'images/project3_3.jpg', 3),
('PHONG COMPLEX', '25', 'BEDROOM ROOM', '2025', 'MODERN', 'A comfortable bedroom facing the city center, offering a beautiful view of the vibrant skyline and urban lights.', 'brisbane', 'images/project4.jpg', 4);

-- =============================================
-- Table: contact_lists
-- =============================================
CREATE TABLE IF NOT EXISTS contact_lists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
