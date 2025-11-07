SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Create database
CREATE DATABASE IF NOT EXISTS `sarawak_plant_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `sarawak_plant_db`;

-- 1. Roles Table 
CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Species Table 
CREATE TABLE `species` (
  `species_id` int(11) NOT NULL AUTO_INCREMENT,
  `scientific_name` varchar(255) DEFAULT NULL,
  `common_name` varchar(255) DEFAULT NULL,
  `is_endangered` tinyint(1) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Users Table 
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Sensor_Devices Table 
CREATE TABLE `sensor_devices` (
  `device_id` int(11) NOT NULL AUTO_INCREMENT,
  `node_id` varchar(50) DEFAULT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `species_id` int(11) DEFAULT NULL,
  `location_latitude` decimal(10,8) DEFAULT NULL,
  `location_longitude` decimal(10,8) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`device_id`),
  KEY `species_id` (`species_id`),
  CONSTRAINT `sensor_devices_ibfk_1` FOREIGN KEY (`species_id`) REFERENCES `species` (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Sensor_Readings Table 
CREATE TABLE `sensor_readings` (
  `reading_id` int(11) NOT NULL AUTO_INCREMENT,
  `device_id` int(11) DEFAULT NULL,
  `temperature` decimal(4,2) DEFAULT NULL,
  `humidity` float DEFAULT NULL,
  `soil_moisture` float DEFAULT NULL,
  `motion_detected` tinyint(1) DEFAULT NULL,
  `reading_status` enum('ok','warning','error') DEFAULT 'ok',
  `location_latitude` decimal(10,8) DEFAULT NULL,
  `location_longitude` decimal(10,8) DEFAULT NULL,
  `alert_generated` tinyint(1) DEFAULT 0,
  `reading_timestamp` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`reading_id`),
  KEY `device_id` (`device_id`),
  CONSTRAINT `sensor_readings_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `sensor_devices` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Plant_Observations Table 
CREATE TABLE `plant_observations` (
  `observation_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `species_id` int(11) DEFAULT NULL,
  `photo_url` varchar(500) NOT NULL,
  `location_latitude` decimal(10,8) NOT NULL,
  `location_longitude` decimal(10,8) NOT NULL,
  `location_name` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `source` enum('camera','library') DEFAULT NULL,
  `status` enum('pending','verified','rejected') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`observation_id`),
  KEY `user_id` (`user_id`),
  KEY `species_id` (`species_id`),
  CONSTRAINT `plant_observations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `plant_observations_ibfk_2` FOREIGN KEY (`species_id`) REFERENCES `species` (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 7. AI_Results Table 
CREATE TABLE `ai_results` (
  `ai_result_id` int(11) NOT NULL AUTO_INCREMENT,
  `observation_id` int(11) DEFAULT NULL,
  `species_id` int(11) DEFAULT NULL,
  `confidence_score` decimal(5,4) DEFAULT NULL,
  `rank` tinyint(4) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`ai_result_id`),
  KEY `observation_id` (`observation_id`),
  KEY `species_id` (`species_id`),
  CONSTRAINT `ai_results_ibfk_1` FOREIGN KEY (`observation_id`) REFERENCES `plant_observations` (`observation_id`),
  CONSTRAINT `ai_results_ibfk_2` FOREIGN KEY (`species_id`) REFERENCES `species` (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 8. Alerts Table
CREATE TABLE `alerts` (
  `alert_id` int(11) NOT NULL AUTO_INCREMENT,
  `device_id` int(11) DEFAULT NULL,
  `reading_id` int(11) DEFAULT NULL,
  `alert_type` enum('motion','environment','device_offline','ai_mismatch','user_report') NOT NULL,
  `alert_message` text NOT NULL,
  `severity` enum('low','medium','high') DEFAULT 'medium',
  `is_resolved` tinyint(1) DEFAULT 0,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`alert_id`),
  KEY `device_id` (`device_id`),
  KEY `reading_id` (`reading_id`),
  CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `sensor_devices` (`device_id`),
  CONSTRAINT `alerts_ibfk_2` FOREIGN KEY (`reading_id`) REFERENCES `sensor_readings` (`reading_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==================== SAMPLE DATA ====================

-- 1. Insert Roles 
INSERT INTO `roles` (`role_name`, `description`) VALUES 
('admin', 'System administrator'),
('researcher', 'Plant researcher'),
('public', 'General user');

-- 2. Insert Species 
INSERT INTO `species` (`scientific_name`, `common_name`, `is_endangered`, `description`) VALUES 
('Test Plant 1', 'Demo Orchid', 1, 'Sample plant for testing'),
('Test Plant 2', 'Demo Tree', 0, 'Another test plant'),
('Test Plant 3', 'Demo Flower', 1, 'Third test species');

-- 3. Insert Users 
INSERT INTO `users` (`role_id`, `username`, `email`, `password_hash`) VALUES 
(1, 'testuser', 'test@example.com', 'temp_password');

-- 4. Insert Sensor_Devices 
INSERT INTO `sensor_devices` (`node_id`, `device_name`, `species_id`, `location_latitude`, `location_longitude`, `is_active`) VALUES 
('TEST_NODE_001', 'Test Sensor Device', 1, 1.50000000, 110.30000000, 1);

COMMIT;

