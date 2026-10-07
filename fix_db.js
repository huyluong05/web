import mysql from 'mysql2/promise';
import fs from 'fs';

async function fixDb() {
    try {
        const pool = mysql.createPool({
            host: "localhost",
            port: 3306,
            user: "root",
            password: "123456",
            database: "vitaltrack_db"
        });
        
        console.log("Đang tạo bảng audit_logs...");
        
        const sql = `
        CREATE TABLE IF NOT EXISTS \`audit_logs\` (
          \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
          \`user_id\` INT NULL,
          \`user_name\` VARCHAR(150) NOT NULL,
          \`user_role\` VARCHAR(30) NOT NULL DEFAULT 'guest',
          \`action\` VARCHAR(60) NOT NULL,
          \`module\` VARCHAR(100) NOT NULL,
          \`page\` VARCHAR(150) NOT NULL,
          \`resource_type\` VARCHAR(60) NULL,
          \`resource_id\` VARCHAR(100) NULL,
          \`description\` VARCHAR(500) NOT NULL,
          \`metadata\` JSON NULL,
          \`ip_address\` VARCHAR(50) NULL,
          \`user_agent\` TEXT NULL,
          \`status\` ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX \`idx_audit_user\` (\`user_id\`),
          INDEX \`idx_audit_action\` (\`action\`),
          INDEX \`idx_audit_module\` (\`module\`),
          INDEX \`idx_audit_status\` (\`status\`),
          INDEX \`idx_audit_created_at\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

        await pool.query(sql);
        console.log("Đã tạo bảng audit_logs thành công!");
        process.exit(0);
    } catch(e) {
        console.error("DB Error:", e.message);
        process.exit(1);
    }
}
fixDb();
