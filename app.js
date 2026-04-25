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

app.get('/login', loginController.getLoginPage);
app.post('/login', loginController.handleLogin);
app.get('/main', loginController.getMainPage);
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

