const contactModel = require('../Models/contactModel');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d\s()-]{7,20}$/;

const submitContact = async (req, res) => {
    try {
        const { name, phone, email } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Tên không được để trống' });
        }
        if (name.length > 255) {
            return res.status(400).json({ success: false, message: 'Tên quá dài (tối đa 255 ký tự)' });
        }
        if (email && !EMAIL_RE.test(email)) {
            return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
        }
        if (phone && !PHONE_RE.test(phone)) {
            return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
        }
        if (!email && !phone) {
            return res.status(400).json({ success: false, message: 'Cần ít nhất email hoặc số điện thoại' });
        }

        await contactModel.createContact({
            name: name.trim(),
            phone: phone ? phone.trim() : '',
            email: email ? email.trim() : ''
        });
        res.json({ success: true, message: 'Gửi liên hệ thành công' });
    } catch (error) {
        console.error('Lỗi submitContact:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    submitContact
};
