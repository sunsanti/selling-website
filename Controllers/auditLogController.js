const auditLogModel = require('../Models/auditLogModel');

const getAuditLog = async (req, res) => {
    try {
        const { limit, offset, action, target_type, q } = req.query;
        const data = await auditLogModel.getRecent({ limit, offset, action, target_type, q });
        res.json({ success: true, data });
    } catch (err) {
        console.error('getAuditLog:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const getActions = async (req, res) => {
    try {
        const data = await auditLogModel.getDistinctActions();
        res.json({ success: true, data });
    } catch (err) {
        console.error('getActions:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = { getAuditLog, getActions };
