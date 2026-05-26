# Admin Home Content Editor — Spec

**Date:** 2026-05-26
**Status:** Draft — for /feature-explore

## Problem Statement

Admin hiện tại chỉ chỉnh được `logo`, `phone`, `main_image` qua tab Dashboard.
3 section còn lại của trang chủ — **About us**, **Services**, **Footer** — đều
hardcode trong [Views/main/index.html](../../../Views/main/index.html). Muốn đổi
1 chữ phải sửa code và deploy.

## Recommended Direction

**Per-section tables** — 3 bảng mới (`about_section`, `services`, `footer_persons`)
với schema explicit theo cấu trúc UI đang có. Admin panel thêm 3 tab tương ứng,
mỗi form có inline image preview giống pattern logo upload hiện tại. Trang public
fetch data qua `/api/public/*` lúc load và render thay cho hardcode.

**Core bet:** *Admin sẽ edit content theo slot cố định (4–5 trường form mỗi
section), inline thumbnail/text preview đủ visual confidence trước khi save,
3 bảng riêng dễ maintain hơn JSON blob về lâu dài. Edit hiếm → không cần
draft/publish, history, hay schedule.*

## MVP Scope

Time-box: **2–3 ngày** (1 dev). Riskiest assumption: render từ DB không phá CSS
layout đang có.

- [ ] **DB migration**: bổ sung vào `config/migrate_db_schema.js`:
  - `about_section(id=1, banner TEXT, paragraph_left TEXT, paragraph_right TEXT)` — 1 row duy nhất
  - `about_stats(id, slot 1..4 UNIQUE, num VARCHAR(20), label VARCHAR(255))` — child table, 4 rows (linh hoạt nếu sau muốn 3 hoặc 5 stat)
  - `services(id, slot 1..3 UNIQUE, title, description, image_path, updated_at)`
  - `footer_persons(id, slot 1..2 UNIQUE, name, avatar_path, email, phone1, phone2, facebook_url, updated_at)`
  - Seed 1 row about + 3 services + 2 footer persons từ nội dung hardcode hiện tại (zero-downtime cho trang)
- [ ] **Models**: `aboutSectionModel.js`, `serviceModel.js`, `footerPersonModel.js`
- [ ] **API routes**:
  - Public (no auth): `GET /api/public/about`, `GET /api/public/services`, `GET /api/public/footer-persons`
  - Admin (`requireAuth`): `GET/PUT /api/admin/about`, `GET/PUT /api/admin/services/:slot`, `GET/PUT /api/admin/footer-persons/:slot`
- [ ] **Admin UI** ([Views/admin/index.html](../../../Views/admin/index.html)): 3 tab mới trong sidebar (About, Services, Footer):
  - About tab: 4 textarea (banner + 2 paragraph) + 4 cặp (number, label). Save → re-fetch
  - Services tab: 3 card stack, mỗi card có title input + description textarea + image upload với inline preview (reuse pattern logo)
  - Footer tab: 2 card stack, mỗi card có avatar upload + name + email + 2 phone + facebook url
- [ ] **Public render** ([Views/main/index.html](../../../Views/main/index.html)): replace 3 section hardcoded bằng inline `<script>` fetch + render (cùng pattern như projects/settings hiện có)

## Key Assumptions to Validate

**Must Be True:**
1. *CSS layout không depend vào nội dung text cụ thể* → Test: ngay sau migration, đổi banner thành 1 chuỗi dài 200 ký tự, kiểm tra mobile + iPad không tràn / vỡ box.
2. *Image upload size limit 50MB hiện tại đủ cho avatar/service image* → Test: confirm với user (~< 2MB/ảnh).

**Should Be True:**
3. *Validate text field length 1000 chars/paragraph đủ* → Test: đếm hiện tại (~250 chars), set DB column TEXT.
4. *Single-row `about_section` không gây bug với migration re-run* → Test: idempotent INSERT IGNORE.

**Might Be True:** (defer — không validate đến khi core xong)
- Admin muốn edit thứ tự services / footer persons → hiện slot cố định 1/2/3, sau có thể thêm reorder
- Multi-language các section này

