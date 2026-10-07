import mysql from 'mysql2/promise';

async function checkUsers() {
    try {
        const pool = mysql.createPool({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "123456",
            database: "vitaltrack_db"
        });
        
        const [rows] = await pool.query('SELECT id, email, role, password FROM users');
        console.log("Users in DB:");
        console.table(rows);
        process.exit(0);
    } catch(e) {
        console.error("DB Error:", e.message);
        process.exit(1);
    }
}
checkUsers();
