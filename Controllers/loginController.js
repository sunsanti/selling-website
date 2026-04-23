const path = require('path');
const userModel = require('../Models/userModel');

const getLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../Views/login/index.html'));
};

const handleLogin = (req, res) => {
    const {username, password} = req.body;

    const isValidUser = userModel.checkCredentials(username, password);

    if (isValidUser) {
        res.sendFile(path.join(__dirname, '../Views/main/index.html'));
    } else {
        res.status(401).send('Sai tên đăng nhâp hoặc mật khẩu');
    }
};

module.exports = {
    getLoginPage,
    handleLogin
};