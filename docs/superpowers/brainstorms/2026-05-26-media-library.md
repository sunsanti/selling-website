# Brainstorm: Media Library

**Source:** [docs/superpowers/specs/2026-05-26-media-library.md](../specs/2026-05-26-media-library.md)
**Date:** 2026-05-26

## Context Loaded

- ✅ Spec read in full
- ✅ Wiki: local `wiki/` folder (12 articles). No `docs/knowledge/wiki/`
- ✅ Constraint gate triggered (API routes + DB UPDATEs + image upload)
- ✅ Project conventions injected from [wiki/02-kien-truc.md](../../../wiki/02-kien-truc.md), [wiki/03-database.md](../../../wiki/03-database.md), [wiki/04-api-routes.md](../../../wiki/04-api-routes.md), [wiki/07-services.md](../../../wiki/07-services.md), [wiki/09-bao-mat.md](../../../wiki/09-bao-mat.md)

## Project Constraints (Inject)

| # | Constraint | Source |
|---|------------|--------|
| C1 | `/api/admin/*` mount applies `requireAuth` automatically | wiki/04, app.js |
| C3 | `uploadService` validates MIME jpg/png/webp/gif + 50MB cap; filename `<ts>-<rand>.<ext>` in `/uploads/` | wiki/07 |
| C4 | Migrations idempotent — DB via `information_schema` check; file moves via `fs.existsSync` guard | wiki/03 |
| C5 | All SQL via `pool.query(sql, [params])` — no interpolation | wiki/06 |
| C7 | Render user-supplied strings via `textContent` (filenames included — they could contain `<`, `>`) | wiki/09 |
| C8 | Image path stored as full `/uploads/x.jpg`. Post-migration this is the only convention; `normalizeImageUrl()` becomes a 1-rule function | spec |

## Spec ↔ Wiki Conflicts

None. Spec proposes consolidating image_path convention which actually *simplifies* what wiki documents as a 3-case `normalizeImageUrl()`.

## Approach Variations (3)

### Approach A — Global modal in `admin/index.html` + helper in `admin/script.js`

The Media Library is a single `<div id="media-modal" class="modal">` appended to `admin/index.html`, like `confirm-modal`. `openMediaLibrary({ mode, onSelect })` is a free function in `admin/script.js` that fetches `/api/admin/media`, renders the grid, wires upload, and on confirm calls `onSelect(urls)` then closes.

**Pros**:
- ✅ Matches existing modal pattern in this codebase (C6) — admin already has `project-modal`, `confirm-modal`. Zero new patterns.
- ✅ Reuses `confirm-modal`-style HTML scaffold.
- ✅ One global instance → one set of DOM IDs → no per-call cleanup needed.
- ✅ Function signature `openMediaLibrary({mode, onSelect})` is callable from anywhere (settings save flow, service card, footer card, project image upload trigger).

**Cons**:
- ⚠️ `admin/script.js` already ~1300 lines. Adds ~250 more.

**Constraint check**: All pass.

### Approach B — Separate `Views/admin/media-library.js` file

Same logic as A but extracted to its own file loaded via `<script src="media-library.js">` before `script.js`. Function still global on window.

**Pros**:
- ✅ Better code organization — testable isolated.
- ✅ Could be reused if project adds another admin-like surface later.

**Cons**:
- ⚠️ One more `<script>` tag (HTTP request). With no build step, every JS file is a separate fetch.
- ⚠️ Inconsistent with existing pattern — every other admin function lives in `script.js`.

**Constraint check**: All pass. Minor stylistic deviation from C6 (no precedent for split JS).

### Approach C — Replace `<input type="file">` entirely; the library is the ONLY upload UI

Currently each image field has a hidden `<input type="file">` + a button. In C we remove those inputs altogether — every image picker is a button labeled "Chọn ảnh" that opens the library. New files only enter the system via the Library's own Upload button.

**Pros**:
- ✅ Cleanest UX — one mental model: "open library, pick (or upload then pick)"
- ✅ Removes 6+ identical `<input type="file">` patterns
- ✅ Library becomes the single audit point for uploads

**Cons**:
- 🟠 Bigger refactor — 6 sites lose their existing upload handlers
- 🟠 Slightly more clicks for the "just upload one new image, attach it" common path (admin clicks Choose → Library opens → Upload → wait → pick → confirm vs. before: click Upload → done)

