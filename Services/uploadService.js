const multer = require('multer');
const path = require('path');

const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, unique + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
        return cb(null, true);
    }
    cb(new Error('Chỉ chấp nhận ảnh (jpg, jpeg, png, webp, gif) hoặc video (mp4, webm, mov)'));
};

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter
});

module.exports = { upload };
