# Admin Home Content Editor — Plan

**Status:** ready
**Spec:** [../../specs/2026-05-26-admin-home-content-editor.md](../../specs/2026-05-26-admin-home-content-editor.md)
**Brainstorm:** [../../brainstorms/2026-05-26-admin-home-content-editor.md](../../brainstorms/2026-05-26-admin-home-content-editor.md)
**Executor:** `/feature-build 2026-05-26-admin-home-content-editor`

## Features

| ID  | Name | Scope | Effort |
|-----|------|-------|--------|
| F01 | Backend foundation — schema, models, routes | Full-stack (API + DB) | ~5.5 h |
| F02 | Admin UI — About / Services / Footer sections | UI (admin) | ~7 h |
| F03 | Public render — replace hardcoded sections | UI (public) | ~4.5 h |

**Total:** ~17 h (2 work days). Matches spec time-box.

## File Manifest

- [`specs/F01-backend-foundation.md`](specs/F01-backend-foundation.md) — schema + models + controllers + routes with full code
- [`specs/F02-admin-ui.md`](specs/F02-admin-ui.md) — 3 admin sections + form handlers + image upload
- [`specs/F03-public-render.md`](specs/F03-public-render.md) — DOM-based render (XSS-safe) replacing hardcoded HTML
- [`project.json`](project.json) — feature graph + phase gate commands
- [`README.md`](README.md) — this file

## Dependency Order

```
F01 ─┬─→ F02 (admin UI)
     └─→ F03 (public render)
```

F02 and F03 are independent — can be implemented in parallel after F01 lands. Recommend sequential for solo dev: F01 → F02 → F03 (validate admin works before swapping public).

## Key Decisions Baked In (from /idea-refine + /feature-explore)

| # | Decision | Reasoning |
|---|----------|-----------|
| D1 | Per-section tables (not JSON blob, not settings keys) | Maintainable, uniform with existing project/contact/account pattern |
| D2 | `about_stats` child table with `slot UNIQUE` (not flat columns) | Removes future ALTER if stat count ever changes |
| D3 | Per-card save buttons (Services + Footer) | Isolates blast radius — 1 upload fail ≠ all saves lost |
| D4 | Inline thumbnail preview (not iframe live edit) | Matches existing logo upload UX; user picked it explicitly |
| D5 | textContent everywhere for user-supplied strings | Single XSS gate — verified via grep in DoD |
| D6 | Reuse `/api/admin/projects/upload` for all image uploads | One generic endpoint; misnamed but functionally correct. Rename can be Sprint 3 cleanup |
| D7 | facebook_url validation = `https://` prefix only (server + client) | Don't whitelist domain (Instagram/LinkedIn future-proof); reject `javascript:` is critical |
| D8 | No draft/publish, no history, no schedule | User said "hiếm khi đổi" — extra complexity unjustified |
| D9 | Translate buttons NOT in MVP, but markup pattern reserved | Easy to enable later by unhiding `.btn-translate` |
| D10 | No cleanup of orphan uploaded images | Acceptable trade-off; deferred to Sprint 3 cleanup job |

## Risks Carried Forward

1. **XSS** — single chokepoint = `setText()` helper. Every PR touching public render must use it.
2. **Image orphans** — admin uploads accumulate in `/uploads/`. Noted in Sprint 3 backlog.
3. **Layout shift** — 3 new fetches at page load. Acceptable per user choice; compression + caching in Sprint 2 audit will mitigate broadly.

## Verification Strategy

Each feature has its own DoD + Test Checklist embedded in spec. Phase gates in [project.json](project.json) define automated + manual checks that must pass before next feature starts.

### Quick smoke after each feature

| After | Smoke command |
|-------|---------------|
| F01 | `curl -s http://localhost:5500/api/public/about \| grep success` |
| F02 | Manually edit + save in admin, verify reload persists |
| F03 | `grep -c 'MANY BEAUTIFUL' Views/main/index.html` → 0 |

## Next Step

```
/feature-build 2026-05-26-admin-home-content-editor
```

Or, if implementing solo and want to step through manually:
```
/implement   # for F01 first, then F02, then F03
```

3 features × manual smoke testing is reasonable for 1 dev / 2 days. `/feature-build` is more useful when there are 5+ features with TDD/subagent fan-out.
