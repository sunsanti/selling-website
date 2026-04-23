const path = require('path');
const userModel = require('../Models/userModel');

const getLoginPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../Views/login/index.html'));
};

const getMainPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../Views/main/index.html'));
};

const handleLogin = async(req, res) => {
    console.log("Dữ liệu form gửi lên:", req.body);
    const {username, password} = req.body

    try {
        const isValidUser = await userModel.checkCredentials(username, password);
        console.log(isValidUser);
        if (isValidUser) {
            res.redirect('/main');
        } else {
            res.status(401).send('Sai tên đăng nhập hoặc mật khẩu!');
        }
    } catch(error) {
        res.status(500).send('Đã xảy ra lỗi máy chủ!');
    }
};

module.exports = {
    getLoginPage,
    getMainPage,
    handleLogin
};