# F03 — Wire all admin image fields to the Media Library

## Feature

Replace every per-field direct file-upload UI in admin with a single "Chọn ảnh" button that opens the Media Library via `openMediaLibrary({ mode, onSelect })` from F02. This removes 6+ duplicated hidden `<input type="file">` patterns and their `change` handlers. After F03, the library is the **only** way to add or pick images in admin — admins can't bypass it by habit, which is what makes the "no duplicate" promise actually stick (per brainstorm rationale for Approach C spirit).

## Scope

**UI** (depends on F01 + F02) — affected files:

- `Views/admin/index.html` — swap upload buttons for library triggers in Settings card + delete the `<input type="file">` per upload site (4 locations)
- `Views/admin/script.js` — replace `change` handlers on `logo-file-input`, `main-image-file-input`, per-card `.svc-file-input`, `.fp-file-input`, project-modal media-upload, and project tableimages "Add Image" with `openMediaLibrary({...})` calls (6 wire sites)
- `Views/admin/style.css` — minor: ensure the new "Chọn ảnh" button has the same `.btn-add` styling already used

## Implementation

> **Project constraints applied**: C6 (admin UI section pattern preserved — only the upload UI inside each section changes), C7 (no new HTML for user-supplied strings — all DOM-building happens inside F02's library which already uses `textContent`).

### Wire Site 1 — Settings: Logo

**Current** ([Views/admin/index.html](../../../../../Views/admin/index.html) Dashboard section):
```html
<button type="button" class="btn-add" id="logo-upload-btn">
    <i class="fas fa-upload"></i> Upload Logo
</button>
<input type="file" id="logo-file-input" accept="image/*" style="display:none">
<button type="button" class="btn-cancel" id="logo-remove-btn" style="display:none" onclick="removeLogoImage()">
    <i class="fas fa-times"></i> Remove
</button>
```

**Change to**:
```html
<button type="button" class="btn-add" id="logo-pick-btn">
    <i class="fas fa-images"></i> Chọn ảnh logo
</button>
<button type="button" class="btn-cancel" id="logo-remove-btn" style="display:none" onclick="removeLogoImage()">
    <i class="fas fa-times"></i> Remove
</button>
```
(Delete the `<input type="file">` and rename the picker button.)

**JS** ([Views/admin/script.js](../../../../../Views/admin/script.js) — around line 164-178, the `setupSettingsUploadHandlers` function or equivalent):

Replace:
```js
const logoBtn = document.getElementById('logo-upload-btn');
const logoInput = document.getElementById('logo-file-input');
if (logoBtn && logoInput) {
    logoBtn.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            currentLogoFile = e.target.files[0];
            const previewUrl = URL.createObjectURL(currentLogoFile);
            document.getElementById('current-logo-img').src = previewUrl;
            document.getElementById('current-logo-img').style.display = 'block';
            document.getElementById('logo-preview-placeholder').style.display = 'none';
            document.getElementById('logo-remove-btn').style.display = 'inline-flex';
            const reader = new FileReader();
            reader.onload = () => {
                window._pendingLogoDataUrl = reader.result;
                postPreviewData('settings');
            };
            reader.readAsDataURL(currentLogoFile);
        }
    });
}
```

With:
```js
const logoBtn = document.getElementById('logo-pick-btn');
if (logoBtn) {
    logoBtn.addEventListener('click', () => {
        openMediaLibrary({
            mode: 'single',
            onSelect: ([url]) => {
                currentLogoFile = null;                       // no pending File — already uploaded
                currentLogoPath = url;                        // immediate commit to in-memory state
                window._pendingLogoDataUrl = null;            // clear stale data URL
                document.getElementById('current-logo-img').src = url;
                document.getElementById('current-logo-img').style.display = 'block';
                document.getElementById('logo-preview-placeholder').style.display = 'none';
                document.getElementById('logo-remove-btn').style.display = 'inline-flex';
                postPreviewData('settings');
            }
        });
    });
}
```

**Why simpler**: the library has already uploaded the file (via its own Upload button if new, or already exists otherwise). The URL returned is a real `/uploads/x.jpg` ready to save. No FileReader, no blob URL, no pending state.

### Wire Site 2 — Settings: Main image

Same shape as Site 1. Rename button to `id="main-image-pick-btn"`, delete `<input type="file" id="main-image-file-input">`, replace the change handler with `openMediaLibrary({mode:'single', onSelect: ([url]) => { ... currentMainImagePath = url; ... }})`. In the existing handler, `e.target.files[0]` is replaced by the URL; everything else (preview img src, placeholder hide, remove-btn show, `postPreviewData('settings')`) is identical.

### Wire Site 3 — Services per-card upload

**Current** (inside `loadHomeServices()` in [Views/admin/script.js](../../../../../Views/admin/script.js)):
```html
<button type="button" class="btn-add svc-upload-btn"><i class="fas fa-upload"></i> Upload</button>
<input type="file" class="svc-file-input" accept="image/*" style="display:none">
```
and the change handler that calls `uploadHomeImage(file)`.

**Change**:
- Card markup: drop `<input class="svc-file-input">`; change button text to `<i class="fas fa-images"></i> Chọn ảnh`
- Handler: replace the `fileInput.addEventListener('change', async () => { const path = await uploadHomeImage(file); ... })` block with:

```js
card.querySelector('.svc-upload-btn').addEventListener('click', () => {
    openMediaLibrary({
        mode: 'single',
        onSelect: ([url]) => {
            imgEl.src = url;
            imgEl.style.display = 'block';
            placeholderEl.style.display = 'none';
            card.dataset.imagePath = url;
            postPreviewData('services');
            showToast('Đã chọn ảnh — bấm Save để lưu', 'success');
        }
    });
});
```

### Wire Site 4 — Footer per-card avatar

Same shape as Site 3 but for the footer card's `.fp-upload-btn` / `.fp-file-input` / `.fp-avatar-preview`. The callback updates `card.dataset.avatarPath`, the preview `<img>` src, and calls `postPreviewData('footer')`.

### Wire Site 5 — Project edit modal: thumbnail (`image_path`)

The Project modal in [Views/admin/index.html](../../../../../Views/admin/index.html) has its own media upload area (`.media-upload-area`) for the project's thumbnail.

**Current** structure (around line 290-310):
```html
<div class="media-upload-area" id="media-upload-area">
    <input type="file" id="project-media-input" accept="image/*" style="display:none">
    <div class="media-upload-placeholder" id="media-upload-placeholder">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Click hoặc kéo thả ảnh vào đây</p>
        <span>JPG, PNG, WebP (max 50MB)</span>
    </div>
    <div class="media-preview" id="media-preview" style="display:none">
        <img id="media-preview-img" src="" alt="">
        <button type="button" class="media-remove-btn" onclick="removeProjectMedia()"><i class="fas fa-times"></i></button>
    </div>
</div>
```

**Change** the placeholder/click behavior — instead of triggering the hidden file input, open the library:

In `script.js`, find the section that wires the `media-upload-area` click (probably calls `document.getElementById('project-media-input').click()`) and replace:

```js
document.getElementById('media-upload-area').addEventListener('click', () => {
    openMediaLibrary({
        mode: 'single',
        onSelect: ([url]) => {
            currentProjectImagePath = url;   // or whatever in-memory var the project modal uses
            document.getElementById('media-preview-img').src = url;
            document.getElementById('media-preview').style.display = 'block';
            document.getElementById('media-upload-placeholder').style.display = 'none';
        }
    });
});
```
Delete the `<input type="file" id="project-media-input">` and any drag-drop handlers (those become dead code without the file input).

### Wire Site 6 — Project edit modal: tableimages (multi)

**Current**: the project modal has an "Add Image" button (`.image-upload-trigger` in [Views/admin/style.css](../../../../../Views/admin/style.css)) that adds one image at a time via direct upload, pushing to `currentProjectImages`.

**Change**: clicking the trigger opens the library in **multi mode**. After confirm, push every selected URL into `currentProjectImages`:

```js
document.querySelector('.image-upload-trigger').addEventListener('click', () => {
    openMediaLibrary({
        mode: 'multi',
        onSelect: (urls) => {
            urls.forEach(url => {
                currentProjectImages.push({
                    id: null,                 // will be persisted on project save
                    image_path: url,
                    display_order: currentProjectImages.length + 1,
                    isNew: true
                });
            });
            renderProjectImageThumbs();   // existing helper that paints the thumbs row
            showToast('Đã thêm ' + urls.length + ' ảnh', 'success');
        }
    });
});
```

### UI Components (summary)

| Wire site | Before (per-field) | After |
|-----------|--------------------|-------|
| Settings logo | hidden file input + Upload + Remove | "Chọn ảnh logo" button (opens library, mode:single) + Remove |
| Settings main image | hidden file input + Upload + Remove | "Chọn ảnh main" button (opens library, mode:single) + Remove |
| Services × 3 cards | hidden file input + Upload per card | "Chọn ảnh" button per card (mode:single) |
| Footer × 2 cards | hidden file input + Upload per card | "Chọn ảnh" button per card (mode:single) |
| Project modal thumbnail | clickable drop area + file input | clickable area opens library (mode:single) |
| Project modal tableimages | "Add Image" → file picker | "Add Image" → library (mode:multi), can pick N at once |

### DB / KV Changes

None.

## Definition of Done

- [ ] No `<input type="file">` remains in `Views/admin/index.html` for any image field. (The library's own internal `#media-upload-input` is the only one.)
- [ ] `grep -n 'logo-file-input\|main-image-file-input\|svc-file-input\|fp-file-input\|project-media-input' Views/admin/script.js Views/admin/index.html` returns nothing
- [ ] `grep -c 'openMediaLibrary' Views/admin/script.js` returns ≥ 6 (one per wire site)
- [ ] Settings logo: click "Chọn ảnh logo" → library opens → pick → preview thumbnail updates → Save → reload → persisted
- [ ] Service slot 1: click "Chọn ảnh" → library opens → pick → card preview updates → live-preview iframe updates within debounce window → Save → reload → persisted
- [ ] Footer slot 1: click "Chọn ảnh" avatar → library opens → pick → avatar preview updates → Save → reload → persisted
- [ ] Project modal: open Add Project → click thumbnail area → library opens → pick → preview shows
- [ ] Project modal tableimages: click "Add Image" → library opens **multi-mode** → pick 3 thumbs → confirm → 3 thumbnail tiles appear in project's image list → save project → reload → 3 tableimages rows persisted
- [ ] Upload from library: any context → click Upload inside library → pick new JPG → uploads OK → appears at top of grid → admin clicks + confirm → field receives the URL
- [ ] No `URL.createObjectURL` calls remain in the per-field handlers (they used to be there for instant blob preview; replaced by direct `/uploads/x.jpg` URL)
- [ ] Live preview iframe (F02 of prior plan) still updates after library pick — verify by editing logo, watching the preview pane refresh after the `postPreviewData('settings')` call

## Test Checklist

1. **@happy** — Settings logo end-to-end:
   - Open admin → Dashboard
   - Click "Chọn ảnh logo" → library opens
   - Click an existing thumb → checkmark appears (single-mode)
   - Click "Chọn (1)" → library closes
   - Logo preview thumbnail in admin updates → live-preview iframe shows new logo within ~300 ms
   - Click "Save Changes" → success toast → reload admin → logo persists
   - Open `/main` → logo shows in header

2. **@multi** — Project tableimages:
   - Edit existing project → click "Add Image"
   - Library opens in multi-mode (Confirm button shows "(0)")
   - Click 3 thumbs → Confirm reads "(3)"
   - Confirm → library closes → 3 tiles appear in project's image strip
   - Save project → reload → 3 `tableimages` rows present (verify via `SELECT * FROM tableimages WHERE project_id = ?`)

3. **@reuse** — same image picked twice:
   - Upload `kitchen.jpg` via library (Settings logo flow) → set as logo → Save
   - In Services slot 1: click "Chọn ảnh" → library opens → see `kitchen.jpg` STILL there (filesystem-backed, not consumed)
   - Pick it → Save → reload → both `settings.logo` AND `services.image_path[slot=1]` point at the SAME `/uploads/...` URL

4. **@no-duplicate-upload** — verify admin no longer creates duplicates by accident:
   - Note current count: `ls uploads/ | wc -l`
   - Pick existing image in Settings logo → Save
   - Count again: SAME (no new file)
   - vs. before F03: count would have grown by 1 even for picking existing

5. **@removed-handlers** — old code is gone:
   ```bash
   grep -n "currentLogoFile\b" Views/admin/script.js    # zero or only legacy assignments to null
   grep -n "URL.createObjectURL" Views/admin/script.js  # zero (was used in old per-field handlers)
   ```

6. **@auth** — library inherits admin auth gate from F02; this feature doesn't add new endpoints

7. **@responsive** — on mobile (768px), library grid still renders 3-4 columns and is usable for selection

## Files Created

None.

## Files Modified

| File | Change |
|------|--------|
| `Views/admin/index.html` | Drop 4–6 `<input type="file">` instances + rename upload buttons; net -~20 lines |
| `Views/admin/script.js` | Replace per-site change handlers (~100 LOC) with `openMediaLibrary` calls (~30 LOC); net -~70 lines |
| `Views/admin/style.css` | None expected (Chọn ảnh button reuses `.btn-add`); minor tweak if button label overflows |
