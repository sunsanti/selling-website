const settingsModel = require('../models/settingsModel');
const projectModel = require('../models/projectModel');
const contactModel = require('../models/contactModel');

// ========== SETTINGS ==========

const getSettings = async (req, res) => {
    try {
        const settings = await settingsModel.get();
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { logo_url, phone_number, main_image_url } = req.body;
        const settings = await settingsModel.update({ logo_url, phone_number, main_image_url });
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// ========== PROJECTS ==========

const getProjects = async (req, res) => {
    try {
        const includeDeleted = req.query.includeDeleted === 'true';
        const projects = await projectModel.getAll(includeDeleted);
        res.json(projects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get projects' });
    }
};

const getProject = async (req, res) => {
    try {
        const project = await projectModel.getById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get project' });
    }
};

const createProject = async (req, res) => {
    try {
        const { name, size, category, year, style, description, region, image_url, display_order } = req.body;
        if (!name || !size || !category || !year || !style || !region || !image_url) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const project = await projectModel.create({ name, size, category, year, style, description, region, image_url, display_order });
        res.status(201).json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

const updateProject = async (req, res) => {
    try {
        const { name, size, category, year, style, description, region, image_url, display_order } = req.body;
        const project = await projectModel.update(req.params.id, { name, size, category, year, style, description, region, image_url, display_order });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

const softDeleteProject = async (req, res) => {
    try {
        const project = await projectModel.softDelete(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

const restoreProject = async (req, res) => {
    try {
        const project = await projectModel.restore(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to restore project' });
    }
};

// ========== CONTACTS ==========

const getContacts = async (req, res) => {
    try {
        const contacts = await contactModel.getAll();
        res.json(contacts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get contacts' });
    }
};

const getContact = async (req, res) => {
    try {
        const contact = await contactModel.getById(req.params.id);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        res.json(contact);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get contact' });
    }
};

const createContact = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        if (!name || !phone || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const contact = await contactModel.create({ name, phone, email });
        res.status(201).json(contact);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create contact' });
    }
};

const updateContact = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        const contact = await contactModel.update(req.params.id, { name, phone, email });
        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        res.json(contact);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update contact' });
    }
};

const deleteContact = async (req, res) => {
    try {
        const success = await contactModel.delete(req.params.id);
        if (!success) return res.status(404).json({ error: 'Contact not found' });
        res.json({ message: 'Contact deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
};

module.exports = {
    getSettings, updateSettings,
    getProjects, getProject, createProject, updateProject, softDeleteProject, restoreProject,
    getContacts, getContact, createContact, updateContact, deleteContact
};
