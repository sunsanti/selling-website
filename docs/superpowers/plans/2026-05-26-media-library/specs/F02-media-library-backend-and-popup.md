# F02 — Media Library backend + popup component

## Feature

Build the reusable Media Library popup that any admin form can open. Backend: new `GET /api/admin/media` returns the 200 newest files from `uploads/`. Frontend: global `<div id="media-modal">` in admin shell + a free function `openMediaLibrary({ mode, onSelect })` in `admin/script.js`. The popup renders a thumbnail grid with case-insensitive substring search, an Upload button that posts to the existing `/api/admin/projects/upload`, single- or multi-select depending on caller, a "Chọn (N)" confirm button, and a Cancel. On confirm it calls `onSelect(urls)` with the picked URLs. After F02 the popup *exists and works in isolation* — wiring to actual image fields is F03.

## Scope

**Full-stack** (API + UI) — affected files:

- `Controllers/mediaController.js` — **new**
- `app.js` — register one route
- `config/constants.js` — add `MEDIA_LIST_LIMIT`
- `Views/admin/index.html` — append modal HTML
- `Views/admin/script.js` — append `openMediaLibrary` + helpers (~250 LOC)
- `Views/admin/style.css` — append `.media-modal-*` + grid styles (~80 LOC)

## Implementation

> **Project constraints applied**: C1 (route auto-protected by `app.use('/api/admin', requireAuth)`), C3 (Upload routes through existing `uploadService` — fileFilter + 50 MB cap already enforced), C6 (admin modal pattern from `confirm-modal` / `project-modal`), C7 (filenames rendered via `textContent`, never `innerHTML` — filenames could contain `<`/`>`).

### Step 1 — `config/constants.js` (extend)

```js
module.exports = {
    AREAS: ['sydney', 'melbourne', 'brisbane', 'goldcoast'],
    MAX_PROJECTS_PER_AREA: 6,
    BCRYPT_ROUNDS: 10,
    HOME_SERVICES_COUNT: 3,
    HOME_FOOTER_PERSONS_COUNT: 2,
    HOME_ABOUT_STATS_COUNT: 4,
    MEDIA_LIST_LIMIT: 200
};
```

### Step 2 — `Controllers/mediaController.js` (new)

```js
const fs = require('fs').promises;
const path = require('path');
const { MEDIA_LIST_LIMIT } = require('../config/constants');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const getMedia = async (req, res) => {
    try {
        const entries = await fs.readdir(UPLOADS_DIR);
        const stats = await Promise.all(entries.map(async name => {
            try {
                const st = await fs.stat(path.join(UPLOADS_DIR, name));
                if (!st.isFile()) return null;
                return {
                    url: '/uploads/' + name,
                    name,
                    size: st.size,
                    mtime: st.mtimeMs
                };
            } catch {
                return null;
            }
        }));
        const files = stats
            .filter(Boolean)
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, MEDIA_LIST_LIMIT);
        res.json({ success: true, data: files });
    } catch (err) {
        console.error('getMedia:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getMedia };
```

### Step 3 — `app.js` (register route)

Add the require near the other controller imports:

```js
const mediaController = require('./Controllers/mediaController');
```

Add the route under the admin section (`requireAuth` is already mounted on `/api/admin`):

```js
app.get('/api/admin/media', mediaController.getMedia);
```

### Step 4 — `Views/admin/index.html` (append modal at the bottom near `<!-- Confirm Modal -->`)

```html
<!-- Media Library Modal -->
<div id="media-modal" class="modal">
    <div class="modal-content media-modal-content">
        <div class="modal-header">
            <h2><i class="fas fa-images"></i> Thư viện ảnh</h2>
            <button class="modal-close" onclick="closeMediaLibrary()">&times;</button>
        </div>
        <div class="media-toolbar">
            <button type="button" class="btn-add" onclick="document.getElementById('media-upload-input').click()">
                <i class="fas fa-upload"></i> Upload
            </button>
            <input type="file" id="media-upload-input" accept="image/*" style="display:none">
            <input type="text" id="media-search-input" class="media-search" placeholder="Tìm theo tên file...">
            <span class="media-count" id="media-count"></span>
        </div>
        <div class="modal-body media-body">
            <div id="media-grid" class="media-grid"></div>
            <div id="media-empty" class="media-empty" style="display:none">
                <i class="fas fa-image"></i>
                <p>Chưa có ảnh — bấm Upload để thêm</p>
            </div>
        </div>
        <div class="form-actions media-actions">
            <button type="button" class="btn-cancel" onclick="closeMediaLibrary()">
                <i class="fas fa-times"></i> Hủy
            </button>
            <button type="button" class="btn-save" id="media-confirm-btn" onclick="confirmMediaSelection()" disabled>
                <i class="fas fa-check"></i> Chọn <span id="media-selected-count">(0)</span>
            </button>
        </div>
    </div>
</div>
```

