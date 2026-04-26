const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true}));
app.use(express.json());

app.use('/login', express.static(path.join(__dirname, 'Views/login')));
app.use('/main', express.static(path.join(__dirname, 'Views/main')));
app.use('/admin', express.static(path.join(__dirname, 'Views/admin')));


//session o day

app.use(session({
    secret: 'secret-key',       // key mã hóa session
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,          // true nếu dùng HTTPS
        maxAge: 1000 * 60 * 60 * 5 // 5 tiếng
    }
}));

const loginController = require('./Controllers/loginController');
const adminController = require('./Controllers/adminController');
const contactController = require('./Controllers/contactController');

app.get('/login', loginController.getLoginPage);
app.post('/login', loginController.handleLogin);
app.get('/main', loginController.getMainPage);

// Admin routes (protected by session)
app.get('/admin', adminController.getAdminPage);

// API Routes - Settings
app.get('/api/admin/settings', adminController.getSettings);
app.put('/api/admin/settings', adminController.updateSettings);

// API Routes - Projects
app.get('/api/admin/projects', adminController.getProjects);
app.get('/api/admin/projects/search', adminController.searchProjects);
app.get('/api/admin/projects/:id', adminController.getProjectById);
app.post('/api/admin/projects', adminController.createProject);
app.put('/api/admin/projects/:id', adminController.updateProject);
app.put('/api/admin/projects/:id/soft-delete', adminController.softDeleteProject);
app.put('/api/admin/projects/:id/restore', adminController.restoreProject);

// API Routes - Contacts
app.get('/api/admin/contacts', adminController.getContacts);
app.get('/api/admin/contacts/search', adminController.searchContacts);
app.delete('/api/admin/contacts/:id', adminController.deleteContact);

// API Routes - Accounts
app.get('/api/admin/accounts', adminController.getAccounts);
app.post('/api/admin/accounts', adminController.createAccount);
app.put('/api/admin/accounts/:id', adminController.updateAccount);
app.delete('/api/admin/accounts/:id', adminController.deleteAccount);

// Public - Contact form submission
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