## Not Doing (with reasoning)

- ❌ **Draft/Publish flow** — user xác nhận tần suất "hiếm khi đổi"; lưu trực tiếp + inline preview là đủ confidence. Adding staging DB column + UI tốn ~1 ngày không trả lại giá trị tương xứng.
- ❌ **Rich text editor (WYSIWYG)** — nội dung hiện tại là plain paragraph không có bold/italic/link. Thêm TipTap/Quill là 100KB JS + sanitization headache. Textarea đủ.
- ❌ **Audit log / change history** — out of scope cho MVP; nằm trong Sprint 2/3 của [wiki/11-audit-report.md](../../../wiki/11-audit-report.md) C5 áp dụng cho toàn project, không riêng feature này.
- ❌ **Dynamic add/remove services/footer persons** — user chọn "fixed slot". Nếu sau muốn thêm slot 4, ALTER TABLE thêm row + cập nhật CSS grid là 1 commit nhỏ. Hiện tại không cần.
- ❌ **Schedule publishing / preview-in-iframe** — over-engineering cho edit-hiếm use case. Inline preview thumbnail đã cover 90% của giá trị.
- ❌ **About stat icons / colors** — chỉ edit số và label; icon FontAwesome trong HTML giữ nguyên.
- ❌ **Footer person sorting drag-drop** — chỉ 2 person, slot 1/2 cố định.
- ❌ **Translate buttons (EN/ZH/JA) trên text field** — deferred, bật sau khi áp dụng đa ngôn ngữ chính thức. **Yêu cầu thiết kế:** giữ markup label/text field theo cùng pattern project editor (`<label>...<button class="btn-translate" data-target="…">…</button></label>`) để khi enable chỉ cần unhide button và wire script — không phải rewrite HTML.
- ❌ **Avatar crop tool** cho footer person — CSS `object-fit: cover` + container square (vd 140×140) đã handle aspect ratio đủ. Admin upload bất kỳ kích thước nào, browser tự crop hiển thị.

## Resolved Decisions (from /feature-explore)

1. **About stats**: child table `about_stats(slot UNIQUE, num, label)` thay vì 8 cột flat — cùng effort, tránh ALTER TABLE sau này nếu count thay đổi
2. **Save granularity**: per-card save button (Services + Footer) — isolate failure blast radius
3. **Empty section handling**: render với placeholder trong admin; trên public page ẩn block nếu toàn bộ field trống
4. **Dirty-form warning**: skip — đồng nhất với pattern admin hiện có
5. **`facebook_url` validation**: prefix `https://` check + reject `javascript:` scheme. Không whitelist domain
6. **XSS-safe render**: helper `setText(id, val)` dùng `textContent`, áp dụng ở cả public render + admin preview
7. **Translate buttons markup**: giữ pattern label/button của project editor (hidden) để sau enable không phải rewrite

## Project Constraints (from wiki + codebase)

- Stack: Node.js + Express 5 + MySQL (`mysql2/promise`) + vanilla HTML/CSS/JS — **không có build step**
- Pattern auth: `requireAuth` middleware đã sẵn cho `/api/admin/*`; public read endpoints không auth (đã có `/api/public/projects`, `/api/public/settings`)
- Pattern image upload: `multer` với fileFilter image only (jpg/png/webp/gif), 50MB limit, lưu vào `/uploads/`
- Pattern admin UI: section + table/form trong [Views/admin/index.html](../../../Views/admin/index.html), navigation qua `data-section`, fetch + render trong [Views/admin/script.js](../../../Views/admin/script.js)
- Pattern inline preview: đã có cho logo/main_image (`#current-logo-img` + onload set src) — copy y nguyên cho mỗi field image mới
- DB migration: `config/migrate_db_schema.js` idempotent qua `information_schema` check — extend cùng file thay vì tạo migration riêng
- Constants: `config/constants.js` — nếu cần MAX_SERVICES, FOOTER_PERSON_COUNT thì để vào đây
