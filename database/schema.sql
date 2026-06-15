-- =========================================================
-- AgroPilot AI - PostgreSQL Schema
-- =========================================================

CREATE DATABASE agropilot;
\c agropilot;

-- Users / Authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,        -- bcrypt hash
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Farmer Profile (one-to-one with user)
CREATE TABLE farmers (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120),
    village VARCHAR(120),
    district VARCHAR(120),
    state VARCHAR(120),
    total_land_area FLOAT DEFAULT 0
);

-- Farms
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    farm_name VARCHAR(150) NOT NULL,
    farm_area FLOAT,
    location VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Plots (many per farm)
CREATE TABLE plots (
    id SERIAL PRIMARY KEY,
    farm_id INT REFERENCES farms(id) ON DELETE CASCADE,
    plot_name VARCHAR(150) NOT NULL,
    plot_area FLOAT,
    soil_type VARCHAR(80)
);

-- Soil Reports (OCR results)
CREATE TABLE soil_reports (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    nitrogen FLOAT,
    phosphorus FLOAT,
    potassium FLOAT,
    ph FLOAT,
    raw_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crop Recommendations
CREATE TABLE crop_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    nitrogen FLOAT, phosphorus FLOAT, potassium FLOAT, ph FLOAT,
    recommended_crop VARCHAR(80),
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Disease Detections
CREATE TABLE disease_detections (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    disease_name VARCHAR(120),
    confidence FLOAT,
    treatment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tractors
CREATE TABLE tractors (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(50),
    brand VARCHAR(80),
    model VARCHAR(80),
    purchase_year INT
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX idx_farms_user ON farms(user_id);
CREATE INDEX idx_plots_farm ON plots(farm_id);
CREATE INDEX idx_notif_user ON notifications(user_id);