### Step 5 — `Views/admin/style.css` (append at the very end)

```css
/* ================ MEDIA LIBRARY ================ */
#media-modal { z-index: 1100; }  /* above project-modal (1000) */

.media-modal-content {
    width: 92%;
    max-width: 1100px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
}

.media-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid #f0f0f0;
    flex-wrap: wrap;
}

.media-toolbar .btn-add {
    flex-shrink: 0;
}

.media-search {
    flex: 1;
    min-width: 180px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 13px;
}

.media-count {
    font-size: 12px;
    color: #7f8c8d;
    flex-shrink: 0;
}

.media-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
}

.media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
}

.media-item {
    aspect-ratio: 1 / 1;
    position: relative;
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 8px;
    overflow: hidden;
    background: #f8f9fa;
    transition: border-color 0.15s, transform 0.15s;
}

.media-item:hover {
    border-color: #bdc3c7;
    transform: translateY(-2px);
}

.media-item.selected {
    border-color: #27ae60;
}

.media-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.media-item .media-check {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #bdc3c7;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 11px;
}

.media-item.selected .media-check {
    background: #27ae60;
    border-color: #27ae60;
}

.media-item .media-name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 4px 6px;
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
    color: #fff;
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.media-empty {
    text-align: center;
    padding: 60px 20px;
    color: #95a5a6;
}

.media-empty i {
    font-size: 48px;
    margin-bottom: 12px;
    color: #bdc3c7;
}

.media-actions {
    border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
    .media-grid {
        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
        gap: 6px;
    }
    .media-modal-content { width: 96%; max-height: 92vh; }
    .media-toolbar { padding: 10px 14px; }
    .media-search { font-size: 12px; }
}
```

### Step 6 — `Views/admin/script.js` (append at the very end)

