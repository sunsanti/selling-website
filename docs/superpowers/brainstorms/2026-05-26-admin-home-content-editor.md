# Brainstorm: Admin Home Content Editor

**Source:** [docs/superpowers/specs/2026-05-26-admin-home-content-editor.md](../specs/2026-05-26-admin-home-content-editor.md)
**Date:** 2026-05-26

## Context Loaded

- ✅ Spec read in full
- ✅ Wiki: local `wiki/` folder (12 articles authored earlier). No `docs/knowledge/wiki/`
- ✅ Constraint gate triggered (API routes + DB schema + auth)
- ✅ Project conventions injected from [wiki/02-kien-truc.md](../../../wiki/02-kien-truc.md), [wiki/04-api-routes.md](../../../wiki/04-api-routes.md), [wiki/06-models.md](../../../wiki/06-models.md), [wiki/07-services.md](../../../wiki/07-services.md), [wiki/09-bao-mat.md](../../../wiki/09-bao-mat.md)

## Project Constraints (Inject)

| # | Constraint | Source |
|---|------------|--------|
| C1 | All `/api/admin/*` routes go behind `requireAuth` middleware (mount applied in [app.js](../../../app.js)). Don't bypass | wiki/04, app.js |
| C2 | Public read endpoints live under `/api/public/*` and skip auth — pattern from `/api/public/projects`, `/api/public/settings` | wiki/04, app.js |
| C3 | Image upload uses [`uploadService.js`](../../../Services/uploadService.js) — multer disk storage, fileFilter image-only (jpg/png/webp/gif), 50 MB max, lives in `/uploads/`. Filename = `<timestamp>-<rand>.<ext>` | wiki/07 |
| C4 | DB migrations are idempotent — extend [`config/migrate_db_schema.js`](../../../config/migrate_db_schema.js) using `information_schema` checks. Never blind-create | wiki/03, prior commit pattern |
| C5 | Model layer uses prepared statements (`pool.query(sql, [params])`). No string interpolation in SQL | wiki/06 |
| C6 | Admin UI section pattern: `<section id="…" class="content-section">` in [`Views/admin/index.html`](../../../Views/admin/index.html), nav link `data-section="…"` in sidebar, fetch+render in [`Views/admin/script.js`](../../../Views/admin/script.js) | wiki/08 |
| C7 | Render user-supplied strings via `textContent` (NOT `innerHTML`) — XSS gate. Existing project violates this in a few places; new code must be clean | wiki/09 #9 |
| C8 | Image path normalize: DB stores filename or `/uploads/x.jpg`; controllers prepend `/images/` for legacy. Convention: store full URL path (`/uploads/…`) and use as-is in HTML | wiki/03 |

## Spec ↔ Wiki Conflicts

None. Spec is internally consistent with existing patterns.

## Approach Variations (3)

### Approach A — 3 dedicated sidebar sections (mirror existing pattern)

Each new section is a top-level sidebar item like Projects/Contacts/Accounts:
- `Home → About` (1 form, ~10 fields)
- `Home → Services` (3 cards, each with title/desc/image)
- `Home → Footer` (2 cards, each with avatar/name/email/2 phones/FB)

**Pros**:
- ✅ Matches existing admin UX exactly (C6). Zero new patterns to learn
- ✅ Each section is independently testable, deployable, revertable
- ✅ Per-card save = small blast radius (1 fail ≠ all fail)

**Cons**:
- ⚠️ Sidebar grows from 4 items → 7. Acceptable on desktop; on mobile (icon-only sidebar), 7 icons still fit
- ⚠️ Some text/code duplication across 3 controllers (similar GET/PUT pattern)

**Constraint check**: All pass.

### Approach B — Single "Home Content" parent with sub-tabs

One sidebar item "Home Content" → on click, main panel shows secondary tab strip (About | Services | Footer).

**Pros**:
- ✅ Sidebar stays minimal (5 items)
- ✅ User can navigate inside "Home" without losing place

**Cons**:
- ⚠️ New UX pattern (sub-tabs) — admin currently has no nested navigation. Adds ~50 lines CSS + JS
- ⚠️ Breaks `data-section` 1-to-1 contract used everywhere in `script.js`
- ⚠️ On mobile (sidebar 50–60 px), sub-tabs still need labels → forces tab strip wider than column

**Constraint check**: C6 violation — introduces nested section pattern not present in codebase.

### Approach C — Live edit-in-place on /admin/home-preview

Render `/main` inside an iframe in admin panel. Hover a section → edit button → modal form. Save reloads iframe.

