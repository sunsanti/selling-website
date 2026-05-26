/**
 * One-shot migration: merge images/ → uploads/ and rewrite DB image paths.
 *
 *   node config/migrate_to_uploads.js
 *
 * Idempotent: skips files whose destination already exists, skips DB rows
 * already pointing at /uploads/ or starting with data:.
 *
 * Run with the server STOPPED to avoid racing on concurrent uploads,
 * and after backing up the DB.
 */
const fs = require('fs');
const path = require('path');
const pool = require('./database');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function walk(dir, prefix = '') {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walk(full, prefix + entry.name + '-'));
        } else if (entry.isFile()) {
            out.push({ src: full, name: entry.name, prefixedName: prefix + entry.name });
        }
    }
    return out;
}

async function moveFiles() {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const files = walk(IMAGES_DIR);
    let moved = 0, skipped = 0;
    for (const f of files) {
        // First try original filename, fall back to subfolder-prefixed name on collision.
        let target = path.join(UPLOADS_DIR, f.name);
        if (fs.existsSync(target)) {
            const alt = path.join(UPLOADS_DIR, f.prefixedName);
            if (fs.existsSync(alt)) {
                console.log(`⏭️  Both ${f.name} and ${f.prefixedName} already in uploads/ — skipping ${f.src}`);
                skipped++;
                continue;
            }
            target = alt;
        }
        fs.renameSync(f.src, target);
        console.log(`✅ Moved ${f.src} → ${target}`);
        moved++;
    }
    console.log(`\n📦 Moved ${moved} file(s), skipped ${skipped}.`);
}

async function rewriteSettings(conn) {
    for (const key of ['logo', 'main_image']) {
        const [rows] = await conn.query(
            'SELECT setting_value FROM settings WHERE setting_key = ?',
            [key]
        );
        if (rows.length === 0) continue;
        const cur = rows[0].setting_value || '';
        let next = cur;
        if (cur.startsWith('/images/')) {
            next = cur.replace('/images/', '/uploads/');
        } else if (cur && !cur.startsWith('/uploads/') && !cur.startsWith('data:') && !cur.startsWith('http')) {
            next = '/uploads/' + cur;
        }
        if (next !== cur) {
            await conn.query(
                'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
                [next, key]
            );
            console.log(`✅ settings.${key}: "${cur}" → "${next}"`);
        } else {
            console.log(`⏭️  settings.${key} already canonical: "${cur}"`);
        }
    }
}

async function rewriteColumn(conn, table, column) {
    const [r1] = await conn.query(
        `UPDATE ${table} SET ${column} = REPLACE(${column}, '/images/', '/uploads/') ` +
        `WHERE ${column} LIKE '/images/%'`
    );
    const [r2] = await conn.query(
        `UPDATE ${table} SET ${column} = CONCAT('/uploads/', ${column}) ` +
        `WHERE ${column} <> '' ` +
        `AND ${column} NOT LIKE '/uploads/%' ` +
        `AND ${column} NOT LIKE '/images/%' ` +
        `AND ${column} NOT LIKE 'data:%' ` +
        `AND ${column} NOT LIKE 'http%'`
    );
    // Files were flattened during move (uploads/footer/Long.jpg → uploads/Long.jpg)
    // so strip any subfolder remnant from the URL too. Matches '/uploads/<sub>/<name>'
    // and rewrites to '/uploads/<name>'. Idempotent (skips if already flat).
    const [r3] = await conn.query(
        `UPDATE ${table} SET ${column} = CONCAT('/uploads/', SUBSTRING_INDEX(${column}, '/', -1)) ` +
        `WHERE ${column} LIKE '/uploads/%/%'`
    );
    console.log(`✅ ${table}.${column}: ${r1.affectedRows} prefix-rewrites, ${r2.affectedRows} bare-rewrites, ${r3.affectedRows} subfolder-flatten`);
}

(async () => {
    const conn = await pool.getConnection();
    try {
        console.log('--- File move ---');
        await moveFiles();

        console.log('\n--- DB rewrite ---');
        await rewriteSettings(conn);
        await rewriteColumn(conn, 'services', 'image_path');
        await rewriteColumn(conn, 'footer_persons', 'avatar_path');
        await rewriteColumn(conn, 'projects', 'image_path');
        await rewriteColumn(conn, 'tableimages', 'image_path');

        console.log('\n🎉 Migration hoàn tất. Drop /images mount from app.js if not already done.');
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exitCode = 1;
    } finally {
        conn.release();
        await pool.end();
    }
})();