```js
// ===================== MEDIA LIBRARY =====================
// One global modal that any image picker can open.
//
//   openMediaLibrary({
//       mode: 'single' | 'multi',
//       onSelect: (urls) => { /* urls is always an array */ }
//   });
//
// Single-mode: clicking a thumb selects it (replacing prior selection). The
// Confirm button is enabled once one item is selected. Multi-mode: each thumb
// toggles in/out of a Set; Confirm shows the count. After successful upload
// in multi-mode the new file is auto-added to the selection (resolved
// decision #1). Search is case-insensitive substring on filename.

let _mediaState = {
    allMedia: [],          // [{url, name, size, mtime}, ...] — full fetched list
    filteredMedia: [],     // current view after search filter
    selectedUrls: new Set(),
    mode: 'single',
    onSelect: null,
    query: ''
};

function openMediaLibrary({ mode = 'single', onSelect = null } = {}) {
    _mediaState.mode = mode;
    _mediaState.onSelect = onSelect;
    _mediaState.selectedUrls = new Set();
    _mediaState.query = '';
    document.getElementById('media-search-input').value = '';
    document.getElementById('media-modal').style.display = 'flex';
    updateMediaSelectedCount();
    loadMediaGrid();
}

function closeMediaLibrary() {
    document.getElementById('media-modal').style.display = 'none';
    _mediaState.onSelect = null;
    _mediaState.selectedUrls.clear();
}

async function loadMediaGrid() {
    const grid = document.getElementById('media-grid');
    const empty = document.getElementById('media-empty');
    grid.innerHTML = '<div style="padding:20px;text-align:center;color:#95a5a6">Đang tải...</div>';
    empty.style.display = 'none';
    try {
        const res = await fetch('/api/admin/media');
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Failed');
        _mediaState.allMedia = json.data || [];
        applyMediaFilter();
    } catch (err) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.querySelector('p').textContent = 'Lỗi tải thư viện: ' + err.message;
        showToast('Lỗi tải thư viện ảnh', 'error');
    }
}

function applyMediaFilter() {
    const q = (_mediaState.query || '').toLowerCase();
    _mediaState.filteredMedia = q
        ? _mediaState.allMedia.filter(m => m.name.toLowerCase().includes(q))
        : _mediaState.allMedia.slice();
    renderMediaGrid();
}

function renderMediaGrid() {
    const grid = document.getElementById('media-grid');
    const empty = document.getElementById('media-empty');
    const count = document.getElementById('media-count');
    grid.innerHTML = '';

    if (_mediaState.allMedia.length === 0) {
        empty.style.display = 'block';
        count.textContent = '';
        return;
    }
    empty.style.display = 'none';
    count.textContent = _mediaState.filteredMedia.length + ' / ' + _mediaState.allMedia.length;

    _mediaState.filteredMedia.forEach(m => {
        const item = document.createElement('div');
        item.className = 'media-item';
        if (_mediaState.selectedUrls.has(m.url)) item.classList.add('selected');
        item.dataset.url = m.url;

        const img = document.createElement('img');
        img.src = m.url;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function () { this.style.display = 'none'; };
        item.appendChild(img);

        const check = document.createElement('div');
        check.className = 'media-check';
        check.innerHTML = '<i class="fas fa-check"></i>';
        item.appendChild(check);

        const name = document.createElement('div');
        name.className = 'media-name';
        name.textContent = m.name;   // textContent — C7
        item.appendChild(name);

        item.addEventListener('click', () => toggleMediaSelection(m.url));
        grid.appendChild(item);
    });
}

function toggleMediaSelection(url) {
    if (_mediaState.mode === 'single') {
        _mediaState.selectedUrls.clear();
        _mediaState.selectedUrls.add(url);
    } else {
        if (_mediaState.selectedUrls.has(url)) _mediaState.selectedUrls.delete(url);
        else _mediaState.selectedUrls.add(url);
    }
    renderMediaGrid();
    updateMediaSelectedCount();
}

function updateMediaSelectedCount() {
    const n = _mediaState.selectedUrls.size;
    document.getElementById('media-selected-count').textContent = '(' + n + ')';
    document.getElementById('media-confirm-btn').disabled = n === 0;
}

function confirmMediaSelection() {
    const urls = Array.from(_mediaState.selectedUrls);
    const cb = _mediaState.onSelect;
    closeMediaLibrary();
    if (cb && urls.length > 0) cb(urls);
}

document.getElementById('media-search-input').addEventListener('input', (e) => {
    _mediaState.query = e.target.value;
    applyMediaFilter();
});

document.getElementById('media-upload-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const fd = new FormData();
        fd.append('media', file);
        const res = await fetch('/api/admin/projects/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Upload failed');
        // Optimistically prepend the new file (also clear search so user sees it — L4)
        const newItem = { url: json.path, name: json.path.split('/').pop(), size: 0, mtime: Date.now() };
        _mediaState.allMedia.unshift(newItem);
        _mediaState.query = '';
        document.getElementById('media-search-input').value = '';
        // Resolved decision #1: in multi-mode, auto-add to selection.
        // Resolved decision #3: in single-mode, stay open so the admin can confirm.
        if (_mediaState.mode === 'multi') {
            _mediaState.selectedUrls.add(newItem.url);
        }
        applyMediaFilter();
        updateMediaSelectedCount();
        showToast('Upload thành công', 'success');
    } catch (err) {
        showToast('Lỗi upload: ' + err.message, 'error');
    } finally {
        e.target.value = '';   // reset so re-uploading same file fires 'change' again
    }
});
```

### API Routes

- `GET /api/admin/media` — protected by `requireAuth` (via existing `app.use('/api/admin', requireAuth)`)
  - Response: `{ success: true, data: [{ url, name, size, mtime }, ...] }`
  - Latency: O(N) filesystem stats. For N ≤ 200 (capped), expected < 100 ms on local disk. No deployment timeout to satisfy for this Express setup.

### UI Components

| Element | Role |
|---------|------|
| `#media-modal` | Modal container, z-index 1100 (above other modals) |
| `#media-upload-input` (hidden file input) | Triggered by Upload button; POSTs to existing `/api/admin/projects/upload` |
| `#media-search-input` | Live filter on filename, case-insensitive substring |
| `#media-grid` | Grid container; child `.media-item` divs created via DOM API (not innerHTML) |
| `#media-confirm-btn` | Disabled while `selectedUrls.size === 0` |
| `_mediaState` | Module-level state — caller passes `mode` + `onSelect`, state owns the rest |

