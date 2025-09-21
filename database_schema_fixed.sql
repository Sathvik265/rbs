-- Restaurant Billing System Database Schema (Fixed)
-- This script creates all the required tables for the system

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Settings table for system configuration
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    hotel_name VARCHAR(255) DEFAULT 'Restaurant Name',
    address TEXT,
    phone VARCHAR(20),
    gstin VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if empty
INSERT INTO settings (hotel_name, address, phone, gstin) 
SELECT 'Udupi Anand Bhavan', 'Default Address', '123-456-7890', 'GST123456789'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- 2. Items/Menu table
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    alpha_code VARCHAR(20) UNIQUE,
    numeric_code VARCHAR(20) UNIQUE,
    price_fixed DECIMAL(10,2) DEFAULT 0,
    price_general DECIMAL(10,2) DEFAULT 0,
    price_ac DECIMAL(10,2) DEFAULT 0,
    category VARCHAR(100),
    item_group VARCHAR(50) DEFAULT 'regular',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sessions/Shifts table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    clerk_initials VARCHAR(10) NOT NULL,
    shift_code VARCHAR(20) NOT NULL,
    session_date DATE NOT NULL,
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_timestamp TIMESTAMP,
    session_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(clerk_initials, shift_code, session_date, login_timestamp)
);

-- 4. Bill number sequence table for managing sequential numbering
CREATE TABLE IF NOT EXISTS bill_sequences (
    bill_date DATE PRIMARY KEY,
    last_number INTEGER DEFAULT 0
);

-- 5. Bills table
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    bill_number INTEGER NOT NULL,
    bill_date DATE NOT NULL,
    table_no VARCHAR(20),
    party_no VARCHAR(20) DEFAULT '1',
    section VARCHAR(10) DEFAULT 'G',
    track VARCHAR(20),
    clerk_initials VARCHAR(10),
    session_id UUID REFERENCES sessions(session_id),
    subtotal DECIMAL(10,2) DEFAULT 0,
    sgst DECIMAL(10,2) DEFAULT 0,
    cgst DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2) DEFAULT 0,
    modified_from_bill_id INTEGER REFERENCES bills(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bill_number, bill_date)
);

-- 6. Bill items table
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
    item_code VARCHAR(20),
    item_name VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit log table for tracking all actions
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_id UUID DEFAULT uuid_generate_v4(),
    timestamp_utc TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by_user_id VARCHAR(50),
    performed_by_user_name VARCHAR(100),
    user_role VARCHAR(20),
    action_type VARCHAR(50),
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    session_id UUID,
    ip_address INET,
    payload JSONB,
    correlation_id UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bills_date_number ON bills(bill_date, bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_session ON bills(session_id);
CREATE INDEX IF NOT EXISTS idx_items_codes ON items(alpha_code, numeric_code);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active, session_date);

-- Insert sample menu items
INSERT INTO items (name, alpha_code, numeric_code, price_fixed, price_general, price_ac, category) VALUES
('Idli (2 pcs)', 'IDL', '101', 25.00, 30.00, 35.00, 'South Indian'),
('Dosa Plain', 'DOS', '102', 35.00, 40.00, 45.00, 'South Indian'),
('Vada (2 pcs)', 'VAD', '103', 30.00, 35.00, 40.00, 'South Indian'),
('Coffee', 'COF', '201', 15.00, 20.00, 25.00, 'Beverages'),
('Tea', 'TEA', '202', 12.00, 15.00, 18.00, 'Beverages'),
('Samosa (2 pcs)', 'SAM', '301', 20.00, 25.00, 30.00, 'Snacks'),
('Puri Bhaji', 'PUR', '401', 45.00, 50.00, 55.00, 'North Indian'),
('Rice', 'RIC', '501', 35.00, 40.00, 45.00, 'Rice Items')
ON CONFLICT (alpha_code) DO NOTHING;

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();