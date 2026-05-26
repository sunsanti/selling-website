# Media Library — Spec

**Date:** 2026-05-26
**Status:** Draft — for /feature-explore

## Problem Statement

Admin hiện đang upload trùng lặp cùng một ảnh cho nhiều field (logo, service slot, footer avatar, project images...) vì không có cách pick lại từ ảnh đã upload trước. Đồng thời 2 folder `images/` (seed cũ) và `uploads/` (admin uploads) tạo confusion: cùng kiểu URL nhưng path khác, code phải normalize ở nhiều chỗ.

## Recommended Direction

**Filesystem-backed media library popup**. Merge 2 folder thành duy nhất `uploads/`. Tạo 1 endpoint `GET /api/admin/media` list các file trong folder đó. Build 1 popup component reusable: grid thumbnail + search bar + Upload button + select mode (single hoặc multi tùy field). Mọi image input field trong admin trigger popup này thay vì gọi trực tiếp file picker.

**Core bet**: *1 popup component + 1 list endpoint cover được mọi image picker context. Filesystem-only metadata (mtime/size) đủ cho MVP — không cần DB-backed media table.*

## MVP Scope

Time-box: **2 ngày** (1 dev). Riskiest assumption: popup component đủ generic để dùng chung 6+ image input fields hiện có mà không hack.

- [ ] **Migration** `config/migrate_to_uploads.js`: di chuyển mọi file từ `images/` sang `uploads/`, UPDATE các cột `image_path`/`avatar_path` trong `settings`/`services`/`footer_persons`/`projects`/`tableimages` từ `/images/x` → `/uploads/x`, idempotent (skip nếu folder rỗng, skip rows đã có `/uploads/` prefix). Drop Express `/images` static mount khỏi `app.js`.
- [ ] **Backend** `Controllers/mediaController.js`: `GET /api/admin/media` → trả `[{ url, name, size, mtime }, ...]` cho 200 file mới nhất trong `uploads/`. `requireAuth` áp dụng tự nhiên qua mount.
- [ ] **Frontend component** `Views/admin/media-library.js` (hoặc inline trong `script.js`): function `openMediaLibrary({ mode: 'single'|'multi', onSelect: callback })` mở 1 modal global, fetch grid, allow Upload button (POST tới `/api/admin/projects/upload` reuse — đổi tên endpoint là Sprint sau), allow click thumbnail = chọn (single) hoặc checkbox toggle (multi), nút "Chọn" gọi callback với array URL.
- [ ] **Wire vào tất cả image fields**:
  - Settings: logo, main_image — `openMediaLibrary({ mode: 'single', onSelect: setLogo })`
  - About: (không có ảnh)
  - Services: image per slot — `mode: 'single'`
  - Footer: avatar per person — `mode: 'single'`
  - Project: thumbnail `image_path` — `mode: 'single'`
  - Project images (tableimages): **`mode: 'multi'`** — callback receives array, push từng cái vào `currentProjectImages` array
- [ ] **Smoke test**: mở mỗi field → popup show grid → upload mới → ảnh xuất hiện → pick → field populated → save → reload OK

## Key Assumptions to Validate

**Must Be True:**
1. *Mọi image field hiện có dùng pattern tương đương* (set `card.dataset.imagePath = url`, hiện preview thumbnail) → Test: grep current upload handlers, confirm pattern. Khả năng cao OK vì đa số do tôi viết.
2. *Multi-select popup giao tiếp với project tableimages array không phá flow save hiện có* → Test: hiện tại `currentProjectImages.push({ image_path: path, isNew: true })` khi upload — chỉ cần callback `urls.forEach(url => currentProjectImages.push(...))`.
3. *Migration không hỏng /main render khi UPDATE đồng bộ DB + move file* → Test: dry-run trên dev DB, verify `SELECT image_path FROM services` sau migration → tất cả `/uploads/`.

