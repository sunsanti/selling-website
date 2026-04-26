const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// ---- BODY PARSER ----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---- SESSION (must be before routes) ----
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 5  // 5 hours
    }
}));

// ---- STATIC FILES ----
// Order matters: static middleware first, but Express checks routes BEFORE middleware.
// So /admin, /login, /main route handlers run first; /public/* requests fall through to static.
app.use('/public/login', express.static(path.join(__dirname, 'public/login')));
app.use('/public/main', express.static(path.join(__dirname, 'public/main')));
app.use('/public/admin', express.static(path.join(__dirname, 'public/admin')));

// ---- PUBLIC ASSETS (images) ----
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// ---- ROUTES ----
const { authRoutes, adminRoutes } = require('./src/routes');
app.use(authRoutes);    // handles /login, /main, /logout, /check-auth
app.use(adminRoutes);   // handles /admin (protected), /api/*

// ---- 404 HANDLER ----
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// ---- SERVER ----
const PORT = 5500;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/login`);
});

