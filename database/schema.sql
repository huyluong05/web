-- ==========================================================
-- VITALTRACK DATABASE SCHEMA (MySQL)
-- Project: VitalTrack - Personal Health Tracking System
-- ==========================================================

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS vitaltrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vitaltrack;

-- 1. BẢNG USERS (Người dùng & Quản trị viên)
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS health_records;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. BẢNG HEALTH_RECORDS (Chỉ số sức khỏe: Cân nặng, Huyết áp, Nhịp tim)
CREATE TABLE health_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  weight DECIMAL(5, 2) NOT NULL COMMENT 'Cân nặng (kg), ví dụ: 68.5',
  systolic INT NOT NULL COMMENT 'Huyết áp tâm thu (mmHg), ví dụ: 118',
  diastolic INT NOT NULL COMMENT 'Huyết áp tâm trương (mmHg), ví dụ: 76',
  heart_rate INT NOT NULL COMMENT 'Nhịp tim (bpm), ví dụ: 74',
  recorded_at DATETIME NOT NULL COMMENT 'Thời gian ghi nhận',
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_recorded (user_id, recorded_at)
);

-- 3. BẢNG GOALS (Mục tiêu sức khỏe)
CREATE TABLE goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL COMMENT 'Tên mục tiêu, ví dụ: Giảm cân đón hè',
  metric_type ENUM('weight', 'blood_pressure', 'heart_rate', 'exercise') NOT NULL,
  start_value DECIMAL(6, 2) NOT NULL COMMENT 'Giá trị ban đầu',
  target_value DECIMAL(6, 2) NOT NULL COMMENT 'Giá trị mục tiêu',
  current_value DECIMAL(6, 2) NOT NULL COMMENT 'Giá trị hiện tại',
  unit VARCHAR(20) NOT NULL COMMENT 'Đơn vị: kg, mmHg, bpm, phút',
  status ENUM('in_progress', 'completed') DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. BẢNG REMINDERS (Nhắc nhở uống nước / tập thể dục)
CREATE TABLE reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('water', 'exercise') NOT NULL,
  title VARCHAR(150) NOT NULL COMMENT 'Tên nhắc nhở',
  time_of_day TIME NOT NULL COMMENT 'Thời gian nhắc nhở (HH:MM:SS)',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- Mật khẩu mặc định của các tài khoản mẫu là: password123 (đã hash bcrypt)
-- ==========================================================

-- Thêm tài khoản User và Admin
-- Hash bcrypt tương ứng với chuỗi 'password123':
-- $2a$10$X8m17XkS4x3uE9WwKz5aCeCqf5hIe1v5f2yH8j2.F2W2pQ7Yn9/72
INSERT INTO users (id, full_name, email, password, role, is_active) VALUES
(1, 'Nguyễn Văn An', 'user@vitaltrack.vn', '$2a$10$X8m17XkS4x3uE9WwKz5aCeCqf5hIe1v5f2yH8j2.F2W2pQ7Yn9/72', 'user', 1),
(2, 'Quản Trị Viên', 'admin@vitaltrack.vn', '$2a$10$X8m17XkS4x3uE9WwKz5aCeCqf5hIe1v5f2yH8j2.F2W2pQ7Yn9/72', 'admin', 1),
(3, 'Trần Thị Mai', 'mai.tran@example.com', '$2a$10$X8m17XkS4x3uE9WwKz5aCeCqf5hIe1v5f2yH8j2.F2W2pQ7Yn9/72', 'user', 1);

-- Thêm dữ liệu chỉ số sức khỏe mẫu cho User 1
INSERT INTO health_records (user_id, weight, systolic, diastolic, heart_rate, recorded_at, notes) VALUES
(1, 70.0, 122, 80, 78, DATE_SUB(NOW(), INTERVAL 28 DAY), 'Khởi đầu theo dõi'),
(1, 69.8, 120, 79, 76, DATE_SUB(NOW(), INTERVAL 21 DAY), 'Tuần 1'),
(1, 69.4, 119, 78, 75, DATE_SUB(NOW(), INTERVAL 14 DAY), 'Tuần 2'),
(1, 69.0, 118, 77, 73, DATE_SUB(NOW(), INTERVAL 7 DAY), 'Tuần 3'),
(1, 68.7, 118, 76, 75, DATE_SUB(NOW(), INTERVAL 3 DAY), 'Cảm thấy khỏe khoắn'),
(1, 68.5, 118, 76, 74, NOW(), 'Ghi nhận hôm nay');

-- Thêm mục tiêu mẫu cho User 1
INSERT INTO goals (user_id, title, metric_type, start_value, target_value, current_value, unit, status) VALUES
(1, 'Mục tiêu cân nặng: 65kg', 'weight', 70.0, 65.0, 68.5, 'kg', 'in_progress'),
(1, 'Duy trì huyết áp chuẩn', 'blood_pressure', 125.0, 118.0, 118.0, 'mmHg', 'in_progress'),
(1, 'Nhịp tim nghỉ ngơi dưới 72 bpm', 'heart_rate', 78.0, 70.0, 74.0, 'bpm', 'in_progress');

-- Thêm nhắc nhở mẫu cho User 1
INSERT INTO reminders (user_id, type, title, time_of_day, is_active) VALUES
(1, 'water', 'Uống 500ml nước buổi sáng', '08:00:00', 1),
(1, 'water', 'Uống nước sau giờ làm việc', '14:30:00', 1),
(1, 'exercise', 'Đi bộ thể dục buổi tối 30 phút', '18:00:00', 1);