**Constraint check**: All pass.

### Recommendation

**Approach A**, then in the same MVP also do the spirit of C: remove the *separate per-field upload UI* and route everything through the library. Admins clicking the "Upload" button on a card actually opens the library. This is what the spec implies ("mọi field ảnh đều pick lại được") and keeps the data flow uniform.

Why A over B: matches existing single-file admin script convention. The 250 LOC addition isn't worth a separate `<script>` tag in a no-build-step project. Split later if `admin/script.js` becomes painful.

Why include C's spirit: the spec is explicit that admins shouldn't upload duplicates. If we keep the existing direct file pickers AND add the library, admins will keep doing direct uploads out of habit. Forcing the library makes the "no duplicate" promise actually stick.

## Edge Cases & Failure Modes

### Migration

| # | Case | Mitigation |
|---|------|-----------|
| M1 | A file exists at both `images/x.jpg` AND `uploads/x.jpg` | `fs.existsSync(dest)` before move. If collision, log warning and SKIP that file (don't overwrite). UPDATE DB row to `/uploads/x.jpg` (assumes the target was the correct one — same filename, same image, low risk). |
| M2 | DB row has `image_path = ''` (empty) | Skip — nothing to migrate. |
| M3 | DB row has `image_path = 'project1.jpg'` (no prefix) | Treat as legacy `/images/x` and rewrite to `/uploads/x`. |
| M4 | DB row points to file that doesn't exist on disk | Log warning, leave row alone (don't fabricate path). Public render handles missing image via `<img onerror>`. |
| M5 | Server is running during migration → race on read | Document in script docstring: "Stop server before running. Backup DB first." |
| M6 | Migration runs twice | Step 1 (move): `fs.existsSync(images/x)` is false on re-run → skip. Step 2 (UPDATE): WHERE clause filters `image_path LIKE '/images/%' OR image_path NOT LIKE '/uploads/%' AND image_path != ''`. Idempotent. |
| M7 | Hidden files / subfolders in `images/` (e.g., `footer/Long.jpg`) | The seed has `images/footer/Long.jpg` — recursive move. Use `fs.readdirSync(..., { recursive: true })` (Node 18+) OR enumerate manually. After move, files land flat in `uploads/` so DB path becomes `/uploads/Long.jpg`. **Caveat**: name collision if 2 subfolders had `Long.jpg`. Handle via `fs.existsSync` skip (M1). |

### Library popup

| # | Case | Mitigation |
|---|------|-----------|
| L1 | `uploads/` empty | Grid shows "Chưa có ảnh — bấm Upload để thêm" placeholder. |
| L2 | `GET /api/admin/media` fails (500 or 401 from session expired) | Toast error. Modal stays open with error state. User can retry. |
| L3 | Upload fails (multer rejects non-image) | Existing `uploadService` error path returns 400. Toast displays server message. Library refreshes anyway (refresh is cheap). |
| L4 | User uploads while filter typed → filtered grid hides the just-uploaded file | After upload success, prepend to array AND clear search to make new file visible. |
| L5 | Multi-mode: user selects 50 thumbs → callback receives 50 URLs → project images array balloons | No hard cap. UI displays count "Đã chọn 50". If too many crash UI, that's a project-images problem, not library. (Acceptable for MVP.) |
| L6 | Thumbnail of huge image (e.g., 10 MB) slows grid | Server returns the original file as `<img src>`. Browser handles via `loading="lazy"`. If grid still slow → consider sharp/imagemagick thumbnail generation as Sprint 2. (Not in MVP.) |
| L7 | Filename contains `'`, `"`, `<` | Render via `textContent`, set `img.src` via property setter — both safe (C7). |
| L8 | Two admins upload at same time | Each request goes through `uploadService` which generates unique `<ts>-<rand>` name. Last-fetched library may not include the very newest from peer — acceptable; manual refresh button. |
| L9 | User cancels modal while upload in progress | Upload completes in background; new file appears in DB next time library opens. No data loss. |
| L10 | Cross-modal scenario: user opens project-modal then media-modal on top | Z-index: media-modal z-index > project-modal. Both currently use `z-index: 1000` — need to bump media-modal to 1100. |

