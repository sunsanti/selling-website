const path = require('path');
const fs = require('fs');
const userModel = require('../Models/userModel');
const settingModel = require('../Models/settingModel');

const MAIN_HTML_PATH = path.join(__dirname, '../Views/main/index.html');

const getLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../Views/login/index.html'));
};

const getMainPage = async (req, res) => {
    try {
        const [settings, html] = await Promise.all([
            settingModel.getAll(),
            fs.promises.readFile(MAIN_HTML_PATH, 'utf8')
        ]);
        // Safely serialize — replace </script> inside JSON to prevent tag injection
        const json = JSON.stringify(settings).replace(/<\/script>/gi, '<\\/script>');
        const injected = `<script>window.__SETTINGS__=${json};</script>`;
        const result = html.replace('<!--__SETTINGS_INJECT__-->', injected);
        res.type('html').send(result);
    } catch (_) {
        // Fallback: serve static file if DB unavailable
        res.sendFile(MAIN_HTML_PATH);
    }
};

const handleLogin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await userModel.checkCredentials(username, password);

        if (user) {
            req.session.user = {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role || 'employee'
            };
            res.redirect('/main');
        } else {
            res.status(401).send('Sai tên đăng nhập hoặc mật khẩu!');
        }
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).send('Đã xảy ra lỗi máy chủ!');
    }
};

module.exports = {
    getLoginPage,
    getMainPage,
    handleLogin
};
