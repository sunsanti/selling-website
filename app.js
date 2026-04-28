const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve root folder: so /photo.jpg maps to /photo.jpg at root
app.use(express.static(path.join(__dirname, '.')));

app.use('/login', express.static(path.join(__dirname, 'Views/login')));
app.use('/main', express.static(path.join(__dirname, 'Views/main')));
app.use('/admin', express.static(path.join(__dirname, 'Views/admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// session
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 5
    }
}));

const loginController = require('./Controllers/loginController');
const adminController = require('./Controllers/adminController');
const contactController = require('./Controllers/contactController');

app.get('/login', loginController.getLoginPage);
app.post('/login', loginController.handleLogin);
app.get('/main', loginController.getMainPage);

// Admin routes
app.get('/admin', adminController.getAdminPage);

// API - Settings
app.get('/api/admin/settings', adminController.getSettings);
app.put('/api/admin/settings', adminController.updateSettings);

// API - Projects
app.get('/api/admin/projects', adminController.getProjects);
app.get('/api/admin/projects/search', adminController.searchProjects);
app.get('/api/admin/projects/:id', adminController.getProjectById);
app.post('/api/admin/projects', adminController.createProject);
app.put('/api/admin/projects/:id', adminController.updateProject);
app.put('/api/admin/projects/:id/soft-delete', adminController.softDeleteProject);
app.put('/api/admin/projects/:id/restore', adminController.restoreProject);
app.delete('/api/admin/projects/:id', adminController.deleteProject);
app.post('/api/admin/projects/upload', adminController.uploadMiddleware.single('media'), adminController.handleUpload);

// API - Contacts
app.get('/api/admin/contacts', adminController.getContacts);
app.get('/api/admin/contacts/search', adminController.searchContacts);
app.delete('/api/admin/contacts/:id', adminController.deleteContact);

// API - Accounts
app.get('/api/admin/accounts', adminController.getAccounts);
app.post('/api/admin/accounts', adminController.createAccount);
app.put('/api/admin/accounts/:id', adminController.updateAccount);
app.delete('/api/admin/accounts/:id', adminController.deleteAccount);

// Public - Contact form
app.post('/api/contact', contactController.submitContact);

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Logout failed");
        }
        res.clearCookie("connect.sid");
        res.send("Logged out");
        console.log("logout success");
    });
});

app.get("/check-auth", (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

const PORT = 5500;

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}/login`);
});
