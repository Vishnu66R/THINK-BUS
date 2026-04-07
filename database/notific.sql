-- database/notific.sql
-- Table definition for real-time delay notifications

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) DEFAULT 'info',       -- e.g., 'alert', 'warning', 'info', 'delay'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_role VARCHAR(50) DEFAULT 'All', -- e.g., 'Admin', 'Student', 'Parent', 'All'
    target_bus_id INT REFERENCES buses(id) ON DELETE CASCADE,  -- NULL if it's a global notification
    delay_mins INT DEFAULT 0,              -- Number of minutes the bus is delayed
    is_active BOOLEAN DEFAULT TRUE,        -- For admin resolution
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
