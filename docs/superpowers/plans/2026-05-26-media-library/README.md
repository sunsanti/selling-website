# Media Library — Plan

**Status:** ready
**Spec:** [../../specs/2026-05-26-media-library.md](../../specs/2026-05-26-media-library.md)
**Brainstorm:** [../../brainstorms/2026-05-26-media-library.md](../../brainstorms/2026-05-26-media-library.md)
**Executor:** `/feature-build 2026-05-26-media-library`

## Features

| ID  | Name | Scope | Effort |
|-----|------|-------|--------|
| F01 | Migration to single `uploads/` + drop `/images` mount | Full-stack (FS + DB + server) | ~2.5 h |
| F02 | Media library backend + reusable popup | Full-stack (API + UI) | ~6.5 h |
| F03 | Wire 6 admin image fields to `openMediaLibrary()` | UI (admin) | ~2 h |

**Total:** ~11 h (1.5 days). Under spec time-box (2 days).

## File Manifest

- [`specs/F01-migration-to-uploads.md`](specs/F01-migration-to-uploads.md) — migration script with full code + DoD + 7 test cases
- [`specs/F02-media-library-backend-and-popup.md`](specs/F02-media-library-backend-and-popup.md) — backend route + modal HTML/CSS/JS with full code
- [`specs/F03-wire-image-fields-to-library.md`](specs/F03-wire-image-fields-to-library.md) — 6 wire sites with before/after diff
- [`project.json`](project.json) — feature graph + phase gate commands
- [`README.md`](README.md) — this file

## Dependency Order

```
F01 (migration foundation)
  └─→ F02 (backend + popup)
        └─→ F03 (wire fields)
```

Strictly sequential for solo dev: **F01 → F02 → F03**.

- F02 depends on F01 because the popup lists files from `/uploads/` and assumes there is no legacy `/images/` path to handle anymore.
- F03 depends on F02 because every wire site calls `openMediaLibrary({...})` which doesn't exist until F02 lands.

## Key Decisions Baked In

| # | Decision | Source |
|---|----------|--------|
| D1 | Approach A — global modal in `admin/index.html` + helper in `admin/script.js` (no separate JS file) | brainstorm |
| D2 | Approach C spirit — replace per-field upload UI entirely; library is the only path | brainstorm + idea-refine |
| D3 | Filesystem-only listing (no DB `media` table) — `fs.readdir` + `stat` + sort by mtime DESC | spec |
| D4 | 200 newest files cap (`MEDIA_LIST_LIMIT`) — admin currently has < 50 | spec |
| D5 | Client-side search via `.toLowerCase().includes(query)` — no backend search endpoint | resolved decision #5 |
| D6 | Multi-mode upload auto-adds new file to selection set | resolved decision #1 |
| D7 | Single-mode upload stays open after new upload — admin still has to click + confirm | resolved decision #3 |
| D8 | Sort order: newest mtime first | resolved decision #4 |
| D9 | Reuse existing `/api/admin/projects/upload` endpoint for new uploads inside library | brainstorm (rename deferred) |
| D10 | Migration: `fs.existsSync` guard for moves; SQL `WHERE NOT LIKE '/uploads/%'` for rewrites — idempotent | C4 |
| D11 | Filename rendered via `textContent` to prevent XSS (even though multer assigns safe names, filenames in `uploads/` could be added manually) | C7 |
| D12 | Media modal z-index 1100 (above `project-modal` at 1000) — supports modal-stacked scenarios | edge case L10 |
| D13 | No DELETE in MVP (no reverse-index of usage yet) — Sprint 2+ feature | spec |
| D14 | No hash dedupe in MVP — admins uploading the same byte-stream twice still produces two distinct files | spec |
| D15 | Subfolder collision in migration handled with subfolder-prefixed filename (`footer-Long.jpg`); `fs.existsSync` skip on second collision | edge case M7 |

## Risks Carried Forward

1. 🟠 **Migration must run before deploy** — code drops `/images` mount, so any DB row still pointing at `/images/...` will 404 on render. Mitigation: `SETUP_GUIDE.md` upgrade procedure (F01).
2. 🟠 **Subfolder filename collisions** in `images/` — script handles via prefix, falls back to skip-with-warning if both names exist. Manual cleanup required for that edge case.
3. 🟡 **No hash dedupe** — admin can still upload the same byte-stream twice and get two distinct filenames; library shows both. Sprint 2 follow-up.
4. 🟡 **`admin/script.js` size growth** — 1300 → 1480 LOC after F02 + F03 (some old code removed by F03). Still single-file; split if/when painful.
5. 🟡 **Z-index conflict** — library at 1100 vs project-modal at 1000 — covered by F02 CSS, but worth verifying with both open in a test.

## Verification Strategy

Each feature has its own DoD + Test Checklist in spec. Phase gates in [project.json](project.json) define automated + manual checks before next feature.

### Quick smoke after each feature

| After | Smoke command |
|-------|---------------|
| F01 | `ls images/ \| wc -l` → 0; `curl http://localhost:5500/images/x.jpg` → 404; `curl http://localhost:5500/uploads/x.jpg` → 200 |
| F02 | Open admin → DevTools → `openMediaLibrary({mode:'single', onSelect: u => console.log(u)})` → modal appears + grid populated |
| F03 | Settings logo → "Chọn ảnh logo" → library → pick → preview updates → Save persists |

## Next Step

```
/feature-build 2026-05-26-media-library
```

Sequential execution recommended (F01 → F02 → F03). `/feature-build` will:
- Run TDD-equivalent (smoke + curl) per feature
- Pause at each phase gate for verification
- Commit each feature atomically
- Track state in `docs/superpowers/plans/.state/2026-05-26-media-library.json` for resumability
