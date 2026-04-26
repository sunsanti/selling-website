const express = require('express');
const router = express.Router();
const path = require('path');
const userModel = require('../models/userModel');

// GET /login
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, '../../public/login/index.html'));
});

// POST /login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await userModel.checkCredentials(username, password);
        if (user) {
            req.session.user = { id: user.id, username: user.username };
            return res.redirect('/admin');
        }
        return res.status(401).send('Sai tên đăng nhập hoặc mật khẩu!');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Đã xảy ra lỗi máy chủ!');
    }
});

// GET /main (public website)
router.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/main/index.html'));
});

// POST /logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).send('Logout failed');
        res.clearCookie('connect.sid');
        res.send('Logged out');
    });
});

// GET /check-auth
router.get('/check-auth', (req, res) => {
    res.json({ loggedIn: !!req.session.user });
});

module.exports = router;
