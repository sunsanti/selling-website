# F01 — Backend Foundation (Schema + Models + Routes)

## Feature

Tạo nền tảng backend cho 3 section editable: schema 4 bảng mới (`about_section`, `about_stats`, `services`, `footer_persons`), 3 model module, 1 controller, và 8 API route (6 admin + 3 public). Sau F01, admin có thể curl/Postman để GET/PUT data; public có thể GET — nhưng UI chưa wire (đó là F02/F03).

## Scope

**Full-stack (API + DB only, no UI)** — affected files:

- `config/migrate_db_schema.js` — extend với 4 tables + seed
- `Models/aboutSectionModel.js` — **new**
- `Models/serviceModel.js` — **new**
- `Models/footerPersonModel.js` — **new**
- `Controllers/homeContentController.js` — **new**
- `app.js` — register routes
- `config/constants.js` — add slot counts

## Implementation

> **Project constraints applied**: C1 (requireAuth on /api/admin/\*), C2 (/api/public/ no auth), C4 (idempotent migration), C5 (prepared statements), C8 (image path stored as full /uploads/x.jpg).

### Step 1 — Extend `config/constants.js`

```js
module.exports = {
    AREAS: ['sydney', 'melbourne', 'brisbane', 'goldcoast'],
    MAX_PROJECTS_PER_AREA: 6,
    BCRYPT_ROUNDS: 10,
    HOME_SERVICES_COUNT: 3,
    HOME_FOOTER_PERSONS_COUNT: 2,
    HOME_ABOUT_STATS_COUNT: 4
};
```

### Step 2 — Extend `config/migrate_db_schema.js`

Insert AFTER the existing indexes block and BEFORE `if (await hasTable('users'))`:

