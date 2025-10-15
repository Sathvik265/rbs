-- Drop old tables if they exist to prevent errors
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS bill_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS tables;
DROP TABLE IF EXISTS sections;

-- Create the new schema
-- Create a table to define the different sections of the restaurant
CREATE TABLE sections (
    section_id SERIAL PRIMARY KEY,
    section_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Create a table to store details about each physical table
CREATE TABLE tables (
    table_id SERIAL PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    section_id INT NOT NULL,
    capacity INT DEFAULT 2,
    CONSTRAINT fk_section
        FOREIGN KEY(section_id)
        REFERENCES sections(section_id)
);

-- This table temporarily stores all items ordered for a specific table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    table_number INT NOT NULL,
    clerk_initials VARCHAR(4) NOT NULL,
    item_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price_per_item NUMERIC(10, 2) NOT NULL,
    order_time TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_table
        FOREIGN KEY(table_number)
        REFERENCES tables(table_number)
);

-- The main bills table, now with a composite primary key and a JSONB column for items.
CREATE TABLE bills (
    track VARCHAR(50) NOT NULL,
    clerk_initials VARCHAR(4) NOT NULL,
    table_number INT NOT NULL,
    party_number INT NOT NULL,
    bill_number BIGINT NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    bill_status VARCHAR(20) DEFAULT 'printed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (track, clerk_initials, table_number, party_number, bill_number)
);