### Security / data integrity

| # | Case | Mitigation |
|---|------|-----------|
| S1 | Anonymous user hits `/api/admin/media` | `app.use('/api/admin', requireAuth)` already mounted → 401. (C1) |
| S2 | Path traversal: malicious request `/uploads/../../etc/passwd` | Express static serves `path.join(__dirname, 'uploads')` — disallows `..` traversal by design. (No change needed.) |
| S3 | `fs.readdirSync` returns symlink that points outside `uploads/` | `multer` doesn't create symlinks. If admin manually adds one — out of scope. |
| S4 | Listing endpoint reveals filenames to authenticated users | Filenames already public via `/uploads/x` — listing just enumerates them. No new attack surface. |

## Key Risks (Ranked)

1. 🟠 **Migration on prod must run before deploy** — the code change drops `/images` mount. If migration didn't run, every `/images/...` URL in DB returns 404 on public render. Mitigation: bake the migration into deploy steps; document in SETUP_GUIDE.
2. 🟠 **Recursive move with subfolders** (`images/footer/`) — need to flatten. Filename collision possible if same name across subfolders. Mitigation: prefix subfolder name when collision (`footer-Long.jpg`).
3. 🟡 **Z-index conflict** with project-modal — solvable with one CSS rule.
4. 🟡 **`script.js` size growth** — 1300 → 1550 LOC. Not blocking; can split later.
5. 🟡 **No DB-backed dedupe** — admin can still upload the same file twice via the library's own Upload button, producing 2 distinct entries with different filenames. The library shows both. Sprint 2 hash dedupe addresses this.

## Open Questions for /feature-plan

