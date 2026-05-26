# F02 — Admin UI for About / Services / Footer

## Feature

Thêm 3 sidebar entry mới vào admin panel: **About**, **Services**, **Footer**. Mỗi section là 1 form với inline image preview giống pattern logo upload. Per-card save button cho Services + Footer (Q#1). Reuse `/api/admin/projects/upload` endpoint cho image upload (multer fileFilter image-only).

## Scope

**UI-only** (depends on F01) — affected files:

- `Views/admin/index.html` — 3 `<section>` mới + 3 sidebar nav link
- `Views/admin/script.js` — 3 load functions, 3 save functions, image upload handlers, `setText()` helper
- `Views/admin/style.css` — (nếu cần) thêm class cho card layout của services/footer

## Implementation

> **Project constraints applied**: C6 (admin UI section pattern with `data-section`), C7 (textContent for any admin preview rendering of user-supplied data — applied for re-render after save). Image upload reuses `uploadService` (C3).

### Step 1 — Add sidebar nav items in `Views/admin/index.html`

Find the sidebar nav block (~line 19–36) and **insert** these 3 items BEFORE `Account`:

```html
<a href="#" class="nav-item" data-section="home-about">
    <i class="fas fa-info-circle"></i>
    <span>About</span>
</a>
<a href="#" class="nav-item" data-section="home-services">
    <i class="fas fa-concierge-bell"></i>
    <span>Services</span>
</a>
<a href="#" class="nav-item" data-section="home-footer">
    <i class="fas fa-id-card"></i>
    <span>Footer</span>
</a>
```

### Step 2 — Add About section HTML (insert after Settings panel, before `</main>` of admin)

```html
<!-- About Section -->
<section id="home-about" class="content-section">
    <div class="section-header">
        <h1>About Section</h1>
    </div>
    <form id="home-about-form" class="settings-form">
        <div class="form-group">
            <label>Banner Heading</label>
            <textarea id="about-input-banner" rows="2" maxlength="500" placeholder="MANY BEAUTIFUL PLACES ARE WAITING FOR YOU TO SEE"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Paragraph Left</label>
                <textarea id="about-input-left" rows="6" maxlength="2000"></textarea>
            </div>
            <div class="form-group">
                <label>Paragraph Right</label>
                <textarea id="about-input-right" rows="6" maxlength="2000"></textarea>
            </div>
        </div>
        <div class="project-section-title">
            <h3><i class="fas fa-chart-bar"></i> Stats (4 blocks)</h3>
        </div>
        <div class="form-row" id="about-stats-grid">
            <!-- 4 stat blocks injected by JS (each: number + label) -->
        </div>
        <div class="form-actions">
            <button type="submit" class="btn-save"><i class="fas fa-save"></i> Save About</button>
        </div>
    </form>
</section>
```

### Step 3 — Add Services section HTML

```html
<!-- Services Section -->
<section id="home-services" class="content-section">
    <div class="section-header">
        <h1>Services (3 slots)</h1>
    </div>
    <div id="home-services-cards">
        <!-- 3 cards injected by JS (each: title + description + image upload + save button) -->
    </div>
</section>
```

### Step 4 — Add Footer section HTML

```html
<!-- Footer Section -->
<section id="home-footer" class="content-section">
    <div class="section-header">
        <h1>Footer (2 slots)</h1>
    </div>
    <div id="home-footer-cards">
        <!-- 2 cards injected by JS (each: avatar upload + name + email + 2 phones + facebook url + save button) -->
    </div>
</section>
```

### Step 5 — `Views/admin/script.js` — add helper + 3 section modules

At top of file add small XSS-safe helper + image upload helper:

```js
// XSS-safe text setter (C7)
function setText(el, value) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.textContent = value == null ? '' : String(value);
}

// Reuse existing /api/admin/projects/upload for any home-content image
async function uploadHomeImage(file) {
    const fd = new FormData();
    fd.append('media', file);
    const res = await fetch('/api/admin/projects/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Upload failed');
    return json.path;  // e.g. /uploads/1779....jpg
}
```

#### 5a — About section

```js
// ============================ ABOUT ============================
async function loadHomeAbout() {
    const res = await fetch('/api/admin/about');
    if (!res.ok) return;
    const { data } = await res.json();
    if (!data) return;

    document.getElementById('about-input-banner').value = data.banner || '';
    document.getElementById('about-input-left').value = data.paragraph_left || '';
    document.getElementById('about-input-right').value = data.paragraph_right || '';

    const grid = document.getElementById('about-stats-grid');
    grid.innerHTML = '';   // safe: no user content here, only static structure
    (data.stats || []).forEach(s => {
        const wrap = document.createElement('div');
        wrap.className = 'form-group';
        const num = document.createElement('input');
        num.type = 'text';
        num.placeholder = 'e.g. 20+';
        num.maxLength = 20;
        num.dataset.slot = s.slot;
        num.dataset.field = 'num';
        num.value = s.num || '';
        const lbl = document.createElement('input');
        lbl.type = 'text';
        lbl.placeholder = 'e.g. years of experience';
        lbl.maxLength = 255;
        lbl.dataset.slot = s.slot;
        lbl.dataset.field = 'label';
        lbl.value = s.label || '';
        const title = document.createElement('label');
        title.textContent = `Stat ${s.slot}`;
        wrap.appendChild(title);
        wrap.appendChild(num);
        wrap.appendChild(lbl);
        grid.appendChild(wrap);
    });
}

document.getElementById('home-about-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-save');
    btn.disabled = true;
    try {
        const stats = [];
        document.querySelectorAll('#about-stats-grid input[data-slot]').forEach(inp => {
            const slot = parseInt(inp.dataset.slot, 10);
            const field = inp.dataset.field;
            let entry = stats.find(s => s.slot === slot);
            if (!entry) { entry = { slot }; stats.push(entry); }
            entry[field] = inp.value;
        });
        const payload = {
            banner: document.getElementById('about-input-banner').value,
            paragraph_left: document.getElementById('about-input-left').value,
            paragraph_right: document.getElementById('about-input-right').value,
            stats
        };
        const res = await fetch('/api/admin/about', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        showToast(json.success ? 'success' : 'error', json.message);
    } catch (err) {
        showToast('error', err.message);
    } finally {
        btn.disabled = false;
    }
});
```

#### 5b — Services section

```js
// ============================ SERVICES ============================
async function loadHomeServices() {
    const res = await fetch('/api/admin/services');
    if (!res.ok) return;
    const { data } = await res.json();
    const wrap = document.getElementById('home-services-cards');
    wrap.innerHTML = '';

    (data || []).forEach(svc => {
        const card = document.createElement('div');
        card.className = 'settings-panel';
        card.dataset.slot = svc.slot;
        card.innerHTML = `
            <h2><i class="fas fa-concierge-bell"></i> Service ${svc.slot}</h2>
            <div class="form-group">
                <label>Title</label>
                <input type="text" class="svc-title" maxlength="255">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="svc-desc" rows="4" maxlength="2000"></textarea>
            </div>
            <div class="form-group">
                <label>Image</label>
                <div class="settings-image-area">
                    <div class="settings-image-preview">
                        <img class="svc-img-preview" src="" alt="" style="display:none" onerror="this.style.display='none'">
                        <span class="settings-preview-placeholder svc-img-placeholder">
                            <i class="fas fa-image"></i> No image
                        </span>
                    </div>
                    <div class="settings-image-actions">
                        <button type="button" class="btn-add svc-upload-btn"><i class="fas fa-upload"></i> Upload</button>
                        <input type="file" class="svc-file-input" accept="image/*" style="display:none">
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-save svc-save-btn"><i class="fas fa-save"></i> Save Service ${svc.slot}</button>
            </div>
        `;
        wrap.appendChild(card);

        // Hydrate values via .value / .src (NOT innerHTML — keeps DOM clean from XSS)
        card.querySelector('.svc-title').value = svc.title || '';
        card.querySelector('.svc-desc').value = svc.description || '';
        const imgEl = card.querySelector('.svc-img-preview');
        const placeholderEl = card.querySelector('.svc-img-placeholder');
        if (svc.image_path) {
            imgEl.src = svc.image_path;
            imgEl.style.display = 'block';
            placeholderEl.style.display = 'none';
        }
        card.dataset.imagePath = svc.image_path || '';

        // Upload handler
        const fileInput = card.querySelector('.svc-file-input');
        card.querySelector('.svc-upload-btn').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                const path = await uploadHomeImage(file);
                imgEl.src = path;
                imgEl.style.display = 'block';
                placeholderEl.style.display = 'none';
                card.dataset.imagePath = path;
                showToast('success', 'Ảnh đã upload — bấm Save để lưu');
            } catch (err) {
                showToast('error', err.message);
            }
        });

        // Save handler (per-card — Q#1)
        card.querySelector('.svc-save-btn').addEventListener('click', async () => {
            const btn = card.querySelector('.svc-save-btn');
            btn.disabled = true;
            try {
                const payload = {
                    title: card.querySelector('.svc-title').value,
                    description: card.querySelector('.svc-desc').value
                };
                // Only include image_path if user changed it (E10: don't blank existing)
                const currentPath = card.dataset.imagePath;
                if (currentPath) payload.image_path = currentPath;
                const res = await fetch(`/api/admin/services/${svc.slot}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                showToast(json.success ? 'success' : 'error', json.message);
            } catch (err) {
                showToast('error', err.message);
            } finally {
                btn.disabled = false;
            }
        });
    });
}
```

#### 5c — Footer Persons section

```js
// ============================ FOOTER PERSONS ============================
async function loadHomeFooter() {
    const res = await fetch('/api/admin/footer-persons');
    if (!res.ok) return;
    const { data } = await res.json();
    const wrap = document.getElementById('home-footer-cards');
    wrap.innerHTML = '';

    (data || []).forEach(person => {
        const card = document.createElement('div');
        card.className = 'settings-panel';
        card.dataset.slot = person.slot;
        card.innerHTML = `
            <h2><i class="fas fa-id-card"></i> Person ${person.slot}</h2>
            <div class="form-group">
                <label>Avatar</label>
                <div class="settings-image-area">
                    <div class="settings-image-preview">
                        <img class="fp-avatar-preview" src="" alt="" style="display:none" onerror="this.style.display='none'">
                        <span class="settings-preview-placeholder fp-avatar-placeholder">
                            <i class="fas fa-user"></i> No avatar
                        </span>
                    </div>
                    <div class="settings-image-actions">
                        <button type="button" class="btn-add fp-upload-btn"><i class="fas fa-upload"></i> Upload</button>
                        <input type="file" class="fp-file-input" accept="image/*" style="display:none">
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" class="fp-name" maxlength="255">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="fp-email" maxlength="255">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Phone 1</label>
                    <input type="text" class="fp-phone1" maxlength="50">
                </div>
                <div class="form-group">
                    <label>Phone 2</label>
                    <input type="text" class="fp-phone2" maxlength="50">
                </div>
            </div>
            <div class="form-group">
                <label>Facebook URL (https:// only)</label>
                <input type="url" class="fp-fb" maxlength="500" pattern="https://.*">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-save fp-save-btn"><i class="fas fa-save"></i> Save Person ${person.slot}</button>
            </div>
        `;
        wrap.appendChild(card);

        card.querySelector('.fp-name').value = person.name || '';
        card.querySelector('.fp-email').value = person.email || '';
        card.querySelector('.fp-phone1').value = person.phone1 || '';
        card.querySelector('.fp-phone2').value = person.phone2 || '';
        card.querySelector('.fp-fb').value = person.facebook_url || '';

        const imgEl = card.querySelector('.fp-avatar-preview');
        const placeholderEl = card.querySelector('.fp-avatar-placeholder');
        if (person.avatar_path) {
            imgEl.src = person.avatar_path;
            imgEl.style.display = 'block';
            placeholderEl.style.display = 'none';
        }
        card.dataset.avatarPath = person.avatar_path || '';

        // Avatar upload
        const fileInput = card.querySelector('.fp-file-input');
        card.querySelector('.fp-upload-btn').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                const path = await uploadHomeImage(file);
                imgEl.src = path;
                imgEl.style.display = 'block';
                placeholderEl.style.display = 'none';
                card.dataset.avatarPath = path;
                showToast('success', 'Avatar đã upload — bấm Save để lưu');
            } catch (err) {
                showToast('error', err.message);
            }
        });

        card.querySelector('.fp-save-btn').addEventListener('click', async () => {
            const btn = card.querySelector('.fp-save-btn');
            btn.disabled = true;
            try {
                const fb = card.querySelector('.fp-fb').value.trim();
                if (fb && !/^https:\/\//i.test(fb)) {
                    showToast('error', 'Facebook URL phải bắt đầu https://');
                    return;
                }
                const payload = {
                    name: card.querySelector('.fp-name').value,
                    email: card.querySelector('.fp-email').value,
                    phone1: card.querySelector('.fp-phone1').value,
                    phone2: card.querySelector('.fp-phone2').value,
                    facebook_url: fb
                };
                const currentPath = card.dataset.avatarPath;
                if (currentPath) payload.avatar_path = currentPath;
                const res = await fetch(`/api/admin/footer-persons/${person.slot}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                showToast(json.success ? 'success' : 'error', json.message);
            } catch (err) {
                showToast('error', err.message);
            } finally {
                btn.disabled = false;
            }
        });
    });
}
```

### Step 6 — Wire sidebar nav to load functions

Find the existing nav-click handler (`showSection` or similar) in `Views/admin/script.js`. After it switches to the section, dispatch to the loader:

```js
function onSectionShown(sectionId) {
    // existing logic for dashboard/projects/contacts/accounts...
    if (sectionId === 'home-about') loadHomeAbout();
    else if (sectionId === 'home-services') loadHomeServices();
    else if (sectionId === 'home-footer') loadHomeFooter();
}
```

> Inspect the file first — there's an existing `.nav-item` click handler that toggles `.content-section.active`. Hook into its callback (likely 1 line addition) — do not duplicate the nav logic.

### UI Components (summary table)

| Element | Source of data | Re-renders on save? |
|---------|----------------|---------------------|
| `#about-input-banner / -left / -right` | `/api/admin/about` | No — form keeps user's typed values; toast confirms success |
| `#about-stats-grid input[data-slot][data-field]` | `data.stats[]` from `/api/admin/about` | No |
| `#home-services-cards .settings-panel` (×3) | `/api/admin/services` | Each card independent; toast per save |
| `#home-footer-cards .settings-panel` (×2) | `/api/admin/footer-persons` | Each card independent |
| Image preview `<img>` | Set `src` immediately on upload response | Yes (live preview before save) |

### DB / KV Changes

None (F01 owns DB).

## Definition of Done

- [ ] 3 new sidebar nav items render with Font Awesome icons
- [ ] Click About → form pre-filled with seed values from DB
- [ ] Click Services → 3 cards rendered with seed title/desc/image
- [ ] Click Footer → 2 cards rendered with seed name/email/phone/avatar/fb
- [ ] Upload image on any card → preview thumbnail appears immediately (before save)
- [ ] Click Save → API call PUT goes through with current form values; toast shows "Cập nhật thành công"
- [ ] Reload page → values persist (because F01 DB persists)
- [ ] Facebook URL field rejects `javascript:` and non-`https://` client-side AND server-side
- [ ] Save button disabled during request (E12 double-click prevention)
- [ ] No `innerHTML` set with user-supplied string anywhere (C7) — verify by grep
- [ ] Console clean (no errors / warnings)
- [ ] Responsive: form usable on mobile (existing `.form-row` + `.settings-panel` styles handle)

## Test Checklist

1. **@happy** — full edit flow:
   - Login as admin → click About → change banner to "TEST 123" → Save
   - See toast "Cập nhật thành công"
   - Reload page → banner field shows "TEST 123"

2. **@auth** — UI is behind admin auth gate already (F01 verified `/api/admin/*` returns 401 unauth). Manual: open `/admin` in incognito → should redirect to `/login`.

3. **@upload** — image upload flow:
   - On Service 1 card → click Upload → choose `.jpg` → preview shows new image
   - Click Save → reload → image persists
   - On Service 1 card → click Upload → choose `.exe` → server returns 400 (multer fileFilter, C3)

4. **@validation** — invalid Facebook URL:
   - On Person 1 → enter `javascript:alert(1)` in Facebook URL → click Save
   - Client toast "Facebook URL phải bắt đầu https://"
   - No API call made (verify in network tab)

5. **@partial-fail** — save Service 1 succeeds even if Service 2 has empty title:
   - Edit Service 1 title, leave Service 2 blank
   - Click Save on Service 1 only → 200
   - Click Save on Service 2 → either succeeds (empty title is allowed in schema) or 400; either way Service 1's save not affected

6. **@no-xss** — pasting `<img src=x onerror=alert(1)>` into banner field, save, reload — text shown literally in textarea (not executed) since `.value` setter is XSS-safe.

7. **@e10-image-keep** — save without re-uploading:
   - On Service 1: change title only, do NOT upload new image
   - Save → reload → image still present (model's `updateService` skips empty image_path)

## Files Created

None (all edits are to existing files).

## Files Modified

| File | Change |
|------|--------|
| `Views/admin/index.html` | +3 nav items, +3 `<section>` blocks (~80 lines) |
| `Views/admin/script.js` | +`setText`, +`uploadHomeImage`, +`loadHomeAbout/save handler`, +`loadHomeServices`, +`loadHomeFooter` (~250 lines) |
| `Views/admin/style.css` | Likely 0 — reuses `.settings-panel`, `.form-group`, `.form-row`, `.settings-image-area`, `.btn-save`. Inspect after rendering — only add small tweaks if cards too cramped |
