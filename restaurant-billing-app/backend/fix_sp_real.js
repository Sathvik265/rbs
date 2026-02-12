const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const updateQuery = `
-- Drop the accidental 2-arg version if it exists
DROP FUNCTION IF EXISTS move_orders_to_bill_json(TEXT, INTEGER);

-- Redefine the correct 3-arg version with is_separate logic
CREATE OR REPLACE FUNCTION move_orders_to_bill_json(
    p_bill_id INTEGER,
    p_table_no TEXT,
    p_party_no INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_bill_items JSONB;
BEGIN
    -- 1. Aggregating orders into a JSONB array including is_separate flag
    SELECT jsonb_agg(
        jsonb_build_object(
            'item_name', o.item_name,
            'item_code_numeric', o.numeric_item_code,
            'item_code_alpha', o.item_code,
            'quantity', o.quantity,
            'fixed_price', o.unit_price,
            'actual_price', o.unit_price,
            'line_total', o.line_total,
            'is_separate', COALESCE(i.is_separate, false),
            'categories', CASE 
                            WHEN i.category IS NOT NULL AND i.category::text != 'null'
                            THEN i.category 
                            ELSE '[]'::jsonb 
                          END
        )
    )
    INTO v_bill_items
    FROM orders o
    LEFT JOIN items i ON (i.alpha_code = o.item_code OR i.numeric_code = o.numeric_item_code)
    WHERE o.table_no = p_table_no::INTEGER
    AND o.party_no = p_party_no;

    -- 2. Update the bill items_json
    UPDATE bills 
    SET items_json = COALESCE(v_bill_items, '[]'::jsonb)
    WHERE id = p_bill_id;

    -- 3. Delete the moved orders
    DELETE FROM orders 
    WHERE table_no = p_table_no::INTEGER 
    AND party_no = p_party_no;

END;
$$ LANGUAGE plpgsql;
`;

async function runUpdate() {
    const client = await pool.connect();
    try {
        console.log("Updating stored procedure (3-arg version)...");
        await client.query(updateQuery);
        console.log("Stored procedure updated SUCCESSFULLY.");
    } catch (e) {
        console.error("FAILED to update stored procedure:", e);
    } finally {
        client.release();
        pool.end();
    }
}

runUpdate();