```js
        // ============== HOME CONTENT TABLES ==============
        if (!(await hasTable('about_section'))) {
            await pool.query(`
                CREATE TABLE about_section (
                    id INT PRIMARY KEY DEFAULT 1,
                    banner TEXT NOT NULL DEFAULT '',
                    paragraph_left TEXT NOT NULL DEFAULT '',
                    paragraph_right TEXT NOT NULL DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CHECK (id = 1)
                )
            `);
            console.log('✅ Created about_section');
        } else {
            console.log('⏭️  about_section already exists');
        }

        // Seed about_section row id=1 with current hardcoded values
        await pool.query(`
            INSERT IGNORE INTO about_section (id, banner, paragraph_left, paragraph_right) VALUES (1, ?, ?, ?)
        `, [
            'MANY BEAUTIFUL PLACES ARE WAITING FOR YOU TO SEE',
            'We are a passionate real estate team dedicated to developing modern and sustainable properties that blend aesthetic design with practical functionality, creating high-quality living and working spaces that offer lasting value and reflect distinctive character.',
            'With a strong commitment to quality and professionalism, we collaborate closely with our clients to turn their real estate goals into reality. From project planning and development to final delivery, we focus on exceeding expectations and providing properties that offer comfort, value, and long-term satisfaction.'
        ]);

        if (!(await hasTable('about_stats'))) {
            await pool.query(`
                CREATE TABLE about_stats (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    slot TINYINT NOT NULL UNIQUE,
                    num VARCHAR(20) NOT NULL DEFAULT '',
                    label VARCHAR(255) NOT NULL DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Created about_stats');
        } else {
            console.log('⏭️  about_stats already exists');
        }

        const aboutStatsSeed = [
            [1, '20+', 'years of experience'],
            [2, '200+', 'projects have done'],
            [3, '7+', 'awards received'],
            [4, '15+', 'team members']
        ];
        for (const [slot, num, label] of aboutStatsSeed) {
            await pool.query(
                `INSERT IGNORE INTO about_stats (slot, num, label) VALUES (?, ?, ?)`,
                [slot, num, label]
            );
        }

        if (!(await hasTable('services'))) {
            await pool.query(`
                CREATE TABLE services (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    slot TINYINT NOT NULL UNIQUE,
                    title VARCHAR(255) NOT NULL DEFAULT '',
                    description TEXT NOT NULL DEFAULT '',
                    image_path VARCHAR(255) NOT NULL DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Created services');
        } else {
            console.log('⏭️  services already exists');
        }

        const servicesSeed = [
            [1, 'See more about our business', 'Our company specializes in buying and selling real estate with a focus on value and long-term investment.', '/images/service1.jpg'],
            [2, 'Take a look at our projects', 'Take a look at our projects and discover properties designed for value, quality, and long-term investment.', '/images/service2.jpg'],
            [3, 'Be confident to be one of our partner', 'Sell or buy properties from our company', '/images/service3_3.jpg']
        ];
        for (const [slot, title, description, image_path] of servicesSeed) {
            await pool.query(
                `INSERT IGNORE INTO services (slot, title, description, image_path) VALUES (?, ?, ?, ?)`,
                [slot, title, description, image_path]
            );
        }

        if (!(await hasTable('footer_persons'))) {
            await pool.query(`
                CREATE TABLE footer_persons (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    slot TINYINT NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL DEFAULT '',
                    avatar_path VARCHAR(255) NOT NULL DEFAULT '',
                    email VARCHAR(255) NOT NULL DEFAULT '',
                    phone1 VARCHAR(50) NOT NULL DEFAULT '',
                    phone2 VARCHAR(50) NOT NULL DEFAULT '',
                    facebook_url VARCHAR(500) NOT NULL DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Created footer_persons');
        } else {
            console.log('⏭️  footer_persons already exists');
        }

        const footerSeed = [
            [1, 'Hoang Long', '/images/footer/Long.jpg', 'Leong@sealandproperty.com.au', '+61 432 285 678', '+84 905 160 805', 'https://www.facebook.com/longg1313'],
            [2, 'Tran Minh Phat (Jeremy)', '/images/footer/Phat.jpg', 'Jeremy@sealandproperty.com.au', '+61 45 246 7893', '+84 787665388', 'https://www.facebook.com/minhphat88']
        ];
        for (const [slot, name, avatar_path, email, phone1, phone2, facebook_url] of footerSeed) {
            await pool.query(
                `INSERT IGNORE INTO footer_persons (slot, name, avatar_path, email, phone1, phone2, facebook_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [slot, name, avatar_path, email, phone1, phone2, facebook_url]
            );
        }
```

**Run:** `node config/migrate_db_schema.js`
**Expect output:** 4 lines `✅ Created …` on first run, all `⏭️ already exists` on subsequent runs.

### Step 3 — `Models/aboutSectionModel.js` (new)

```js
const pool = require('../config/database');
const { HOME_ABOUT_STATS_COUNT } = require('../config/constants');

const getAbout = async () => {
    const [sectionRows] = await pool.query('SELECT banner, paragraph_left, paragraph_right FROM about_section WHERE id = 1');
    const [statsRows] = await pool.query('SELECT slot, num, label FROM about_stats ORDER BY slot ASC');
    if (sectionRows.length === 0) return null;
    return { ...sectionRows[0], stats: statsRows };
};

const updateAbout = async ({ banner, paragraph_left, paragraph_right, stats }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            'UPDATE about_section SET banner = ?, paragraph_left = ?, paragraph_right = ? WHERE id = 1',
            [banner || '', paragraph_left || '', paragraph_right || '']
        );

        if (Array.isArray(stats)) {
            for (const s of stats) {
                if (!s || typeof s.slot !== 'number') continue;
                if (s.slot < 1 || s.slot > HOME_ABOUT_STATS_COUNT) continue;
                await conn.query(
                    'UPDATE about_stats SET num = ?, label = ? WHERE slot = ?',
                    [s.num || '', s.label || '', s.slot]
                );
            }
        }

        await conn.commit();
        return true;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

module.exports = { getAbout, updateAbout };
```

### Step 4 — `Models/serviceModel.js` (new)

```js
const pool = require('../config/database');
const { HOME_SERVICES_COUNT } = require('../config/constants');

const getServices = async () => {
    const [rows] = await pool.query('SELECT slot, title, description, image_path FROM services ORDER BY slot ASC');
    return rows;
};

const getService = async (slot) => {
    const [rows] = await pool.query('SELECT slot, title, description, image_path FROM services WHERE slot = ?', [slot]);
    return rows[0] || null;
};

const updateService = async (slot, { title, description, image_path }) => {
    if (slot < 1 || slot > HOME_SERVICES_COUNT) {
        throw new Error(`slot must be 1..${HOME_SERVICES_COUNT}`);
    }
    // image_path = undefined → keep existing (E10 mitigation)
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title || ''); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description || ''); }
    if (image_path !== undefined && image_path !== null && image_path !== '') {
        fields.push('image_path = ?');
        values.push(image_path);
    }
    if (fields.length === 0) return false;
    values.push(slot);
    const [result] = await pool.query(
        `UPDATE services SET ${fields.join(', ')} WHERE slot = ?`,
        values
    );
    return result.affectedRows > 0;
};

module.exports = { getServices, getService, updateService };
```

### Step 5 — `Models/footerPersonModel.js` (new)

```js
const pool = require('../config/database');
const { HOME_FOOTER_PERSONS_COUNT } = require('../config/constants');

const getFooterPersons = async () => {
    const [rows] = await pool.query(
        'SELECT slot, name, avatar_path, email, phone1, phone2, facebook_url FROM footer_persons ORDER BY slot ASC'
    );
    return rows;
};

const getFooterPerson = async (slot) => {
    const [rows] = await pool.query(
        'SELECT slot, name, avatar_path, email, phone1, phone2, facebook_url FROM footer_persons WHERE slot = ?',
        [slot]
    );
    return rows[0] || null;
};

const updateFooterPerson = async (slot, { name, avatar_path, email, phone1, phone2, facebook_url }) => {
    if (slot < 1 || slot > HOME_FOOTER_PERSONS_COUNT) {
        throw new Error(`slot must be 1..${HOME_FOOTER_PERSONS_COUNT}`);
    }
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name || ''); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email || ''); }
    if (phone1 !== undefined) { fields.push('phone1 = ?'); values.push(phone1 || ''); }
    if (phone2 !== undefined) { fields.push('phone2 = ?'); values.push(phone2 || ''); }
    if (facebook_url !== undefined) { fields.push('facebook_url = ?'); values.push(facebook_url || ''); }
    if (avatar_path !== undefined && avatar_path !== null && avatar_path !== '') {
        fields.push('avatar_path = ?');
        values.push(avatar_path);
    }
    if (fields.length === 0) return false;
    values.push(slot);
    const [result] = await pool.query(
        `UPDATE footer_persons SET ${fields.join(', ')} WHERE slot = ?`,
        values
    );
    return result.affectedRows > 0;
};

module.exports = { getFooterPersons, getFooterPerson, updateFooterPerson };
```

### Step 6 — `Controllers/homeContentController.js` (new)

```js
const aboutModel = require('../Models/aboutSectionModel');
const serviceModel = require('../Models/serviceModel');
const footerPersonModel = require('../Models/footerPersonModel');

const URL_HTTPS_RE = /^https:\/\/[^\s<>"']+$/i;

// ============= ABOUT =============
const getAbout = async (req, res) => {
    try {
        const data = await aboutModel.getAbout();
        if (!data) return res.status(404).json({ success: false, message: 'About section chưa được seed' });
        res.json({ success: true, data });
    } catch (err) {
        console.error('getAbout:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateAbout = async (req, res) => {
    try {
        const { banner, paragraph_left, paragraph_right, stats } = req.body;
        await aboutModel.updateAbout({ banner, paragraph_left, paragraph_right, stats });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateAbout:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ============= SERVICES =============
const getServices = async (req, res) => {
    try {
        const data = await serviceModel.getServices();
        res.json({ success: true, data });
    } catch (err) {
        console.error('getServices:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getServiceBySlot = async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        const data = await serviceModel.getService(slot);
        if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy slot' });
        res.json({ success: true, data });
    } catch (err) {
        console.error('getServiceBySlot:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateService = async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        const { title, description, image_path } = req.body;
        const ok = await serviceModel.updateService(slot, { title, description, image_path });
        if (!ok) return res.status(400).json({ success: false, message: 'Không có thay đổi nào' });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateService:', err.message);
        const msg = err.message.startsWith('slot must') ? err.message : 'Lỗi server';
        res.status(msg === 'Lỗi server' ? 500 : 400).json({ success: false, message: msg });
    }
};

// ============= FOOTER PERSONS =============
const getFooterPersons = async (req, res) => {
    try {
        const data = await footerPersonModel.getFooterPersons();
        res.json({ success: true, data });
    } catch (err) {
        console.error('getFooterPersons:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getFooterPersonBySlot = async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        const data = await footerPersonModel.getFooterPerson(slot);
        if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy slot' });
        res.json({ success: true, data });
    } catch (err) {
        console.error('getFooterPersonBySlot:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const updateFooterPerson = async (req, res) => {
    try {
        const slot = parseInt(req.params.slot, 10);
        const { name, avatar_path, email, phone1, phone2, facebook_url } = req.body;

        // Validate facebook_url: must be empty or https:// (E16/Open Q #5)
        if (facebook_url && !URL_HTTPS_RE.test(facebook_url)) {
            return res.status(400).json({ success: false, message: 'facebook_url phải bắt đầu bằng https://' });
        }

        const ok = await footerPersonModel.updateFooterPerson(slot, {
            name, avatar_path, email, phone1, phone2, facebook_url
        });
        if (!ok) return res.status(400).json({ success: false, message: 'Không có thay đổi nào' });
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        console.error('updateFooterPerson:', err.message);
        const msg = err.message.startsWith('slot must') ? err.message : 'Lỗi server';
        res.status(msg === 'Lỗi server' ? 500 : 400).json({ success: false, message: msg });
    }
};

module.exports = {
    getAbout, updateAbout,
    getServices, getServiceBySlot, updateService,
    getFooterPersons, getFooterPersonBySlot, updateFooterPerson
};
```

### Step 7 — Register routes in `app.js`

Add `homeContentController` import near other controllers:

```js
const homeContentController = require('./Controllers/homeContentController');
```

Add public routes (no auth) — insert right after existing `/api/public/projects/:id`:

```js
app.get('/api/public/about', homeContentController.getAbout);
app.get('/api/public/services', homeContentController.getServices);
app.get('/api/public/footer-persons', homeContentController.getFooterPersons);
```

Add admin routes — insert before `/api/admin/translate`:

```js
app.get('/api/admin/about', homeContentController.getAbout);
app.put('/api/admin/about', homeContentController.updateAbout);

app.get('/api/admin/services', homeContentController.getServices);
app.get('/api/admin/services/:slot', homeContentController.getServiceBySlot);
app.put('/api/admin/services/:slot', homeContentController.updateService);

app.get('/api/admin/footer-persons', homeContentController.getFooterPersons);
app.get('/api/admin/footer-persons/:slot', homeContentController.getFooterPersonBySlot);
app.put('/api/admin/footer-persons/:slot', homeContentController.updateFooterPerson);
```

> **NOTE**: Admin routes inherit `requireAuth` from the `app.use('/api/admin', requireAuth)` mount applied earlier in app.js (C1). No need to re-add per route. Image upload reuses existing `/api/admin/projects/upload` endpoint — admin UI will POST images there for all home content uploads.

### DB / KV Changes

- 4 new tables: `about_section`, `about_stats`, `services`, `footer_persons`
- Migration is idempotent — re-runs safely (C4)
- Seed values match current hardcoded HTML (zero-downtime — F03 swap will see same content)
- No KV store; no TTLs

## Definition of Done

- [ ] `node config/migrate_db_schema.js` runs cleanly first-time and re-runs without errors
- [ ] After first run, MySQL has 4 new tables with seed data verified by `SELECT * FROM about_section / about_stats / services / footer_persons`
- [ ] `node --check Controllers/homeContentController.js Models/aboutSectionModel.js Models/serviceModel.js Models/footerPersonModel.js` → no syntax errors
- [ ] Server starts (`node app.js`) without errors
- [ ] All API routes registered (verifiable via curl, see test checklist)
- [ ] Public endpoints (`/api/public/about|services|footer-persons`) accessible without auth — return 200 + valid JSON
- [ ] Admin endpoints (`/api/admin/about|services|footer-persons`) require auth — return 401 when not logged in (C1)
- [ ] All API responses follow `{ success: boolean, data?, message? }` shape
- [ ] Express request handlers wrap async in try/catch; no unhandled promise rejection logs
- [ ] No SQL string interpolation — all queries use `?` placeholders (C5)
- [ ] Image paths returned as-is (full `/images/...` or `/uploads/...`) — no double-prefix bug (C8)

## Test Checklist

1. **@happy** — full backend flow:

   ```bash
   node config/migrate_db_schema.js                                       # expect 4 ✅ Created on fresh DB
   node app.js &                                                           # start server
   # public endpoints
   curl -s http://localhost:5500/api/public/about | head -c 200            # expect {"success":true,"data":{"banner":"MANY BEAUTIFUL...
   curl -s http://localhost:5500/api/public/services | jq '.data | length' # expect 3
   curl -s http://localhost:5500/api/public/footer-persons | jq '.data[0].name' # expect "Hoang Long"
   ```

2. **@auth** — admin endpoints reject unauthenticated:

   ```bash
   for ep in about services services/1 footer-persons footer-persons/1; do
       code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5500/api/admin/$ep)
       echo "$ep -> $code"   # expect all 401
   done
   ```

3. **@db** — data persists across server restart:

   ```bash
   # Login via curl to get session cookie, then:
   curl -s -X PUT http://localhost:5500/api/admin/services/1 \
       -H "Content-Type: application/json" \
       -b session_cookie.txt \
       -d '{"title":"NEW TITLE TEST"}'
   # Restart server
   curl -s http://localhost:5500/api/public/services | jq '.data[0].title'  # expect "NEW TITLE TEST"
   ```

4. **@partial-fail** — invalid slot returns 4xx, doesn't crash server:

   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:5500/api/admin/services/99 \
       -H "Content-Type: application/json" -b session_cookie.txt -d '{"title":"x"}'
   # expect 400 "slot must be 1..3"
   ```

5. **@validation** — facebook_url rejected when not https:

   ```bash
   curl -s -X PUT http://localhost:5500/api/admin/footer-persons/1 \
       -H "Content-Type: application/json" -b session_cookie.txt \
       -d '{"facebook_url":"javascript:alert(1)"}' | jq .message
   # expect "facebook_url phải bắt đầu bằng https://"
   ```

6. **@idempotent-migration** — re-running migration does not duplicate data:

   ```bash
   node config/migrate_db_schema.js  # 2nd time
   # expect ⏭️ already exists for all 4 tables
   mysql -e "USE sellingweb; SELECT COUNT(*) FROM services; SELECT COUNT(*) FROM about_stats;"
   # expect services=3, about_stats=4 (unchanged)
   ```

7. **@timeout** — typical request latency (no external API): each endpoint should complete in < 100 ms on local DB. No Vercel timeout to satisfy; Express on Node has no deploy-imposed limit.

## Files Created

| File | Lines (approx) |
|------|----------------|
| `Models/aboutSectionModel.js` | ~40 |
| `Models/serviceModel.js` | ~40 |
| `Models/footerPersonModel.js` | ~45 |
| `Controllers/homeContentController.js` | ~125 |

## Files Modified

| File | Change |
|------|--------|
| `config/migrate_db_schema.js` | +~80 lines (4 table creates + seeds) |
| `config/constants.js` | +3 keys |
| `app.js` | +1 require, +11 route lines |
