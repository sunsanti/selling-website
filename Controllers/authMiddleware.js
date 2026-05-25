const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập' });
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập' });
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Chỉ admin có quyền thực hiện' });
    }
    next();
};

module.exports = { requireAuth, requireAdmin };
