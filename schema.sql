-- =========================================================================
-- VITALTRACK HEALTHCARE - MYSQL DATABASE SCHEMA & INITIAL SEED DATA
-- Tương thích hoàn toàn với MySQL 5.7+ / 8.0+ / MariaDB
-- =========================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `vitaltrack_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `vitaltrack_db`;

-- 1. BẢNG NGƯỜI DÙNG (USERS)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `is_active` BOOLEAN DEFAULT TRUE,
  
  -- Thông tin cá nhân
  `phone_number` VARCHAR(30) NULL,
  `date_of_birth` DATE NULL,
  `gender` ENUM('male', 'female', 'other') DEFAULT 'other',
  `address` VARCHAR(255) NULL,
  `occupation` VARCHAR(100) NULL,
  `avatar_url` TEXT NULL,

  -- Thể chất & Sinh trắc cơ sở
  `height_cm` DECIMAL(5, 2) DEFAULT 170.00,
  `base_weight_kg` DECIMAL(5, 2) DEFAULT 68.00,
  `target_weight_kg` DECIMAL(5, 2) DEFAULT 65.00,
  `blood_type` VARCHAR(10) DEFAULT 'unknown',
  `activity_level` VARCHAR(30) DEFAULT 'moderate',

  -- Hồ sơ y tế (JSON hoặc TEXT)
  `chronic_conditions` JSON NULL,
  `allergies` JSON NULL,
  `current_medications` TEXT NULL,
  `medical_notes` TEXT NULL,
  `primary_doctor` VARCHAR(150) NULL,
  `hospital_clinic` VARCHAR(150) NULL,

  -- Liên hệ khẩn cấp
  `emergency_contact_name` VARCHAR(150) NULL,
  `emergency_contact_relationship` VARCHAR(50) NULL,
  `emergency_contact_phone` VARCHAR(30) NULL,

  -- Cài đặt đơn vị
  `weight_unit` ENUM('kg', 'lbs') DEFAULT 'kg',
  `height_unit` ENUM('cm', 'inch') DEFAULT 'cm',
  `email_notifications` BOOLEAN DEFAULT TRUE,
  `vital_alert_thresholds` JSON NULL,

  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 2. BẢNG BẢN GHI SỨC KHỎE (HEALTH RECORDS / VITALS TELEMETRY)
CREATE TABLE IF NOT EXISTS `health_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `weight` DECIMAL(5, 2) NOT NULL,
  `systolic` INT NOT NULL COMMENT 'Huyết áp tâm thu (mmHg)',
  `diastolic` INT NOT NULL COMMENT 'Huyết áp tâm trương (mmHg)',
  `heart_rate` INT NOT NULL COMMENT 'Nhịp tim (nhịp/phút bpm)',
  `recorded_at` DATETIME NOT NULL,
  `notes` TEXT NULL,
  `doctor_reviewed` BOOLEAN DEFAULT FALSE,
  `doctor_notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_records_user_time` (`user_id`, `recorded_at`),
  CONSTRAINT `fk_records_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3. BẢNG MỤC TIÊU SỨC KHỎE (HEALTH GOALS)
CREATE TABLE IF NOT EXISTS `goals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `metric_type` ENUM('weight', 'blood_pressure', 'heart_rate', 'exercise') NOT NULL,
  `start_value` DECIMAL(7, 2) NOT NULL,
  `target_value` DECIMAL(7, 2) NOT NULL,
  `current_value` DECIMAL(7, 2) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `status` ENUM('in_progress', 'completed') DEFAULT 'in_progress',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_goals_user` (`user_id`),
  CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 4. BẢNG NHẮC NHỞ HÀNG NGÀY (REMINDERS)
CREATE TABLE IF NOT EXISTS `reminders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` ENUM('water', 'exercise', 'medication', 'measurement') DEFAULT 'water',
  `title` VARCHAR(255) NOT NULL,
  `time_of_day` VARCHAR(10) NOT NULL COMMENT 'Định dạng HH:mm',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reminders_user` (`user_id`),
  CONSTRAINT `fk_reminders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 5. BẢNG THIẾT BỊ NGOẠI VI / IOT CONNECTED DEVICES
CREATE TABLE IF NOT EXISTS `connected_devices` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM('blood_pressure_monitor', 'smartwatch', 'smart_scale', 'pulse_oximeter', 'glucose_meter') NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `battery_level` INT DEFAULT 100,
  `status` ENUM('connected', 'syncing', 'disconnected', 'idle') DEFAULT 'idle',
  `last_sync_time` DATETIME NULL,
  `mac_address` VARCHAR(50) NULL,
  `firmware_version` VARCHAR(50) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_devices_user` (`user_id`),
  CONSTRAINT `fk_devices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 6. BẢNG LỊCH SỬ CHUẨN ĐOÁN & TƯ VẤN AI (AI DIAGNOSIS HISTORY)
CREATE TABLE IF NOT EXISTS `ai_diagnoses` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `summary` TEXT NOT NULL,
  `risk_level` ENUM('low', 'moderate', 'high', 'critical') DEFAULT 'low',
  `risk_score` INT DEFAULT 0,
  `possible_conditions` JSON NULL,
  `vital_analysis` JSON NULL,
  `recommendations` JSON NULL,
  `disclaimer` TEXT NULL,
  `physician_reviewed` BOOLEAN DEFAULT FALSE,
  `physician_notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ai_user` (`user_id`),
  CONSTRAINT `fk_ai_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 7. BẢNG CÀI ĐẶT HỆ THỐNG (SYSTEM SETTINGS)
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `bp_systolic_warning_threshold` INT DEFAULT 130,
  `bp_diastolic_warning_threshold` INT DEFAULT 85,
  `bp_crisis_systolic_threshold` INT DEFAULT 160,
  `bp_crisis_diastolic_threshold` INT DEFAULT 100,
  `hr_high_threshold` INT DEFAULT 100,
  `hr_low_threshold` INT DEFAULT 55,
  `session_timeout_minutes` INT DEFAULT 120,
  `allow_user_registration` BOOLEAN DEFAULT TRUE,
  `maintenance_mode` BOOLEAN DEFAULT FALSE,
  `selected_ai_model` VARCHAR(50) DEFAULT 'gemini-3.7-flash',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =========================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (INITIAL SEED DATA)