**Pros**:
- ✅ Truest "preview" — see exact final rendering
- ✅ Less form to design (modal is per-section)

**Cons**:
- 🔴 Requires postMessage between iframe and parent (cross-origin or same-origin handshake)
- 🔴 CSS hover/click detection on iframe content is fragile
- 🔴 Mobile: iframe of full page in tiny viewport is unreadable
- 🔴 Effort 3–5× vs A; user said "hiếm khi đổi" → severe overbuild
- ⚠️ Image upload UX still needs traditional form anyway

**Constraint check**: Adds complexity beyond MVP scope. Effort vs value: bad ratio.

### Recommendation

**Approach A.** Reasons:
1. Matches existing admin pattern (C6) — lowest cognitive cost when 6 months later someone debugs
2. Per-card save isolates failures — image upload error on Service 1 doesn't lose Footer Person 2's pending edit
3. Sidebar gets 7 items, fits Desktop + iPad + mobile (icon-only on phone) without UX strain
4. Sub-tabs (B) adds new pattern for marginal sidebar real estate; not worth it
5. Live-edit (C) explicitly out of scope per spec (user picked "Inline thumbnail/text preview")

## Edge Cases & Failure Modes

### Render-time

| # | Case | Risk | Mitigation |
|---|------|------|-----------|
| E1 | Empty/null banner from DB | Render shows blank section, looks broken | DB columns `NOT NULL DEFAULT ''`; render hides parent element if all relevant fields empty (`if (!data.banner) hide()`) |
| E2 | Banner contains `<script>...</script>` | XSS execution on every visitor | Always render via `textContent` (C7). NEVER `innerHTML` for user-controlled strings |
| E3 | Long text overflows mobile layout | Cards break visual rhythm | Backend: cap fields at 2000 chars (textarea `maxlength`); CSS already has `word-break: break-word` in mobile breakpoints |
| E4 | DB connection drops during page load | Public renders fall back to nothing → page looks half-built | Each fetch in `<script>` has `.catch(() => {})` already; section just renders empty. Acceptable for rare event |
| E5 | Footer person image 404 (file deleted manually) | Broken image icon | `<img onerror="this.style.display='none'">` pattern already used for logo |

### Migration-time

| # | Case | Risk | Mitigation |
|---|------|------|-----------|
| E6 | Migration runs twice (manual + accidental) | Tables created twice, INSERT seed twice | `CREATE TABLE IF NOT EXISTS` (idempotent), `INSERT IGNORE` for seeds, `hasTable()` helper in migrate_db_schema.js already exists |
| E7 | Migration runs but seed fails | Empty tables → render shows empty page | Wrap seed in `INSERT IGNORE` so re-run completes; print explicit warning if rowcount==0 |
| E8 | About table seeded with 2 rows (developer mistake) | Public render gets array, picks `[0]` → unpredictable | Use `id=1` PRIMARY KEY constant and `SELECT WHERE id=1`; never SELECT * |

### Admin UX

