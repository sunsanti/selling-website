# F01 — Migration to single `uploads/` folder

## Feature

Move every file from `images/` (legacy + seed) into `uploads/`, flattening subfolders (`images/footer/Long.jpg` → `uploads/footer-Long.jpg` on collision-free path or `uploads/Long.jpg` if no collision). UPDATE every DB row whose `image_path`/`avatar_path`/setting_value still points at `/images/...` or a bare filename so it becomes `/uploads/...`. Drop the `app.use('/images', ...)` static mount. After F01, the codebase has exactly one image directory and one image path convention.

## Scope

**Full-stack** — file system + DB + server config — affected files:

- `config/migrate_to_uploads.js` — **new** (idempotent one-shot script)
- `app.js` — remove `/images` static mount
- `SETUP_GUIDE.md` — document the migration step in deploy/upgrade flow

## Implementation

> **Project constraints applied**: C4 (idempotent migration via `fs.existsSync` for files + `WHERE` clause filters for SQL), C5 (parameterized queries — though this migration uses `REPLACE()`/`CONCAT()` SQL functions on literals which are SQL-safe; no user input flows into the queries), C8 (image_path convention normalized to `/uploads/x.jpg` only).

### Step 1 — `config/migrate_to_uploads.js` (new)

```js
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
    const renameMap = {};   // legacyPath → newFilename
    for (const f of files) {
        // First try the original filename, then fall back to subfolder-prefixed.
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
        const finalName = path.basename(target);
        renameMap['/images/' + f.name] = '/uploads/' + finalName;
        if (f.prefixedName !== f.name) {
            // Also map the subfolder path (e.g., images/footer/Long.jpg)
            renameMap['/images/' + f.src.split(path.sep + 'images' + path.sep)[1].replace(/\\/g, '/')] = '/uploads/' + finalName;
        }
        console.log(`✅ Moved ${f.src} → ${target}`);
        moved++;
    }
    console.log(`\n📦 Moved ${moved} file(s), skipped ${skipped}.`);
    return renameMap;
}

async function rewriteSettings(conn) {
    // Both 'logo' and 'main_image' can hold /images/ paths or bare filenames.
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
        }
    }
}

async function rewriteColumn(conn, table, column) {
    // 1) /images/x → /uploads/x
    const [r1] = await conn.query(
        `UPDATE ${table} SET ${column} = REPLACE(${column}, '/images/', '/uploads/') ` +
        `WHERE ${column} LIKE '/images/%'`
    );
    // 2) bare filenames (no slash, no data:, not empty) → /uploads/x
    const [r2] = await conn.query(
        `UPDATE ${table} SET ${column} = CONCAT('/uploads/', ${column}) ` +
        `WHERE ${column} <> '' ` +
        `AND ${column} NOT LIKE '/uploads/%' ` +
        `AND ${column} NOT LIKE '/images/%' ` +
        `AND ${column} NOT LIKE 'data:%' ` +
        `AND ${column} NOT LIKE 'http%'`
    );
    console.log(`✅ ${table}.${column}: ${r1.affectedRows} prefix-rewrites, ${r2.affectedRows} bare-rewrites`);
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

        console.log('\n🎉 Migration hoàn tất. Remember to drop the /images mount from app.js if not already done.');
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exitCode = 1;
    } finally {
        conn.release();
        await pool.end();
    }
})();
```

### Step 2 — `app.js` (remove `/images` mount)

Find and **delete** this line:
```js
app.use('/images', express.static(path.join(__dirname, 'images')));
```

Keep `app.use('/uploads', ...)` as-is.

After the line is removed, the legacy `/images/...` URLs will 404. This is intentional — every DB row should already point at `/uploads/...` after Step 1's migration.

### Step 3 — `SETUP_GUIDE.md` (deploy note)

Append a section under existing setup steps:

```markdown
## Upgrading From The Two-Folder Layout

Versions before the media-library feature used a separate `images/` folder
for seed assets. To upgrade:

1. Stop the server (`pkill -f "node app"` or Ctrl+C).
2. Back up the database: `mysqldump sellingweb > backup.sql`
3. Run: `node config/migrate_to_uploads.js`
4. Pull / deploy the new code (which drops the `/images` Express mount).
5. Start the server.

The migration is idempotent — safe to re-run if interrupted.
```

### DB / KV Changes

