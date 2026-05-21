-- =============================================
-- MIGRATION: Add name and role columns to accounts table
-- Run this in MySQL to update existing database
-- =============================================

USE sellingweb;

-- Add name column if not exists
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'User' AFTER password;

-- Add role column if not exists
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role ENUM('admin', 'employee') DEFAULT 'employee' AFTER name;

-- Update existing admin account with name
UPDATE accounts SET name = 'Administrator', role = 'admin' WHERE username = 'admin';

-- Verify
DESCRIBE accounts;
SELECT id, username, name, role, created_at FROM accounts;
