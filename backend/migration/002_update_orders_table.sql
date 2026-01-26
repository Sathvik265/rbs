-- Migration 002: Update orders table to match model requirements
-- This adds missing columns that the orderModel expects

ALTER TABLE orders RENAME COLUMN order_id TO id;
ALTER TABLE orders RENAME COLUMN table_number TO table_no;
ALTER TABLE orders RENAME COLUMN price_per_item TO unit_price;
ALTER TABLE orders RENAME COLUMN order_time TO created_at;

-- Add missing columns
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS track VARCHAR(50),
  ADD COLUMN IF NOT EXISTS party_no VARCHAR(10) DEFAULT '1',
  ADD COLUMN IF NOT EXISTS bill_number BIGINT,
  ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS numeric_item_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Remove the foreign key constraint if it exists and recreate it with the new column name
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_table;
ALTER TABLE orders ADD CONSTRAINT fk_table_no 
  FOREIGN KEY (table_no) REFERENCES tables(table_number);

-- Update the table_id to item_id mapping if needed
ALTER TABLE orders RENAME COLUMN item_id TO item_id;

-- Ensure all necessary indexes exist
CREATE INDEX IF NOT EXISTS idx_orders_table_no ON orders(table_no);
CREATE INDEX IF NOT EXISTS idx_orders_party_no ON orders(party_no);
CREATE INDEX IF NOT EXISTS idx_orders_track ON orders(track);
CREATE INDEX IF NOT EXISTS idx_orders_bill_date ON orders(bill_date);
