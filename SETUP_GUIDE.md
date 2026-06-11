# Selling Website - Setup Guide

## 1. Cài Đặt Dependencies

```bash
npm install
```

## 2. Tạo `.env`

Tạo file `.env` ở thư mục root (cùng cấp `app.js`):

```ini
PORT=5500
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=sellingweb
DB_CONNECTION_LIMIT=10

SESSION_SECRET=

GOOGLE_TRANSLATE_API_KEY=
```

Sinh `SESSION_SECRET` (random ≥ 64 ký tự):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Paste output vào `.env`. **BẮT BUỘC** — server sẽ `process.exit(1)` nếu thiếu.

## 3. Database

Có 2 cách. Cách nào cũng được, kết quả như nhau.

### Cách A — Dùng `schema.sql` (chạy 1 lần qua MySQL CLI)

```bash
mysql -u root -p < config/schema.sql
```

Tạo database `sellingweb` + 10 bảng + seed data + indexes. Tài khoản mặc định `admin / admin123` đã hash bcrypt sẵn.

### Cách B — Dùng `migrate_db_schema.js` (idempotent qua Node)

```bash
# DB mới hoặc DB đã có sẵn — script tự nhận biết
node config/migrate_db_schema.js
```

Behavior:
- Table chưa có → CREATE + seed default
- Table đã có → fetch row count + sample data để verify state
- An toàn chạy nhiều lần

**DB cũ rất rác (muốn xoá sạch table cũ rồi tạo lại)**:

```bash
node config/migrate_db_schema.js --reset
```

⚠️ `--reset` **DROP TẤT CẢ table** trong DB hiện tại (kể cả table không thuộc app như `users` cũ), rồi tạo lại sạch. Xóa hết data — chỉ dùng cho dev / setup mới.

> Script tự load `.env` từ project root bất kể chạy ở đâu (`pwd` không quan trọng).

## 4. Chạy

```bash
node app.js
```

→ `http://localhost:5500/login` (cổng đọc từ `PORT` trong `.env`, mặc định 5500).

## 5. Đăng Nhập Mặc Định

- Username: `admin`
- Password: `admin123`
- Role: `admin`

> Nên đổi password ngay sau khi đăng nhập đầu tiên (trong tab Accounts của admin panel).

## Google Translate (tuỳ chọn)

1. https://console.cloud.google.com/ → tạo project → enable Cloud Translation API
2. Credentials → Create API Key
3. Paste key vào `.env` ở `GOOGLE_TRANSLATE_API_KEY`
4. Restart server

Free tier: 500,000 ký tự/tháng.

## Bảo Mật Đã Áp Dụng

| # | Vấn đề | Cách giải quyết |
|---|--------|-----------------|
| 1 | Password plain-text | bcrypt rounds=10, hash khi create/update; `bcrypt.compare` khi login |
| 2 | API admin không auth | `requireAuth` cho toàn bộ `/api/admin/*`; `requireAdmin` cho DELETE và Accounts |
| 3 | Secrets hardcode | Chuyển sang `.env` (`dotenv`) — DB, session secret, Google API |
| 4 | Cookie yếu | `httpOnly: true`, `sameSite: 'lax'`, `secure` bật ở production |
| 5 | Upload không filter | `fileFilter` chỉ chấp nhận MIME `image/{jpeg,png,webp,gif}` |
| 6 | `express.static('.')` | Đã bỏ; mount riêng `/uploads`, `/login`, `/main`, `/admin` |
| 7 | Brute force / spam | `express-rate-limit`: 10 login/15min, 3 contact/min |
| 8 | Log password | Đã bỏ `console.log` thông tin nhạy cảm trong `loginController` |
| 9 | Audit trail | Bảng `audit_log` ghi mọi mutation: user + action + target + IP + timestamp |

Tham khảo chi tiết: [wiki/09-bao-mat.md](wiki/09-bao-mat.md).

## Trouble-shooting

### ❌ `SESSION_SECRET không được khai báo trong .env`
→ Chưa tạo `.env` hoặc thiếu `SESSION_SECRET`. Quay lại bước 2.

### ❌ `injected env (0) from .env`
→ File `.env` rỗng hoặc không nằm cùng cấp `app.js`. Verify:
```bash
ls -la .env       # phải thấy, KHÔNG phải .env.txt
cat .env          # phải có nội dung
```

### ❌ `Access denied for user 'root'@'localhost' (using password: NO)`
→ `DB_PASSWORD` trong `.env` không match password MySQL của bạn. Test thủ công:
```bash
mysql -u root -p
# nhập password — nếu OK thì chỉnh DB_PASSWORD trong .env
```
Trên Mac mới cài MySQL qua `brew install mysql`, mặc định root không có password → để `DB_PASSWORD=` trống.

### ❌ Login đúng `admin/admin123` mà vẫn báo sai
→ Bảng `accounts` còn password plain-text từ DB cũ. Reset hash:
```sql
UPDATE accounts SET password = '$2b$10$yfdejtIDbvDGhuudguCFVOZTBz.U1EC0vDNZ1LNmsURHW7vEutvQa'
WHERE username = 'admin';
```
Hoặc chạy `node config/migrate_db_schema.js --reset` để tạo lại từ đầu.

### ❌ Upload báo "Chỉ chấp nhận file ảnh"
→ Bạn đang upload file không phải image MIME. Chuyển sang `.jpg/.png/.webp/.gif`.

### ❌ "Bạn cần đăng nhập" khi gọi API admin
→ Cookie session hết hạn hoặc chưa login. Đăng nhập lại tại `/login`.

### ❌ Quá nhiều lần đăng nhập sai → bị chặn
→ Đợi 15 phút hoặc đổi IP. Rate-limit chống brute-force.

---

## File config/ cần thiết khi handoff

Chỉ còn 4 file:
- `database.js` — connection pool, tự resolve `.env` theo `__dirname`
- `constants.js` — shared constants (AREAS, BCRYPT_ROUNDS, ...)
- `schema.sql` — full schema SQL (chạy qua MySQL CLI cho setup mới)
- `migrate_db_schema.js` — idempotent + có flag `--reset` (chạy qua Node)

Các script một lần (dedupe, hash passwords, migrate to uploads, cleanup data) đã xóa khỏi repo sau khi đã được áp dụng.
