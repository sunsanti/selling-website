# Selling Website - Setup Guide

## Database Setup

### 1. Create Database Schema

Run the SQL file in MySQL:

```bash
mysql -u root -p < config/schema.sql
```

Or import `config/schema.sql` via phpMyAdmin / MySQL Workbench.

### 2. Migration for Existing Database

If you already have a database and just need to add the new columns:

```bash
mysql -u root -p sellingweb < config/migrate_account_name_role.sql
```

This will:
- Add `name` column to accounts table
- Add `role` column to accounts table
- Update existing admin account with name "Administrator" and role "admin"

---

## Google Translate API Setup (Optional)

### 1. Get a Google Cloud API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > Library**
4. Search for and enable **Cloud Translation API**
5. Go to **APIs & Services > Credentials**
6. Click **Create Credentials > API Key**
7. Copy the generated API key

### 2. Set Environment Variable

Set the API key as an environment variable before starting the server:

**Windows (PowerShell):**
```powershell
$env:GOOGLE_TRANSLATE_API_KEY="your-api-key-here"
node app.js
```

**Windows (CMD):**
```cmd
set GOOGLE_TRANSLATE_API_KEY=your-api-key-here
node app.js
```

**Or create a `.env` file (optional - install dotenv package):**
```
GOOGLE_TRANSLATE_API_KEY=your-api-key-here
```

### 3. Free Tier Limits

- 500,000 characters/month **free**
- Supports: English, Vietnamese, Chinese, Japanese, Korean, French, German, Spanish, Thai, and more

### 4. How Translation Works in Admin Panel

When editing a project in the admin panel, each text field (Name, Small Content) has **translate buttons**:
- **EN** - Translate to English
- **ZH** - Translate to Chinese (Simplified)
- **JA** - Translate to Japanese

Click a button to translate the field content using Google Translate API.

---

## Running the Project

```bash
# Install dependencies (if not already)
npm install

# Start the server
node app.js

# Server runs at http://localhost:5500/login
```

### Default Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Name:** `Administrator`
- **Role:** `admin`

---

## Features Overview

| Feature | Status |
|---------|--------|
| Add name to Account | ✅ Done |
| Role-based accounts (admin/employee) | ✅ Done |
| Google Translate API | ✅ Done |
| Responsive design improvements | ✅ Done |
| Footer design improvements | ✅ Done |
