const usersData = [
    {username: 'admin', password: '123'}
];

const checkCredentials = (username, password) => {
    const user = usersData.find(u => u.username === username && u.password === password);
    return user !== undefined;
};

module.exports = {
    checkCredentials
};