| # | Case | Risk | Mitigation |
|---|------|------|-----------|
| E9 | Admin uploads new image then closes tab without save | Orphan file in `/uploads/` | Accept for MVP. Document in artifact for future cleanup job. (Note in [wiki/11-audit-report.md](../../../wiki/11-audit-report.md) sprint 3) |
| E10 | Admin saves with no image but slot had old one | Old image path overwritten with empty? Render breaks | Save logic: if `image_path` field empty in payload → keep existing DB value (don't `SET image_path = ''`) |
| E11 | Two admins edit same About concurrently | Last write wins, silent overwrite | Acceptable for "hiếm khi đổi" + small team. No optimistic locking needed |
| E12 | Save button clicked twice (network slow) | Duplicate API call | `disabled` button while in-flight (pattern from existing project save) |

### Security

| # | Case | Risk | Mitigation |
|---|------|------|-----------|
| E13 | Unauthenticated CRUD on `/api/admin/about` | DB corruption by random visitor | `requireAuth` mount at `/api/admin` already covers (C1). Verify new routes are under that prefix |
| E14 | XSS via banner field rendered by admin preview | Admin compromised | textContent in admin preview render too (not just public) |
| E15 | Image upload bypass — direct POST with `.svg` | SVG can carry script | uploadService fileFilter MIME check already rejects (C3). Test with explicit case |
| E16 | facebook_url contains `javascript:` scheme | Click executes script | Render with `rel="noopener noreferrer"` + validate URL starts with `https://` on save |

### Public-page render performance

| # | Case | Risk | Mitigation |
|---|------|------|-----------|
| E17 | Page makes 5+ fetches on load (settings + projects + about + services + footer) | First paint slow on 3G | Acceptable for MVP. Sprint 2 audit item D2 (compression) + D3 (cache headers) covers this generally. Optional: batch endpoint `/api/public/home` returning all in one — defer |
| E18 | Cascading layout shift as each fetch resolves | Janky load | Sections start hidden, fade in when populated. Or static skeleton sized to match expected content |

## Key Risks (Ranked)

1. 🔴 **XSS via user-supplied text** — every render path must use `textContent`. Easy to forget. Add an inline comment in render code; consider a tiny helper `function setText(id, val) { document.getElementById(id).textContent = val || ''; }`
2. 🟠 **Image orphans** — admins will upload + abandon. Acceptable for MVP, schedule cleanup later
3. 🟠 **Render flicker / layout shift** — 3 new fetches at page load. Mitigate by skeleton placeholders sized to content
4. 🟡 **Migration partial failure on prod** — wrap seed inserts in try/catch with explicit logging; document re-run procedure in SETUP_GUIDE
5. 🟡 **Last-write-wins on concurrent edit** — accepted explicitly

## Open Questions for /feature-plan

1. **Save granularity**: per-card save button OR a single "Save All" per section?
   - Per-card recommended (E10 isolation). Sub-decision per Services + Footer
2. **Auto-hide empty sections**: if banner string empty, hide entire About-banner block, or render with empty space?
   - Recommend: render even if empty in admin view; on public, hide block if all-empty
3. **Cancel / dirty form warning**: bypass for MVP or add `onbeforeunload` guard?
   - Recommend skip — matches existing admin behavior (no dirty check elsewhere)
4. **About stats — flexible count?**: spec says 4 fixed. Should the migration store them as `stat1_*, stat2_*, ...` columns or as a separate `about_stats(slot, num, label)` table for future flexibility?
   - Recommend: separate child table `about_stats(slot UNIQUE)` from day 1. Same effort as flat columns and removes a future migration. Updates the spec slightly
5. **`facebook_url` validation depth**: just `https://` prefix check, or also domain whitelist (facebook.com only)?
   - Recommend: only `https://` prefix + reject `javascript:`. Domain whitelist is over-strict (Instagram, LinkedIn might come later)

## Public-Page Render Strategy

Pattern: extend existing `<script>` block in [Views/main/index.html](../../../Views/main/index.html) (already contains `loadSettings()`, `loadProjectsFromDB()`).

Add 3 new functions:
```js
async function loadAboutSection() { /* fetch /api/public/about, set textContent on elements */ }
async function loadServices() { /* fetch /api/public/services, render 3 cards */ }
async function loadFooterPersons() { /* fetch /api/public/footer-persons, render 2 cards */ }
```

Each replaces the hardcoded HTML by setting `textContent`/`src` on existing elements with stable IDs:
- About: `#about-banner`, `#about-paragraph-left`, `#about-paragraph-right`, `#about-stat-1-num`, `#about-stat-1-label`, …
- Services: `#service-1-title`, `#service-1-desc`, `#service-1-img`, …
- Footer: `#footer-person-1-name`, `#footer-person-1-avatar`, `#footer-person-1-email`, …

This avoids `innerHTML` entirely → XSS-safe by construction.

## Effort & Time Estimate (per Approach A)

| Step | Effort |
|------|--------|
| DB migration extension (3 tables + seed) | 1.5 h |
| 3 models (`aboutSectionModel`, `serviceModel`, `footerPersonModel`) | 2 h |
| 6 API routes (3 admin GET/PUT, 3 public GET) + register in app.js | 2 h |
| 3 admin HTML sections + sidebar nav | 3 h |
| Admin script: 3 load+save+upload handlers w/ inline previews | 4 h |
| Main page: 3 render functions + stable IDs in HTML | 2.5 h |
| Cleanup hardcoded HTML in main, replace with placeholder elements | 1 h |
| Smoke test (manual: load, edit, save, refresh on /main) | 1 h |
| **Total** | **~17 h (2 days)** ← matches spec time-box |

## Recommendation

**Proceed to `/feature-plan`** with Approach A. Settle open question #4 (flat columns vs separate `about_stats` table) before running plan — easier to bake decision in once than refactor mid-plan.

Strongly suggest the plan include a small XSS-safe render helper (per "Key Risks #1") and updates the spec's `about_section` schema to use child table `about_stats` (per Open Question #4) for negligible cost.
