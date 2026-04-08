CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  parent_phone VARCHAR(25),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  complaint_type ENUM('Electrical', 'Water', 'Furniture', 'Other') NOT NULL,
  issue_description TEXT NOT NULL,
  status ENUM('Pending', 'In Progress', 'Resolved') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE gatepass (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  student_name VARCHAR(120) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  out_time DATETIME NOT NULL,
  return_time DATETIME NOT NULL,
  reason TEXT NOT NULL,
  parent_phone VARCHAR(25),
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  parent_approval ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  admin_approval ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  approval_token VARCHAR(64) NOT NULL,
  qr_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  student_name VARCHAR(120) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  leave_from DATE NOT NULL,
  leave_to DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  parent_phone VARCHAR(25),
  parent_approval ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  admin_approval ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  approval_token VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE mess_menu (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_name VARCHAR(20) NOT NULL UNIQUE,
  breakfast VARCHAR(255) NOT NULL,
  lunch VARCHAR(255) NOT NULL,
  dinner VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE food_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE room_swap (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  current_room_number VARCHAR(20) NOT NULL,
  requested_room_number VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  holiday_name VARCHAR(150) NOT NULL,
  holiday_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
