-- ============================================================
-- ThinkBus: Create users table
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Student', 'Parent', 'Driver'))
);

-- ============================================================
-- Example users (one for each role)
-- ============================================================

INSERT INTO users (username, password, role) VALUES
    ('admin_user',   'admin123',   'Admin'),
    ('student_alex', 'student123', 'Student'),
    ('parent_sara',  'parent123',  'Parent'),
    ('driver_raju',  'driver123',  'Driver');