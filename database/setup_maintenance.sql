-- Maintenance Table
-- Manages maintenance records and damage values for 10 different aspects of buses.
-- Values are rated on a scale (e.g., 1-10 where 10 is perfectly good, 1 is critical damage).

CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    bus_id INT REFERENCES buses(id) ON DELETE CASCADE,
    
    -- 10 different aspects (using integer score 1-10)
    engine_status INT DEFAULT 10 CHECK (engine_status BETWEEN 1 AND 10),
    transmission_status INT DEFAULT 10 CHECK (transmission_status BETWEEN 1 AND 10),
    brakes_status INT DEFAULT 10 CHECK (brakes_status BETWEEN 1 AND 10),
    tires_status INT DEFAULT 10 CHECK (tires_status BETWEEN 1 AND 10),
    steering_status INT DEFAULT 10 CHECK (steering_status BETWEEN 1 AND 10),
    suspension_status INT DEFAULT 10 CHECK (suspension_status BETWEEN 1 AND 10),
    exterior_damage_score INT DEFAULT 10 CHECK (exterior_damage_score BETWEEN 1 AND 10),
    interior_condition_score INT DEFAULT 10 CHECK (interior_condition_score BETWEEN 1 AND 10),
    electrical_system_status INT DEFAULT 10 CHECK (electrical_system_status BETWEEN 1 AND 10),
    hvac_status INT DEFAULT 10 CHECK (hvac_status BETWEEN 1 AND 10),

    last_inspected TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

TRUNCATE TABLE maintenance RESTART IDENTITY CASCADE;

-- Insert maintenance records for all 7 buses
INSERT INTO maintenance (
    bus_id, 
    engine_status, 
    transmission_status, 
    brakes_status, 
    tires_status, 
    steering_status, 
    suspension_status, 
    exterior_damage_score, 
    interior_condition_score, 
    electrical_system_status, 
    hvac_status,
    last_inspected
) VALUES
(1, 9, 8, 9, 7, 10, 8, 9, 8, 10, 9, CURRENT_TIMESTAMP - (random() * interval '30 days')),
(2, 8, 9, 8, 8, 9, 7, 8, 9, 9, 8, CURRENT_TIMESTAMP - (random() * interval '30 days')),
(3, 10, 10, 9, 9, 9, 10, 10, 9, 10, 10, CURRENT_TIMESTAMP - (random() * interval '30 days')),
(4, 7, 8, 7, 6, 8, 7, 7, 8, 8, 9, CURRENT_TIMESTAMP - (random() * interval '30 days')),
(5, 9, 9, 10, 8, 9, 9, 9, 9, 9, 10, CURRENT_TIMESTAMP - (random() * interval '30 days')),
(6, 8, 7, 8, 7, 8, 8, 8, 7, 9, 8, CURRENT_TIMESTAMP - (random() * interval '30 days')),
(7, 9, 10, 9, 9, 10, 9, 10, 9, 10, 9, CURRENT_TIMESTAMP - (random() * interval '30 days'));
