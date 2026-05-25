/**
 * Run once: node config/migrate_hash_passwords.js
 *
 * Hashes every plain-text password in the `accounts` table.
 * Detects bcrypt hashes by prefix ($2a$ / $2b$ / $2y$) and skips them,
 * so the script is idempotent — safe to re-run.
 */
const bcrypt = require('bcrypt');
const pool = require('./database');

const BCRYPT_ROUNDS = 10;
const BCRYPT_PREFIX = /^\$2[aby]\$/;

(async () => {
    let migrated = 0;
    let skipped = 0;
    try {
        const [rows] = await pool.query('SELECT id, username, password FROM accounts');
        console.log(`Tìm thấy ${rows.length} accounts.`);

        for (const row of rows) {
            if (BCRYPT_PREFIX.test(row.password)) {
                skipped++;
                continue;
            }
            const hashed = await bcrypt.hash(row.password, BCRYPT_ROUNDS);
            await pool.query('UPDATE accounts SET password = ? WHERE id = ?', [hashed, row.id]);
            console.log(`✅ Hashed password cho account "${row.username}" (id=${row.id})`);
            migrated++;
        }

        console.log(`\n🎉 Hoàn tất: ${migrated} hashed, ${skipped} đã hash sẵn (bỏ qua).`);
    } catch (err) {
        console.error('❌ Lỗi migration:', err);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
