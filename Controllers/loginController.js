const path = require('path');
const fs = require('fs');
const userModel = require('../Models/userModel');
const settingModel = require('../Models/settingModel');

const MAIN_HTML_PATH    = path.join(__dirname, '../Views/main/index.html');
const ABOUT_HTML_PATH   = path.join(__dirname, '../Views/about/index.html');
const CONTACT_HTML_PATH = path.join(__dirname, '../Views/contact/index.html');

// Shared helper: read HTML, inject window.__SETTINGS__ before </body>, send response
async function injectSettings(htmlPath, res) {
    try {
        const [settings, html] = await Promise.all([
            settingModel.getAll(),
            fs.promises.readFile(htmlPath, 'utf8')
        ]);
        const json = JSON.stringify(settings).replace(/<\/script>/gi, '<\\/script>');
        res.type('html').send(html.replace('<!--__SETTINGS_INJECT__-->', `<script>window.__SETTINGS__=${json};</script>`));
    } catch (_) {
        res.sendFile(htmlPath);
    }
}

const getLoginPage   = (req, res) => res.sendFile(path.join(__dirname, '../Views/login/index.html'));
const getMainPage    = (req, res) => injectSettings(MAIN_HTML_PATH, res);
const getAboutPage   = (req, res) => injectSettings(ABOUT_HTML_PATH, res);
const getContactPage = (req, res) => injectSettings(CONTACT_HTML_PATH, res);

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

module.exports = { getLoginPage, getMainPage, getAboutPage, getContactPage, handleLogin };