- 5 tables get `image_path`/`avatar_path`/`setting_value` rewritten (no schema change, only data normalization)
- No new tables
- No new columns
- No new indexes
- `images/` directory is emptied (filesystem change; not under git for ignored content)

## Definition of Done

- [ ] `config/migrate_to_uploads.js` runs first time without error; prints `📦 Moved N file(s)` and per-table DB rewrite counts
- [ ] Re-running the script prints `⏭️ already in uploads/` or zero rewrites — proves idempotence
- [ ] After migration, `images/` folder is empty (or only contains files that legitimately had collisions, which the script logged)
- [ ] `SELECT setting_value FROM settings WHERE setting_key IN ('logo','main_image')` returns paths starting with `/uploads/`, `data:`, or empty
- [ ] `SELECT image_path FROM services` — all rows match `^/uploads/` or empty
- [ ] `SELECT avatar_path FROM footer_persons` — same
- [ ] `SELECT image_path FROM projects` — same
- [ ] `SELECT image_path FROM tableimages` — same
- [ ] `app.js` no longer contains the `/images` static mount; `node --check app.js` passes
- [ ] Server starts cleanly; `GET /main` returns 200 and renders images (they now load from `/uploads/`)
- [ ] `GET /images/anything.jpg` returns 404 (mount is gone — intentional)
- [ ] `SETUP_GUIDE.md` documents the upgrade procedure

## Test Checklist

1. **@happy** — clean migration on a fresh seed:
   ```bash
   # Reset to known state: run schema.sql + migrate_db_schema.js to get the seed
   mysql -u root -p sellingweb < config/schema.sql
   node config/migrate_db_schema.js
   # Now have /images/service1.jpg etc. in DB. Run migration:
   node config/migrate_to_uploads.js
   # Verify
   ls images/ | wc -l               # expect 0
   mysql -e "SELECT image_path FROM services" sellingweb   # all /uploads/
   ```

2. **@idempotent** — re-running is safe:
   ```bash
   node config/migrate_to_uploads.js   # should print 0 moved, 0 rewrites
   ```

3. **@subfolder-collision** — handle `images/footer/X.jpg` AND existing `uploads/X.jpg`:
   ```bash
   # Manually seed: create uploads/Long.jpg (same name as images/footer/Long.jpg)
   cp images/footer/Long.jpg uploads/Long.jpg
   node config/migrate_to_uploads.js
   # Expect: script logs "⏭️ Both Long.jpg and footer-Long.jpg already in uploads/" OR
   # creates uploads/footer-Long.jpg
   ```

4. **@db-bare-filename** — row with `image_path = 'service3.jpg'` becomes `/uploads/service3.jpg`:
   ```bash
   mysql -e "UPDATE settings SET setting_value = 'main.jpg' WHERE setting_key = 'main_image'" sellingweb
   node config/migrate_to_uploads.js
   mysql -e "SELECT setting_value FROM settings WHERE setting_key = 'main_image'" sellingweb
   # Expect: /uploads/main.jpg
   ```

5. **@server-renders** — after migration, public page still loads images:
   ```bash
   node app.js &
   curl -sI http://localhost:5500/uploads/main.jpg | head -1   # 200
   curl -sI http://localhost:5500/images/main.jpg | head -1    # 404 (mount removed)
   ```

6. **@data-url-preserved** — rows containing `data:image/...;base64,...` are not touched:
   ```sql
   -- Pre-state: insert dummy row with data: URL
   UPDATE services SET image_path = 'data:image/png;base64,iVBORw0KG...' WHERE slot = 1;
   -- Run migration
   -- Expect: that row is unchanged (skip due to NOT LIKE 'data:%')
   ```

7. **@http-url-preserved** — rows with full external URLs are not touched (e.g., a future avatar from gravatar):
   ```sql
   UPDATE footer_persons SET avatar_path = 'https://example.com/x.jpg' WHERE slot = 1;
   -- Run migration
   SELECT avatar_path FROM footer_persons WHERE slot = 1;   -- still https://...
   ```

## Files Created

| File | Lines (approx) |
|------|----------------|
| `config/migrate_to_uploads.js` | ~110 |

## Files Modified

| File | Change |
|------|--------|
| `app.js` | −1 line (the `/images` static mount) |
| `SETUP_GUIDE.md` | +~12 lines (upgrade procedure) |
