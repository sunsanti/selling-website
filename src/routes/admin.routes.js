const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const adminController = require('../controllers/adminController');

// ---- API: Settings (public read, authed write) ----
router.get('/api/settings', adminController.getSettings);
router.post('/api/settings', adminController.updateSettings);

// ---- API: Projects ----
router.get('/api/projects', adminController.getProjects);
router.get('/api/projects/:id', adminController.getProject);
router.post('/api/projects', requireAuth, adminController.createProject);
router.put('/api/projects/:id', requireAuth, adminController.updateProject);
router.patch('/api/projects/:id/delete', requireAuth, adminController.softDeleteProject);
router.patch('/api/projects/:id/restore', requireAuth, adminController.restoreProject);

// ---- API: Contacts ----
router.get('/api/contacts', adminController.getContacts);
router.get('/api/contacts/:id', adminController.getContact);
router.post('/api/contacts', requireAuth, adminController.createContact);
router.put('/api/contacts/:id', requireAuth, adminController.updateContact);
router.delete('/api/contacts/:id', requireAuth, adminController.deleteContact);

module.exports = router;
