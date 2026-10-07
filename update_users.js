import mysql from 'mysql2/promise';

async function updateUsers() {
    try {
        const pool = mysql.createPool({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "123456",
            database: "vitaltrack_db"
        });
        
        await pool.query(`UPDATE users SET email = 'user@vitaltrack.vn', password = '$2b$10$kLHdnFd9SOFrmu4oeA6EOu9xC.3A1gCQGABLfV4SRo2ZOOmji1qUe' WHERE id = 1`);
        await pool.query(`UPDATE users SET email = 'admin@vitaltrack.vn', password = '$2b$10$kLHdnFd9SOFrmu4oeA6EOu9xC.3A1gCQGABLfV4SRo2ZOOmji1qUe' WHERE id = 2`);
        
        console.log("Users updated successfully.");
        process.exit(0);
    } catch(e) {
        console.error("DB Error:", e.message);
        process.exit(1);
    }
}
updateUsers();
