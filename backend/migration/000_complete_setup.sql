-- Complete Database Setup Script
-- Run this in order to set up the complete database schema for the application

-- ========================================
-- 1. CREATE INITIAL TABLES
-- ========================================

DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

CREATE TABLE sections (
    section_id SERIAL PRIMARY KEY,
    section_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE tables (
    table_id SERIAL PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    section_id INT NOT NULL,
    capacity INT DEFAULT 2,
    CONSTRAINT fk_section
        FOREIGN KEY(section_id)
        REFERENCES sections(section_id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    table_no INT NOT NULL,
    party_no VARCHAR(10) DEFAULT '1',
    clerk_initials VARCHAR(4) NOT NULL,
    track VARCHAR(50),
    bill_number BIGINT,
    bill_date DATE DEFAULT CURRENT_DATE,
    item_code VARCHAR(100),
    numeric_item_code VARCHAR(100),
    item_id INT,
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    line_total NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_table_no
        FOREIGN KEY(table_no)
        REFERENCES tables(table_number)
);

CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    track VARCHAR(50) NOT NULL,
    clerk_initials VARCHAR(4) NOT NULL,
    table_no INT,
    party_no VARCHAR(10) DEFAULT '1',
    bill_number BIGINT NOT NULL,
    bill_date DATE DEFAULT CURRENT_DATE,
    section VARCHAR(100),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    items_json JSONB,
    order_id INT,
    subtotal NUMERIC(10, 2) DEFAULT 0,
    sgst NUMERIC(10, 2) DEFAULT 0,
    cgst NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    grand_total NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    bill_status VARCHAR(20) DEFAULT 'printed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bill_date, bill_number)
);

CREATE TABLE bill_items (
    bill_item_id SERIAL PRIMARY KEY,
    bill_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price_per_item NUMERIC(10, 2) NOT NULL,
    line_total NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    alpha_code VARCHAR(100),
    numeric_code VARCHAR(100),
    price_fixed NUMERIC(10, 2) DEFAULT 0,
    price_general NUMERIC(10, 2) DEFAULT 0,
    price_ac NUMERIC(10, 2) DEFAULT 0,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(alpha_code),
    UNIQUE(numeric_code)
);

CREATE TABLE shifts (
    shift_id SERIAL PRIMARY KEY,
    shift_name VARCHAR(100) UNIQUE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID DEFAULT gen_random_uuid() UNIQUE,
    shift_name VARCHAR(100),
    clerk_initials VARCHAR(4),
    session_date DATE DEFAULT CURRENT_DATE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shift_name, session_date, clerk_initials)
);

-- ========================================
-- 2. CREATE STORED PROCEDURES
-- ========================================

CREATE OR REPLACE FUNCTION move_orders_to_bill_json(
    p_bill_id INT,
    p_table_no VARCHAR,
    p_party_no VARCHAR
)
RETURNS void AS $$
DECLARE
    v_items_json JSONB;
BEGIN
    -- Aggregate orders into a JSONB array
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', item_name,
            'quantity', quantity,
            'price_per_item', unit_price,
            'line_total', line_total,
            'item_code', item_code,
            'numeric_item_code', numeric_item_code
        )
        ORDER BY id
    ) INTO v_items_json
    FROM orders
    WHERE table_no::VARCHAR = p_table_no::VARCHAR
      AND party_no::VARCHAR = p_party_no::VARCHAR;

    -- If no orders found, set empty array
    IF v_items_json IS NULL THEN
        v_items_json := '[]'::jsonb;
    END IF;

    -- Update the bill with the aggregated items
    UPDATE bills
    SET items = v_items_json
    WHERE id = p_bill_id;

    -- Delete the orders that were moved
    DELETE FROM orders
    WHERE table_no::VARCHAR = p_table_no::VARCHAR
      AND party_no::VARCHAR = p_party_no::VARCHAR;

END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. CREATE INDEXES
-- ========================================

CREATE INDEX idx_orders_table_no ON orders(table_no);
CREATE INDEX idx_orders_party_no ON orders(party_no);
CREATE INDEX idx_orders_track ON orders(track);
CREATE INDEX idx_orders_bill_date ON orders(bill_date);

CREATE INDEX idx_bills_bill_date ON bills(bill_date);
CREATE INDEX idx_bills_track ON bills(track);
CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bills_table_no ON bills(table_no);

CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);

CREATE INDEX idx_items_alpha_code ON items(alpha_code);
CREATE INDEX idx_items_numeric_code ON items(numeric_code);

CREATE INDEX idx_sessions_shift_name ON sessions(shift_name);
CREATE INDEX idx_sessions_session_date ON sessions(session_date);
CREATE INDEX idx_sessions_status ON sessions(status);
