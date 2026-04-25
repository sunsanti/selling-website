const path = require('path');
const userModel = require('../Models/userModel');
const session = require('express-session');

const getLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../Views/login/index.html'));
};

const getMainPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../Views/main/index.html'));
};

const handleLogin = async (req, res) => {
    console.log("Dữ liệu form gửi lên:", req.body);
    const { username, password } = req.body;

    try {
        const user = await userModel.checkCredentials(username, password);
        console.log(user);

        if (user) {
            // lưu session
            req.session.user = {
                id: user.id,
                username: user.username
            };

            console.log('SESSION SAU LOGIN:', req.session);
            console.log('USER TRONG SESSION:', req.session.user);

            res.redirect('/main');
        } else {
            res.status(401).send('Sai tên đăng nhập hoặc mật khẩu!');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Đã xảy ra lỗi máy chủ!');
    }
};

module.exports = {
    getLoginPage,
    getMainPage,
    handleLogin
};