### DB / KV Changes

None. Library reads filesystem only — no DB.

## Definition of Done

- [ ] `GET /api/admin/media` returns `{success:true, data: [...] }` with newest-first ordering when called via curl with a valid session cookie
- [ ] `GET /api/admin/media` returns 401 when called without a session (proves `requireAuth` mount covers it)
- [ ] Opening admin → DevTools console → `openMediaLibrary({mode:'single', onSelect: urls => console.log('PICKED', urls)})` shows the modal with the grid populated
- [ ] Typing in the search input filters the grid live (case-insensitive)
- [ ] Clicking a thumbnail in single-mode highlights it (one only); in multi-mode toggles checkmarks
- [ ] Confirm button is disabled when 0 selected; shows the count when ≥ 1
- [ ] Clicking Upload, picking a new image, then waiting — new thumbnail appears at the top of the grid, search input is cleared so it's visible
- [ ] In multi-mode, the just-uploaded thumbnail is auto-selected (per resolved decision #1)
- [ ] In single-mode, the just-uploaded thumbnail is NOT auto-selected (per resolved decision #3); user still has to click then confirm
- [ ] Filename rendered via `textContent` — DevTools Elements panel shows the filename as a text node inside `.media-name`
- [ ] Modal `display:flex` opens, `display:none` closes; closing clears `selectedUrls` and `onSelect`
- [ ] CSS: `.media-modal-content` z-index 1100 sits above `#project-modal` if both are open
- [ ] Mobile (≤ 768px): grid columns adapt (3-4 per row instead of 7-8), search input still usable

## Test Checklist

1. **@happy** — full backend + popup flow via curl + DevTools:
   ```bash
   # Login + capture cookie
   curl -c /tmp/cookie -d 'username=admin&password=admin123' http://localhost:5500/login
   # List
   curl -s -b /tmp/cookie http://localhost:5500/api/admin/media | jq '.data | length'
   # Expect: ≤ 200
   ```

2. **@auth** — unauthenticated 401:
   ```bash
   curl -s -o /dev/null -w '%{http_code}' http://localhost:5500/api/admin/media
   # Expect: 401
   ```

3. **@upload-flow** — manual:
   - Open admin → console
   - `openMediaLibrary({mode:'multi', onSelect: u => console.log(u)})`
   - Click Upload → pick a JPG → see thumbnail appear AT TOP + auto-selected (checkmark)
   - Click another existing thumb → count goes to (2)
   - Click Confirm → console prints `['/uploads/x.jpg', '/uploads/y.jpg']`

4. **@search** — type "service" in search → only files containing "service" in name remain; type "SERVICE" → same result (case-insensitive)

5. **@no-xss** — filename `<script>.jpg` is impossible because uploadService rewrites filename to `<ts>-<rand>.<ext>`. But verify defense-in-depth: manually rename a file in `uploads/` to `<img onerror=alert(1)>.jpg`, reload library, inspect DOM → `.media-name` shows the literal text, no alert fires.

6. **@empty-state** — temporarily move all files out of `uploads/`, open library → "Chưa có ảnh — bấm Upload để thêm" visible.

7. **@modal-stacking** — open Project edit modal → from console `openMediaLibrary(...)` → library appears ABOVE project modal (z-index 1100 > 1000). Close library → project modal still there.

8. **@timeout** — directory of 1000 files: response should still be < 500 ms. (If admin has >1000 files, slice to 200 keeps response small; stat is O(N) so the *200-newest* sort still costs O(N). Acceptable for MVP — Sprint 2 can paginate.)

## Files Created

| File | Lines (approx) |
|------|----------------|
| `Controllers/mediaController.js` | ~35 |

## Files Modified

| File | Change |
|------|--------|
| `config/constants.js` | +1 key (`MEDIA_LIST_LIMIT`) |
| `app.js` | +1 require, +1 route line |
| `Views/admin/index.html` | +~35 lines (modal markup) |
| `Views/admin/script.js` | +~180 lines (state + 8 helper functions + 2 listeners) |
| `Views/admin/style.css` | +~95 lines (modal + grid + responsive) |
