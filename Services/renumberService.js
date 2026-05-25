const pool = require('../config/database');

/**
 * Renumber contact IDs sequentially after deletion.
 * Wrapped in a transaction so concurrent DELETEs cannot corrupt state.
 * Uses temporary negative IDs to avoid duplicate key conflicts.
 */
async function renumberContactIds() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [contacts] = await conn.query('SELECT id FROM contacts ORDER BY id ASC');
        if (contacts.length === 0) {
            await conn.commit();
            return;
        }

        for (const contact of contacts) {
            await conn.query('UPDATE contacts SET id = ? WHERE id = ?', [-contact.id, contact.id]);
        }

        for (let i = 0; i < contacts.length; i++) {
            const newId = i + 1;
            await conn.query('UPDATE contacts SET id = ? WHERE id = ?', [newId, -(contacts[i].id)]);
        }

        await conn.commit();
        console.log(`Renumbered ${contacts.length} contacts`);
    } catch (error) {
        await conn.rollback();
        console.error('Lỗi renumberContactIds:', error);
        throw error;
    } finally {
        conn.release();
    }
}

/**
 * Renumber project display_order sequentially by area after deletion/move.
 * Transaction-wrapped to keep all areas consistent.
 */
async function renumberProjectDisplayOrder() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const areas = ['sydney', 'melbourne', 'brisbane', 'goldcoast'];

        for (const area of areas) {
            const [projects] = await conn.query(
                'SELECT id, display_order FROM projects WHERE area = ? AND status = "active" ORDER BY display_order ASC, id ASC',
                [area]
            );

            for (let i = 0; i < projects.length; i++) {
                const newOrder = i + 1;
                if (projects[i].display_order !== newOrder) {
                    await conn.query(
                        'UPDATE projects SET display_order = ? WHERE id = ?',
                        [newOrder, projects[i].id]
                    );
                }
            }
        }

        await conn.commit();
        console.log('Renumbered project display_order');
    } catch (error) {
        await conn.rollback();
        console.error('Lỗi renumberProjectDisplayOrder:', error);
        throw error;
    } finally {
        conn.release();
    }
}

module.exports = {
    renumberContactIds,
    renumberProjectDisplayOrder
};
