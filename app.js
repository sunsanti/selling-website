require('dotenv').config();
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');
const app = express();

const { requireAuth, requireAdmin } = require('./Controllers/authMiddleware');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
    console.error('❌ SESSION_SECRET không được khai báo trong .env');
    process.exit(1);
}

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 5
    }
}));

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/login', express.static(path.join(__dirname, 'Views/login')));
app.use('/main', express.static(path.join(__dirname, 'Views/main')));

// Admin: gate the HTML entry behind login; static assets (CSS/JS) pass through
// so the page can load styles after redirect bounce. API endpoints have their
// own auth middleware further down.
const ADMIN_ENTRY_PATHS = new Set(['/', '/index.html', '']);
app.use('/admin', (req, res, next) => {
    if (ADMIN_ENTRY_PATHS.has(req.path) && !req.session.user) {
        return res.redirect('/login');
    }
    next();
}, express.static(path.join(__dirname, 'Views/admin')));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Thử quá nhiều lần. Vui lòng đợi 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false
});

const contactLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { success: false, message: 'Gửi liên hệ quá nhanh. Vui lòng đợi 1 phút.' },
    standardHeaders: true,
    legacyHeaders: false
});

const loginController = require('./Controllers/loginController');
const adminController = require('./Controllers/adminController');
const contactController = require('./Controllers/contactController');
const homeContentController = require('./Controllers/homeContentController');

app.get('/', (req, res) => res.redirect('/main'));
app.get('/login', loginController.getLoginPage);
app.post('/login', loginLimiter, loginController.handleLogin);
app.get('/main', loginController.getMainPage);

// Public read-only API (no auth) - used by /main public page
app.get('/api/public/settings', adminController.getSettings);
app.get('/api/public/projects', adminController.getProjects);
app.get('/api/public/projects/:id', adminController.getProjectById);
app.get('/api/public/about', homeContentController.getAbout);
app.get('/api/public/services', homeContentController.getServices);
app.get('/api/public/footer-persons', homeContentController.getFooterPersons);

app.use('/api/admin', requireAuth);

app.get('/api/admin/settings', adminController.getSettings);
app.put('/api/admin/settings', adminController.updateSettings);

app.get('/api/admin/projects', adminController.getProjects);
app.get('/api/admin/projects/search', adminController.searchProjects);
app.get('/api/admin/projects/:id', adminController.getProjectById);
app.post('/api/admin/projects', adminController.createProject);
app.put('/api/admin/projects/:id', adminController.updateProject);
app.put('/api/admin/projects/:id/soft-delete', adminController.softDeleteProject);
app.put('/api/admin/projects/:id/restore', adminController.restoreProject);
app.delete('/api/admin/projects/:id', requireAdmin, adminController.deleteProject);
app.post('/api/admin/projects/upload', (req, res, next) => {
    adminController.uploadMiddleware.single('media')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, adminController.handleUpload);

app.get('/api/admin/contacts', adminController.getContacts);
app.get('/api/admin/contacts/search', adminController.searchContacts);
app.delete('/api/admin/contacts/:id', requireAdmin, adminController.deleteContact);

app.get('/api/admin/accounts', adminController.getAccounts);
app.post('/api/admin/accounts', requireAdmin, adminController.createAccount);
app.put('/api/admin/accounts/:id', requireAdmin, adminController.updateAccount);
app.delete('/api/admin/accounts/:id', requireAdmin, adminController.deleteAccount);

app.get('/api/admin/project-images', adminController.getAllProjectImages);
app.get('/api/admin/project-images/:projectId', adminController.getProjectImages);
app.post('/api/admin/project-images', adminController.addProjectImage);
app.put('/api/admin/project-images/:id', adminController.updateProjectImage);
app.delete('/api/admin/project-images/:id', adminController.deleteProjectImage);

app.get('/api/admin/about', homeContentController.getAbout);
app.put('/api/admin/about', homeContentController.updateAbout);

app.get('/api/admin/services', homeContentController.getServices);
app.get('/api/admin/services/:slot', homeContentController.getServiceBySlot);
app.put('/api/admin/services/:slot', homeContentController.updateService);

app.get('/api/admin/footer-persons', homeContentController.getFooterPersons);
app.get('/api/admin/footer-persons/:slot', homeContentController.getFooterPersonBySlot);
app.put('/api/admin/footer-persons/:slot', homeContentController.updateFooterPerson);

app.post('/api/admin/translate', adminController.translateText);
app.post('/api/admin/detect-language', adminController.detectTextLanguage);

app.post('/api/contact', contactLimiter, contactController.submitContact);

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Logout failed");
        }
        res.clearCookie("connect.sid");
        res.send("Logged out");
    });
});

app.get("/check-auth", (req, res) => {
    if (req.session.user) {
        res.json({
            loggedIn: true,
            name: req.session.user.name,
            role: req.session.user.role,
            username: req.session.user.username
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Global error handler — last in chain. Catches uncaught async errors.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message, err.stack);
    if (res.headersSent) return next(err);
    const isApi = req.path.startsWith('/api/');
    if (isApi) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    } else {
        res.status(500).send('Đã xảy ra lỗi máy chủ');
    }
});

const PORT = parseInt(process.env.PORT || '5500', 10);

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}/`);
    console.log(`Đăng nhập admin/employee tại http://localhost:${PORT}/login`);
});
