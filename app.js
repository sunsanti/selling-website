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

// Favicon: respond 204 to avoid 404 spam in console (no favicon file present)
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/login', express.static(path.join(__dirname, 'Views/login')));
app.use('/main', express.static(path.join(__dirname, 'Views/main')));

// Contact page
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'Views/contact/index.html'));
});
app.use('/contact', express.static(path.join(__dirname, 'Views/contact')));

// F05c: /projects list page + /projects/:id detail page
// Explicit GET routes FIRST (pretty URLs) → static fallback for asset files
// (style.css / list.js / detail.js). Express 5 path-to-regexp no longer
// accepts inline :id([0-9]+) — use regex literal.
app.get('/projects', (req, res) => {
    res.sendFile(path.join(__dirname, 'Views/projects/list.html'));
});
app.get(/^\/projects\/(\d+)\/?$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'Views/projects/detail.html'));
});
app.use('/projects', express.static(path.join(__dirname, 'Views/projects')));

// F08: /videos list page (explicit route → static fallback)
app.get('/videos', (req, res) => {
    res.sendFile(path.join(__dirname, 'Views/videos/index.html'));
});
app.use('/videos', express.static(path.join(__dirname, 'Views/videos')));

// v3: /about page (explicit GET → static fallback for assets)
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'Views/about/index.html'));
});
app.use('/about', express.static(path.join(__dirname, 'Views/about')));

// F09: /news list + /news/:id detail pages.
// Express 5 path-to-regexp no longer accepts inline :id([0-9]+) — use regex literal.
app.get('/news', (req, res) => {
    res.sendFile(path.join(__dirname, 'Views/news/list.html'));
});
app.get(/^\/news\/(\d+)\/?$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'Views/news/detail.html'));
});
app.use('/news', express.static(path.join(__dirname, 'Views/news')));

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
const mediaController = require('./Controllers/mediaController');
const auditLogController = require('./Controllers/auditLogController');
const videoController = require('./Controllers/videoController');
const newsController = require('./Controllers/newsController');

app.get('/', (req, res) => res.redirect('/main'));
app.get('/login', loginController.getLoginPage);
app.post('/login', loginLimiter, loginController.handleLogin);
app.get('/main', loginController.getMainPage);

// Public read-only API (no auth) - used by /main public page
app.get('/api/public/settings', adminController.getSettings);
app.get('/api/public/projects', adminController.getProjects);
app.get('/api/public/projects/featured', adminController.getFeaturedProjects);
app.get('/api/public/projects/:id', adminController.getProjectById);
app.get('/api/public/about', homeContentController.getAbout);
app.get('/api/public/services', homeContentController.getServices);
app.get('/api/public/footer-persons', homeContentController.getFooterPersons);
// v13: /about Our Team grid
app.get('/api/public/team', homeContentController.getTeamMembers);
// F08: public videos
app.get('/api/public/videos', videoController.getPublic);
// v3: featured videos for /main carousel
app.get('/api/public/videos/featured', videoController.getFeatured);
// F09: public news
app.get('/api/public/news', newsController.getPublic);
app.get('/api/public/news/:id', newsController.getPublicById);

app.use('/api/admin', requireAuth);

app.get('/api/admin/settings', adminController.getSettings);
app.put('/api/admin/settings', adminController.updateSettings);

app.get('/api/admin/projects', adminController.getProjects);
app.get('/api/admin/projects/search', adminController.searchProjects);
app.get('/api/admin/projects/featured', adminController.getFeaturedProjects);
app.put('/api/admin/projects/featured', adminController.setFeaturedProjects);
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

// v13 / v22: /about Our Team (dynamic add/remove)
app.get('/api/admin/team', homeContentController.getTeamMembers);
app.post('/api/admin/team', homeContentController.createTeamMember);
app.put('/api/admin/team/:id', homeContentController.updateTeamMember);
app.delete('/api/admin/team/:id', requireAdmin, homeContentController.deleteTeamMember);

app.get('/api/admin/media', mediaController.getMedia);

app.get('/api/admin/audit-log', requireAdmin, auditLogController.getAuditLog);
app.get('/api/admin/audit-log/actions', requireAdmin, auditLogController.getActions);

// F08: Videos admin endpoints (auth via requireAuth above; DELETE needs admin role)
app.get('/api/admin/videos', videoController.getAll);
app.get('/api/admin/videos/featured', videoController.getFeatured);
app.put('/api/admin/videos/featured', videoController.setFeatured);
app.get('/api/admin/videos/:id', videoController.getById);
app.post('/api/admin/videos', videoController.create);
app.put('/api/admin/videos/:id', videoController.update);
app.put('/api/admin/videos/:id/soft-delete', videoController.softDelete);
app.delete('/api/admin/videos/:id', requireAdmin, videoController.hardDelete);

// F09: News admin endpoints
app.get('/api/admin/news', newsController.getAll);
app.get('/api/admin/news/:id', newsController.getById);
app.post('/api/admin/news', newsController.create);
app.put('/api/admin/news/:id', newsController.update);
app.put('/api/admin/news/:id/soft-delete', newsController.softDelete);
app.delete('/api/admin/news/:id', requireAdmin, newsController.hardDelete);

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