-- =========================================================================

-- Thêm tài khoản Quản trị viên (Admin) và Bệnh nhân mẫu (User)
-- Mật khẩu mặc định: 'password123' (được mã hóa bcrypt)
INSERT INTO `users` (`id`, `full_name`, `email`, `password`, `role`, `is_active`, `phone_number`, `date_of_birth`, `gender`, `height_cm`, `base_weight_kg`, `target_weight_kg`, `blood_type`, `activity_level`, `chronic_conditions`, `allergies`)
VALUES 
(1, 'Trần Minh Huy', 'user@vitaltrack.vn', '$2b$10$kLHdnFd9SOFrmu4oeA6EOu9xC.3A1gCQGABLfV4SRo2ZOOmji1qUe', 'user', 1, '0901234567', '1995-05-15', 'male', 172.00, 68.50, 65.00, 'O+', 'moderate', '["Tiền tăng huyết áp (Prehypertension)"]', '["Hải sản vỏ cứng", "Kháng sinh Penicillin"]'),
(2, 'Bs. Nguyễn Văn An (Admin)', 'admin@vitaltrack.vn', '$2b$10$kLHdnFd9SOFrmu4oeA6EOu9xC.3A1gCQGABLfV4SRo2ZOOmji1qUe', 'admin', 1, '0988888888', '1982-08-20', 'male', 175.00, 72.00, 70.00, 'A+', 'active', '[]', '[]')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Thêm dữ liệu đo sinh trắc học gần đây
INSERT INTO `health_records` (`user_id`, `weight`, `systolic`, `diastolic`, `heart_rate`, `recorded_at`, `notes`)
VALUES 
(1, 68.5, 120, 80, 72, DATE_SUB(NOW(), INTERVAL 5 DAY), 'Đo buổi sáng lúc vừa thức dậy'),
(1, 68.4, 122, 81, 74, DATE_SUB(NOW(), INTERVAL 4 DAY), 'Sau khi tập thể dục 30 phút'),
(1, 68.2, 118, 78, 70, DATE_SUB(NOW(), INTERVAL 3 DAY), 'Cảm giác thoải mái, ngủ đủ 7 tiếng'),
(1, 68.0, 125, 83, 76, DATE_SUB(NOW(), INTERVAL 2 DAY), 'Làm việc căng thẳng buổi chiều'),
(1, 67.9, 121, 79, 71, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Chỉ số đo ổn định');

-- Thêm mục tiêu sức khỏe
INSERT INTO `goals` (`user_id`, `title`, `metric_type`, `start_value`, `target_value`, `current_value`, `unit`, `status`)
VALUES
(1, 'Kiểm soát cân nặng tiêu chuẩn', 'weight', 72.0, 65.0, 67.9, 'kg', 'in_progress'),
(1, 'Huyết áp tâm thu ổn định dưới 120 mmHg', 'blood_pressure', 135.0, 118.0, 121.0, 'mmHg', 'in_progress');

-- Thêm nhắc nhở uống nước & vận động
INSERT INTO `reminders` (`user_id`, `type`, `title`, `time_of_day`, `is_active`)
VALUES
(1, 'water', 'Uống 350ml nước ấm buổi sáng', '07:00', 1),
(1, 'exercise', 'Đi bộ nhẹ nhàng 30 phút', '17:30', 1),
(1, 'water', 'Uống 300ml nước trước khi ngủ', '21:30', 1);

-- Thêm thiết bị ngoại vi mẫu
INSERT INTO `connected_devices` (`id`, `user_id`, `name`, `type`, `model`, `battery_level`, `status`, `last_sync_time`, `mac_address`, `firmware_version`)
VALUES
('dev_bp_omron_01', 1, 'Máy đo huyết áp Omron Bluetooth HEM-7142T2', 'blood_pressure_monitor', 'Omron HEM-7142 Series', 92, 'connected', NOW(), 'C8:FD:19:44:A1:08', 'v2.1.4'),
('dev_watch_garmin_02', 1, 'Đồng hồ đo nhịp tim & vận động Garmin Venu 3', 'smartwatch', 'Garmin Venu 3 GPS', 78, 'connected', NOW(), 'AA:14:B2:90:3E:77', 'v11.0.2');

-- Cài đặt mặc định ban đầu
INSERT INTO `system_settings` (`id`, `bp_systolic_warning_threshold`, `bp_diastolic_warning_threshold`, `bp_crisis_systolic_threshold`, `bp_crisis_diastolic_threshold`, `hr_high_threshold`, `hr_low_threshold`, `session_timeout_minutes`, `allow_user_registration`, `maintenance_mode`, `selected_ai_model`)
VALUES (1, 130, 85, 160, 100, 100, 55, 120, 1, 0, 'gemini-3.7-flash')
ON DUPLICATE KEY UPDATE `selected_ai_model` = VALUES(`selected_ai_model`);

-- Bảng lưu vết nhật ký kiểm toán hệ thống chuyên sâu (Audit Logs)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `user_role` VARCHAR(30) NOT NULL DEFAULT 'guest',
  `action` VARCHAR(60) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `page` VARCHAR(150) NOT NULL,
  `resource_type` VARCHAR(60) NULL,
  `resource_id` VARCHAR(100) NULL,
  `description` VARCHAR(500) NOT NULL,
  `metadata` JSON NULL,
  `ip_address` VARCHAR(50) NULL,
  `user_agent` TEXT NULL,
  `status` ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_status` (`status`),
  INDEX `idx_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm một số bản ghi nhật ký kiểm toán mẫu
INSERT INTO `audit_logs` (`user_id`, `user_name`, `user_role`, `action`, `module`, `page`, `resource_type`, `resource_id`, `description`, `metadata`, `ip_address`, `status`, `created_at`)
VALUES
(1, 'Nguyễn Văn An', 'user', 'LOGIN', 'Auth', '/login', 'user', '1', 'Nguyễn Văn An đã đăng nhập hệ thống thành công', '{"method": "password"}', '192.168.1.45', 'SUCCESS', NOW() - INTERVAL 45 MINUTE),
(1, 'Nguyễn Văn An', 'user', 'HEALTH_PAGE_VIEWED', 'Health Metrics', '/health', 'page', NULL, 'Nguyễn Văn An đã truy cập trang Chỉ số sức khỏe', NULL, '192.168.1.45', 'SUCCESS', NOW() - INTERVAL 40 MINUTE),
(1, 'Nguyễn Văn An', 'user', 'HEALTH_RECORD_CREATED', 'Health Metrics', '/health', 'health_record', '1', 'Nguyễn Văn An đã thêm bản ghi sức khỏe mới', '{"systolic": 120, "diastolic": 80, "heart_rate": 72, "weight": 68.5}', '192.168.1.45', 'SUCCESS', NOW() - INTERVAL 35 MINUTE),
(1, 'Nguyễn Văn An', 'user', 'GOAL_CREATED', 'Goals', '/goals', 'goal', '1', 'Nguyễn Văn An đã tạo mục tiêu giảm cân', '{"title": "Giảm cân về 65kg", "targetValue": 65, "unit": "kg"}', '192.168.1.45', 'SUCCESS', NOW() - INTERVAL 25 MINUTE),
(1, 'Nguyễn Văn An', 'user', 'REMINDER_TOGGLED', 'Reminders', '/reminders', 'reminder', '1', 'Nguyễn Văn An đã bật nhắc nhở uống nước', '{"isActive": true, "title": "Uống 350ml nước ấm buổi sáng"}', '192.168.1.45', 'SUCCESS', NOW() - INTERVAL 15 MINUTE),
(2, 'Bs. Trần Minh Hoàng', 'admin', 'USER_VIEWED', 'User Management', '/admin/users', 'user', '1', 'Admin Bs. Trần Minh Hoàng đã xem chi tiết hồ sơ bệnh nhân Nguyễn Văn An', NULL, '14.241.120.6', 'SUCCESS', NOW() - INTERVAL 5 MINUTE);

