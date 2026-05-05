const pool = require('./config/database');

async function fixImagePaths() {
    const connection = await pool.getConnection();
    try {
        // Get all projects that have images in tableimages but null image_path
        const [projects] = await connection.execute(`
            SELECT p.id, p.image_path, (
                SELECT ti.image_path
                FROM tableimages ti
                WHERE ti.project_id = p.id
                ORDER BY ti.display_order ASC, ti.id ASC
                LIMIT 1
            ) as first_image_path
            FROM projects p
            HAVING first_image_path IS NOT NULL
        `);

        console.log(`Tìm thấy ${projects.length} projects cần fix`);

        for (const project of projects) {
            const cleanPath = (project.first_image_path || '')
                .replace(/^\/images\//, '')
                .replace(/^\/uploads\//, '');

            await connection.execute(
                'UPDATE projects SET image_path = ? WHERE id = ?',
                [cleanPath, project.id]
            );
            console.log(`✅ Fixed project #${project.id}: image_path = "${cleanPath}"`);
        }

        console.log('🎉 Hoàn tất!');
    } catch (err) {
        console.error('❌ Lỗi:', err);
    } finally {
        connection.release();
        await pool.end();
    }
}

fixImagePaths();
