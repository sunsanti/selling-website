const express = require('express');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true}));
app.use(express.json());

app.use('/login', express.static(path.join(__dirname, 'Views/login')));
app.use('/main', express.static(path.join(__dirname, 'Views/main')));
app.use('/admin', express.static(path.join(__dirname, 'Views/admin')));


const loginController = require('./Controllers/loginController');

app.get('/login', loginController.getLoginPage);
app.post('/login', loginController.handleLogin);
app.get('/main', loginController.getMainPage);

const PORT = 5500;

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}/login`);
});