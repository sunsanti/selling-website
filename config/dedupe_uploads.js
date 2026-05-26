/**
 * Run once: node config/dedupe_uploads.js
 *
 * Finds duplicate files in uploads/ (same SHA-256), picks one canonical
 * file per group, rewrites every DB reference from a non-canonical file
 * to the canonical URL, then deletes the non-canonical files.
 *
 * Canonical pick rule per group:
 *   1. Most DB references (the file currently used the most).
 *   2. Tiebreak: oldest mtime (first uploaded — that's the "original").
 *   3. Final tiebreak: lexicographic filename.
 *
 * Safe + idempotent: second run finds zero duplicates and reports clean.
 * Skips non-image system files (.DS_Store, Thumbs.db).
 *
 * Run with the server STOPPED. Backup DB recommended.
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const pool = require('./database');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const IGNORE_NAMES = new Set(['.DS_Store', 'Thumbs.db', '.gitkeep']);

// All DB columns that may hold an image URL of the form /uploads/x.
// Each entry: { table, column, where? }
const IMAGE_COLUMNS = [
    { table: 'settings', column: 'setting_value', where: "setting_key IN ('logo', 'main_image')" },
    { table: 'services', column: 'image_path' },
    { table: 'footer_persons', column: 'avatar_path' },
    { table: 'projects', column: 'image_path' },
    { table: 'tableimages', column: 'image_path' }
];

function sha256(filepath) {
    const hash = crypto.createHash('sha256');
    const buf = fs.readFileSync(filepath);
    hash.update(buf);
    return hash.digest('hex');
}

async function countRefsForUrl(conn, url) {
    let total = 0;
    for (const c of IMAGE_COLUMNS) {
        const whereExtra = c.where ? ` AND ${c.where}` : '';
        const [rows] = await conn.query(
            `SELECT COUNT(*) AS n FROM ${c.table} WHERE ${c.column} = ?${whereExtra}`,
            [url]
        );
        total += rows[0].n;
    }
    return total;
}

async function rewriteRefs(conn, fromUrl, toUrl) {
    let affected = 0;
    for (const c of IMAGE_COLUMNS) {
        const whereExtra = c.where ? ` AND ${c.where}` : '';
        const [r] = await conn.query(
            `UPDATE ${c.table} SET ${c.column} = ? WHERE ${c.column} = ?${whereExtra}`,
            [toUrl, fromUrl]
        );
        if (r.affectedRows > 0) {
            console.log(`   ↳ ${c.table}.${c.column}: ${r.affectedRows} row(s) ${fromUrl} → ${toUrl}`);
            affected += r.affectedRows;
        }
    }
    return affected;
}

(async () => {
    const conn = await pool.getConnection();
    try {
        // 1. Hash every file in uploads/
        console.log('🔍 Scanning uploads/ ...');
        const entries = fs.readdirSync(UPLOADS_DIR);
        const files = entries
            .filter(n => !IGNORE_NAMES.has(n))
            .map(name => {
                const full = path.join(UPLOADS_DIR, name);
                const st = fs.statSync(full);
                if (!st.isFile()) return null;
                return { name, full, size: st.size, mtime: st.mtimeMs };
            })
            .filter(Boolean);

        console.log(`📦 Total candidate files: ${files.length}`);

        // 2. Group by hash
        const groups = new Map();   // hash → [file, file, ...]
        for (const f of files) {
            const h = sha256(f.full);
            if (!groups.has(h)) groups.set(h, []);
            groups.get(h).push(f);
        }

        const dupGroups = [...groups.values()].filter(g => g.length > 1);
        console.log(`🔁 Duplicate groups: ${dupGroups.length}`);

        if (dupGroups.length === 0) {
            console.log('✅ No duplicates found. Nothing to do.');
            return;
        }

        // 3. For each duplicate group, pick canonical, rewrite, delete
        let filesDeleted = 0;
        let dbRowsUpdated = 0;

        for (let i = 0; i < dupGroups.length; i++) {
            const group = dupGroups[i];
            console.log(`\n--- Group ${i + 1}/${dupGroups.length} (${group.length} files, ${group[0].size} bytes each) ---`);

            // Count DB refs for each
            const enriched = await Promise.all(group.map(async f => {
                const refs = await countRefsForUrl(conn, '/uploads/' + f.name);
                return { ...f, refs };
            }));

            // Sort: max refs first; then oldest mtime; then lex name
            enriched.sort((a, b) => {
                if (b.refs !== a.refs) return b.refs - a.refs;
                if (a.mtime !== b.mtime) return a.mtime - b.mtime;
                return a.name.localeCompare(b.name);
            });

            const canonical = enriched[0];
            console.log(`   👑 Canonical: ${canonical.name} (${canonical.refs} ref(s), mtime ${new Date(canonical.mtime).toISOString()})`);

            // Rewrite each non-canonical → canonical; delete file
            await conn.beginTransaction();
            try {
                for (const f of enriched.slice(1)) {
                    if (f.refs > 0) {
                        const n = await rewriteRefs(conn, '/uploads/' + f.name, '/uploads/' + canonical.name);
                        dbRowsUpdated += n;
                    } else {
                        console.log(`   ↳ ${f.name}: 0 refs (just delete file)`);
                    }
                    fs.unlinkSync(f.full);
                    console.log(`   🗑️  Deleted ${f.name}`);
                    filesDeleted++;
                }
                await conn.commit();
            } catch (txErr) {
                await conn.rollback();
                console.error(`   ❌ Transaction rolled back: ${txErr.message}`);
                throw txErr;
            }
        }

        console.log(`\n🎉 Done. Deleted ${filesDeleted} duplicate file(s); rewrote ${dbRowsUpdated} DB row(s).`);
    } catch (err) {
        console.error('❌ Dedupe error:', err);
        process.exitCode = 1;
    } finally {
        conn.release();
        await pool.end();
    }
})();