1. **How does Upload-then-auto-select work in multi mode?** When admin clicks Upload, gets a file picker, and uploads 1 file — should it be added to the selection set automatically (so they don't have to click it after) or just appear in the grid for them to click?
   - **Recommend**: auto-add to selection. Common case is "upload + use immediately"; the rare case where admin wants to upload-but-not-select can be solved by un-selecting after.

2. **Library entry point for the "Project: thumbnail image_path" field** — the project edit modal has its own image upload flow. Does opening the library REPLACE that flow (button "Choose from library") or sit BESIDE it (existing upload + new "library" link)?
   - **Recommend**: REPLACE (per Approach C spirit). One way to add images, less confusion.

3. **What happens when admin clicks Upload from inside the library while the field opening it expects single-mode?** Library is in single mode → after upload, immediately call onSelect with the new URL and close? Or stay open so they can pick differently?
   - **Recommend**: stay open. Upload finishes → new thumbnail appears at top → admin clicks it → confirm. Predictable; same flow whether ANY thumbnail or just-uploaded.

4. **Sort order in grid?**
   - **Recommend**: newest first (mtime DESC). Admins usually look for "the thing I just uploaded".

5. **Search behavior — case sensitive?**
   - **Recommend**: case-insensitive substring match. Standard for search inputs.

## Implementation Strategy (Sketch)

### Backend (~1h)
```
Controllers/mediaController.js:
  - getMedia(req, res):
      const dir = path.join(__dirname, '..', 'uploads');
      const entries = await fs.promises.readdir(dir);
      const stats = await Promise.all(entries.map(async name => {
          const st = await fs.promises.stat(path.join(dir, name));
          if (!st.isFile()) return null;
          return { url: '/uploads/' + name, name, size: st.size, mtime: st.mtimeMs };
      }));
      const files = stats.filter(Boolean)
                         .sort((a, b) => b.mtime - a.mtime)
                         .slice(0, MEDIA_LIST_LIMIT);
      res.json({ success: true, data: files });

app.js: app.get('/api/admin/media', mediaController.getMedia);
config/constants.js: MEDIA_LIST_LIMIT = 200
```

### Migration (~2h)
```
config/migrate_to_uploads.js:
  - Recursively walk images/, move each file to uploads/ (skip if dest exists)
  - For subfolders, prefix file name with subfolder to avoid collision
  - UPDATE settings SET setting_value = REPLACE(setting_value, '/images/', '/uploads/') WHERE setting_key IN ('logo','main_image') AND setting_value LIKE '/images/%'
  - Similar UPDATEs for services.image_path, footer_persons.avatar_path, projects.image_path, tableimages.image_path
  - Also handle bare-filename rows: UPDATE ... SET image_path = CONCAT('/uploads/', image_path) WHERE image_path != '' AND image_path NOT LIKE '/uploads/%' AND image_path NOT LIKE 'data:%'
  - Print summary
```

### Frontend popup (~5h)
```
Views/admin/index.html: append <div id="media-modal" class="modal"> with structure:
  - Header: "Thư viện ảnh" + Upload btn + search input + close X
  - Body: <div id="media-grid"></div>
  - Footer: Cancel + "Chọn (N)" confirm

Views/admin/script.js: ~250 LOC
  - openMediaLibrary({ mode, onSelect })
  - loadMediaGrid() — fetch + render
  - mediaUpload() — POST to existing /api/admin/projects/upload, prepend result to grid, auto-select if mode allows
  - mediaSearch(query) — client-side filter
  - Selection state: Set<string> of URLs
  - mediaConfirm() — invoke onSelect(Array.from(selected)) then close
  - mediaCancel() — close without callback

Views/admin/style.css: ~80 LOC
  - .media-modal-content { width:90%; max-width:1100px; max-height:85vh }
  - .media-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px }
  - .media-item { aspect-ratio:1/1; cursor:pointer; border:2px solid transparent; border-radius:6px }
  - .media-item.selected { border-color:#27ae60 }
  - .media-item img { width:100%; height:100%; object-fit:cover }
  - .media-check (corner checkmark for multi) { ... }
```

### Wire to existing fields (~1.5h)
Replace each existing direct file upload handler with `openMediaLibrary({mode, onSelect})`:
```
Settings logo:        mode:'single', onSelect: ([url]) => { setLogoPath(url); refreshPreview('settings'); }
Settings main_image:  mode:'single', onSelect: ([url]) => { setMainImagePath(url); ... }
Services slot N:      mode:'single', onSelect: ([url]) => { card.dataset.imagePath = url; ...; refreshPreview('services'); }
Footer slot N:        mode:'single', onSelect: ([url]) => { card.dataset.avatarPath = url; ...; refreshPreview('footer'); }
Project thumbnail:    mode:'single', onSelect: ([url]) => { ... }
Project tableimages:  mode:'multi',  onSelect: (urls) => { urls.forEach(u => currentProjectImages.push({image_path:u, isNew:true})); rerenderProjectImages(); }
```

## Effort & Time Estimate

| Step | Effort |
|------|--------|
| Backend mediaController + route + constants | 1 h |
| Migration script (file move + DB UPDATE for 5 tables) | 2 h |
| Frontend modal HTML | 0.5 h |
| Frontend popup JS (openMediaLibrary, grid, upload, search, multi-select) | 4 h |
| Frontend popup CSS | 1 h |
| Wire 6 image fields | 1.5 h |
| Drop `/images` mount + update SETUP_GUIDE | 0.5 h |
| Smoke test (manual: each field → library → upload → pick → save → reload) | 1.5 h |
| **Total** | **~12 h (1.5 day)** ← under spec time-box |

## Resolved Decisions (from /feature-explore)

1. ✅ **Multi-mode upload-then-auto-select** — YES. After Upload returns the new URL, auto-add to selection set so admin can confirm immediately.
2. ✅ **Project thumbnail field** — REPLACE the existing per-field upload with a "Chọn ảnh" button that opens the library. One mental model across all image fields.
3. ✅ **Single-mode upload from inside library** — stay open. New thumbnail appears at top of grid; admin still has to click it then confirm. Predictable flow regardless of source.
4. ✅ **Sort order** — newest first (mtime DESC). Admins look for what they just uploaded.
5. ✅ **Search behavior** — case-insensitive substring (`.toLowerCase().includes(query.toLowerCase())`).

## Recommendation

**Proceed to `/feature-plan`** with Approach A (+ Approach C spirit: replace per-field upload with library trigger). 3 features identified:

- **F01** — Migration: file move + DB UPDATE + drop `/images` mount
- **F02** — Backend `mediaController` + popup component (HTML + CSS + JS)
- **F03** — Wire 6 image fields to `openMediaLibrary()`, removing existing per-field upload buttons
