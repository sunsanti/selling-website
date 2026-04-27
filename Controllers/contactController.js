const contactModel = require('../Models/contactModel');

const submitContact = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên không được để trống' });
        }
        await contactModel.createContact({ name, phone, email });
        res.json({ success: true, message: 'Gửi liên hệ thành công' });
    } catch (error) {
        console.error('Lỗi submitContact:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    submitContact
};
