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
            // F10.fix: keep /uploads/ paths verbatim; rewrite legacy /images/ + bare filenames
            let syncPath = project.first_image_path || '';
            if (syncPath.startsWith('/images/')) {
                syncPath = '/uploads/' + syncPath.slice('/images/'.length);
            } else if (syncPath && !syncPath.startsWith('/uploads/') && !/^https?:\/\//i.test(syncPath) && !syncPath.startsWith('/')) {
                syncPath = '/uploads/' + syncPath;
            }

            await connection.execute(
                'UPDATE projects SET image_path = ? WHERE id = ?',
                [syncPath, project.id]
            );
            console.log(`✅ Fixed project #${project.id}: image_path = "${syncPath}"`);
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
