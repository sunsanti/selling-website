const path = require('path');
const userModel = require('../Models/userModel');
const auditLogModel = require('../Models/auditLogModel');

const getLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../Views/login/index.html'));
};

const getMainPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../Views/main/index.html'));
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
            auditLogModel.log({ req, action: 'LOGIN_SUCCESS', target_type: 'account', target_id: user.id });
            res.redirect('/main');
        } else {
            auditLogModel.log({
                req: null,                                        // session has no user on failed login
                action: 'LOGIN_FAIL',
                target_type: 'account',
                details: { username, ip: req.socket && req.socket.remoteAddress }
            });
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
