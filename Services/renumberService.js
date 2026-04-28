const pool = require('../config/database');

/**
 * Renumber contact IDs sequentially after deletion
 * Uses temporary negative IDs to avoid duplicate key conflicts
 * e.g. [1,2,5,8] -> [1,2,3,4]
 */
async function renumberContactIds() {
    try {
        const [contacts] = await pool.query('SELECT id FROM contacts ORDER BY id ASC');
        if (contacts.length === 0) return;

        for (const contact of contacts) {
            await pool.query('UPDATE contacts SET id = ? WHERE id = ?', [-contact.id, contact.id]);
        }

        for (let i = 0; i < contacts.length; i++) {
            const newId = i + 1;
            await pool.query('UPDATE contacts SET id = ? WHERE id = ?', [newId, -(contacts[i].id)]);
        }

        console.log(`Renumbered ${contacts.length} contacts`);
    } catch (error) {
        console.error('Lỗi renumberContactIds:', error);
        throw error;
    }
}

/**
 * Renumber project display_order sequentially by area after deletion/move
 * Ensures each active project has a unique, sequential display_order
 */
async function renumberProjectDisplayOrder() {
    try {
        const areas = ['sydney', 'melbourne', 'brisbane', 'goldcoast'];

        for (const area of areas) {
            const [projects] = await pool.query(
                'SELECT id, display_order FROM projects WHERE area = ? AND status = "active" ORDER BY display_order ASC, id ASC',
                [area]
            );

            for (let i = 0; i < projects.length; i++) {
                const newOrder = i + 1;
                if (projects[i].display_order !== newOrder) {
                    await pool.query(
                        'UPDATE projects SET display_order = ? WHERE id = ?',
                        [newOrder, projects[i].id]
                    );
                }
            }
        }

        console.log('Renumbered project display_order');
    } catch (error) {
        console.error('Lỗi renumberProjectDisplayOrder:', error);
        throw error;
    }
}

module.exports = {
    renumberContactIds,
    renumberProjectDisplayOrder
};