**Should Be True:**
4. *200 thumbnail load với `loading="lazy"` đủ nhanh* → Test: open Chrome devtools network tab, throttle Slow 3G, đếm thời gian tới hết.

**Might Be True:** (defer)
- Hash-based dedupe (cùng ảnh upload 2 lần → trả URL cũ) — đáng làm Sprint sau
- Search nâng cao theo tag/folder structure
- Per-user/role library scope
- Pagination khi >200 file

## Not Doing (with reasoning)

- ❌ **DB-backed `media` table với metadata** — filesystem listing + mtime sort là đủ cho dưới 1000 file. Thêm bảng = thêm migration, thêm sync logic (lỡ file bị xóa thủ công thì sao?). Defer tới khi thực sự cần search/filter phức tạp.
- ❌ **Delete ảnh từ library** — cần reverse-index toàn DB để biết ảnh nào đang được dùng (tableimages, settings, footer_persons, services...). Phức tạp + nguy hiểm nếu sai. MVP không có. Cleanup orphan = manual hoặc Sprint sau.
- ❌ **Hash dedupe (SHA-256 khi upload)** — invisible value: admin không thấy lợi ích trực tiếp; chỉ tiết kiệm disk. MVP đặt UX ưu tiên trên optimization.
- ❌ **Drag-drop reorder ảnh selected trong popup** — Multi-select hiện theo thứ tự click. Project images flow đã có drag-drop riêng ở form chính sau khi pick. Không trùng.
- ❌ **Cloud storage (S3/Cloudinary)** — external dependency, auth, cost. Out of scope tuyệt đối cho MVP local-first.
- ❌ **Pagination popup** — 200 file mới nhất là cap. Khi vượt sẽ tạo issue future. Hiện admin có < 50 ảnh nên không lo.
- ❌ **Rename file trong library** — filename do server tự sinh (`<timestamp>-<rand>.<ext>`) — vô danh nhưng đủ unique. Admin không cần tên friendly.
- ❌ **Đổi tên endpoint `/api/admin/projects/upload` → `/api/admin/media/upload`** — semantic chuẩn hơn nhưng cần update 5-6 caller. Sprint cleanup sau. Hiện reuse tên cũ.

## Resolved Decisions (from /idea-refine)

- ✅ **Search filename trong popup** — CÓ. 1 input bar trên cùng popup, filter client-side `.includes(query)` trên array đã fetch. Cost gần 0, value rõ khi >50 ảnh.
- ✅ **Confirmation preview trong popup trước khi đóng** — KHÔNG. Selected thumbnail có border highlight (multi: checkbox) là đủ visual feedback; click "Chọn" hoặc "Hủy" để confirm/dismiss. Tránh thêm step thừa.

## Open Questions

_(Không còn — đã đóng tại buổi /idea-refine)_

## Project Constraints (from wiki + codebase)

- Stack: Node.js + Express 5 + vanilla JS — không có build step
- Image upload pattern: `multer` fileFilter (jpg/png/webp/gif), 50MB, lưu `/uploads/<timestamp>-<rand>.<ext>` ([`Services/uploadService.js`](../../Services/uploadService.js))
- Auth: `requireAuth` middleware đã áp `/api/admin/*` ([`app.js`](../../app.js))
- DB image_path convention: filename hoặc full `/uploads/x.jpg` hoặc `/images/x.jpg` (legacy). Migration sẽ chuẩn hóa tất cả về `/uploads/`. Sau migration, `normalizeImageUrl()` trong `Views/main/index.html` chỉ còn xử lý 2 trường hợp (`data:` cho preview, `/uploads/` cho serve).
- Tất cả image render trên `/main` đã đi qua `normalizeImageUrl()` — chỉ cần đảm bảo nó vẫn xử lý đúng cả path mới
- Constants: `config/constants.js` — nếu cần `MEDIA_LIST_LIMIT = 200` thì để đó
- Reusable modal pattern: `confirmAction()` trong `Views/admin/script.js` là precedent cho global modal — copy pattern này cho `openMediaLibrary()`
