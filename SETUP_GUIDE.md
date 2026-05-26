# Selling Website - Setup Guide

## 1. Cài Đặt Dependencies

```bash
npm install
```

## 2. Tạo `.env`

```bash
cp .env.example .env
```

Mở `.env` và điền:
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` — credential MySQL
- `SESSION_SECRET` — chuỗi random ≥ 64 ký tự. Sinh:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- `GOOGLE_TRANSLATE_API_KEY` — (tuỳ chọn) cho nút dịch trong admin
- `NODE_ENV` — `development` hoặc `production`. Production bật `cookie.secure`

## 3. Database

### DB mới hoàn toàn

```bash
mysql -u root -p < config/schema.sql
```

Tài khoản mặc định: `admin / admin123` (password đã hash bcrypt sẵn trong schema).

### DB cũ — cần migrate

```bash
# Thêm cột name + role (nếu chưa có)
mysql -u root -p sellingweb < config/migrate_account_name_role.sql

# Hash các password plain-text đang lưu trong DB
node config/migrate_hash_passwords.js
```

Script `migrate_hash_passwords.js` chạy 1 lần, hash tất cả password chưa hash. Idempotent — chạy lại nhiều lần không sao.

## 4. Chạy

```bash
node app.js
```

→ `http://localhost:5500/login` (cổng đọc từ `PORT` trong `.env`, mặc định 5500)

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
| 5 | Upload không filter | `fileFilter` chỉ chấp nhận MIME `image/{jpeg,png,webp,gif}` + extension |
| 6 | `express.static('.')` | Đã bỏ; mount riêng `/images`, `/uploads`, `/login`, `/main`, `/admin` |
| 7 | Brute force / spam | `express-rate-limit`: 10 login/15min, 3 contact/min |
| 8 | Log password | Đã bỏ `console.log` thông tin nhạy cảm trong `loginController` |
| 9 | Renumber race | Bọc transaction trong `renumberService` (rollback nếu lỗi) |

Tham khảo chi tiết: [wiki/09-bao-mat.md](wiki/09-bao-mat.md).

## Trouble-shooting

### ❌ `SESSION_SECRET không được khai báo trong .env`
→ Chưa tạo `.env`. Quay lại bước 2.

### ❌ Login đúng `admin/admin123` mà vẫn báo sai
→ DB của bạn còn password plain-text. Chạy `node config/migrate_hash_passwords.js`.

### ❌ Upload báo "Chỉ chấp nhận ảnh: jpg, jpeg, png, webp, gif"
→ Bạn đang upload file không phải ảnh. Đổi format ảnh.

### ❌ "Bạn cần đăng nhập" khi gọi API admin
→ Cookie session hết hạn hoặc chưa login. Đăng nhập lại tại `/login`.

### ❌ Quá nhiều lần đăng nhập sai → bị chặn
→ Đợi 15 phút hoặc đổi IP. Đây là rate-limit chống brute-force.

---

## Upgrading From The Two-Folder Layout (`images/` + `uploads/`)

Phiên bản trước media-library feature dùng 2 folder ảnh riêng (`images/` cho seed assets, `uploads/` cho admin uploads). Để nâng cấp:

1. **Dừng server**: `pkill -f "node app"` hoặc Ctrl+C.
2. **Backup DB**: `mysqldump -u root -p sellingweb > backup.sql`
3. **Chạy migration**: `node config/migrate_to_uploads.js`
   - Script move toàn bộ file từ `images/` sang `uploads/` (subfolder được flatten với prefix)
   - UPDATE 5 bảng (`settings`, `services`, `footer_persons`, `projects`, `tableimages`) — mọi path `/images/x` thành `/uploads/x`, mọi bare filename `x.jpg` thành `/uploads/x.jpg`
4. **Pull/deploy code mới** (đã drop `/images` static mount khỏi `app.js`)
5. **Start server**: `node app.js`

Migration **idempotent** — chạy lại nhiều lần OK (skip files đã move, skip rows đã `/uploads/`).
