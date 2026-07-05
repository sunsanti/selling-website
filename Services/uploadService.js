const multer = require('multer');
const path = require('path');
const fs = require('fs');

let sharp;
try { sharp = require('sharp'); } catch (_) {}

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
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter
});

// Auto-compress images after upload. Videos and GIFs pass through unchanged.
const compressImageMiddleware = async (req, res, next) => {
    if (!sharp || !req.file || !req.file.mimetype.startsWith('image/')) return next();

    const filePath = req.file.path;
    const ext = path.extname(req.file.filename).toLowerCase();

    try {
        let pipeline = sharp(filePath).resize({
            width: 1920,
            height: 1920,
            fit: 'inside',
            withoutEnlargement: true
        });

        let buf;
        if (ext === '.jpg' || ext === '.jpeg') {
            buf = await pipeline.jpeg({ quality: 82 }).toBuffer();
        } else if (ext === '.png') {
            buf = await pipeline.png({ compressionLevel: 8 }).toBuffer();
        } else if (ext === '.webp') {
            buf = await pipeline.webp({ quality: 82 }).toBuffer();
        } else {
            return next();
        }

        fs.writeFileSync(filePath, buf);
        next();
    } catch (err) {
        console.error('sharp compress error:', err.message);
        next();
    }
};

module.exports = { upload, compressImageMiddleware };
