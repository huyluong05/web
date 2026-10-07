import mysql from 'mysql2/promise';

async function cleanDB() {
    try {
        const pool = mysql.createPool({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "123456",
            database: "vitaltrack_db"
        });
        
        console.log("Cleaning database...");
        
        // Disable foreign key checks for truncation
        await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
        
        const tables = [
            'health_records',
            'goals',
            'reminders',
            'connected_devices',
            'ai_diagnoses',
            'audit_logs'
        ];
        
        for (const table of tables) {
            try {
                await pool.query(`TRUNCATE TABLE ${table};`);
                console.log(`Truncated ${table}`);
            } catch (err) {
                console.log(`Skipped ${table}: ${err.message}`);
            }
        }
        
        // Delete any users except id 1 and 2
        try {
            await pool.query('DELETE FROM users WHERE id NOT IN (1, 2);');
            console.log("Deleted extra users.");
        } catch (err) {
             console.log(`Error deleting users: ${err.message}`);
        }
        
        // Re-enable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 1;');
        
        console.log("Database cleaned successfully! Kept 2 demo accounts.");
        process.exit(0);
    } catch(e) {
        console.error("DB Error:", e.message);
        process.exit(1);
    }
}
cleanDB();
