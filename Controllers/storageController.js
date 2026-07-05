const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const LIMIT_BYTES = 1500 * 1024 * 1024; // 1.5 GB

function uploadDirStats() {
    let totalBytes = 0;
    try {
        for (const f of fs.readdirSync(UPLOAD_DIR)) {
            try {
                const stat = fs.statSync(path.join(UPLOAD_DIR, f));
                if (stat.isFile()) totalBytes += stat.size;
            } catch (_) {}
        }
    } catch (_) {}
    return totalBytes;
}

// Collect all /uploads/<filename> references from a string (handles JSON blobs too)
function collectPaths(val, out) {
    if (!val) return;
    const re = /\/uploads\/([^?#\s"'<>]+)/g;
    let m;
    while ((m = re.exec(String(val))) !== null) {
        out.add(m[1]);
    }
}

// Middleware: reject upload if storage already at limit
const checkLimit = (req, res, next) => {
    try {
        if (uploadDirStats() >= LIMIT_BYTES) {
            return res.status(507).json({
                success: false,
                message: 'Dung lượng lưu trữ đã đạt giới hạn 1.5 GB. Vui lòng dọn dẹp file rác trước khi upload thêm.'
            });
        }
    } catch (_) {}
    next();
};

const getUsage = (req, res) => {
    try {
        const usedBytes = uploadDirStats();
        res.json({
            success: true,
            data: {
                used_bytes: usedBytes,
                used_mb: Math.round(usedBytes / 1024 / 1024 * 10) / 10,
                limit_bytes: LIMIT_BYTES,
                limit_mb: 1500,
                percent: Math.min(100, Math.round(usedBytes / LIMIT_BYTES * 100))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi đọc dung lượng' });
    }
};

const cleanup = async (req, res) => {
    try {
        const referenced = new Set();

        const [projects]  = await pool.query('SELECT image_path FROM projects');
        const [pImages]   = await pool.query('SELECT image_path FROM tableimages');
        const [newsList]  = await pool.query('SELECT cover_image FROM news');
        const [services]  = await pool.query('SELECT image_path FROM services');
        const [videos]    = await pool.query('SELECT thumbnail_path FROM videos');
        const [team]      = await pool.query('SELECT avatar_path FROM team_members');
        const [footer]    = await pool.query('SELECT avatar_path FROM footer_persons');
        const [settings]  = await pool.query('SELECT setting_value FROM settings');

        projects.forEach(r => collectPaths(r.image_path, referenced));
        pImages.forEach(r => collectPaths(r.image_path, referenced));
        newsList.forEach(r => collectPaths(r.cover_image, referenced));
        services.forEach(r => collectPaths(r.image_path, referenced));
        videos.forEach(r => collectPaths(r.thumbnail_path, referenced));
        team.forEach(r => collectPaths(r.avatar_path, referenced));
        footer.forEach(r => collectPaths(r.avatar_path, referenced));
        settings.forEach(r => collectPaths(r.setting_value, referenced));

        let deletedCount = 0, freedBytes = 0;

        for (const filename of fs.readdirSync(UPLOAD_DIR)) {
            if (filename === '.DS_Store') continue;
            if (referenced.has(filename)) continue;
            const filePath = path.join(UPLOAD_DIR, filename);
            try {
                const stat = fs.statSync(filePath);
                if (!stat.isFile()) continue;
                freedBytes += stat.size;
                fs.unlinkSync(filePath);
                deletedCount++;
            } catch (_) {}
        }

        res.json({
            success: true,
            data: {
                deleted_count: deletedCount,
                freed_bytes: freedBytes,
                freed_mb: Math.round(freedBytes / 1024 / 1024 * 10) / 10
            }
        });
    } catch (err) {
        console.error('storage cleanup error:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi dọn dẹp' });
    }
};

module.exports = { getUsage, cleanup, checkLimit };
