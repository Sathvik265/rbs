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
CREATE OR REPLACE FUNCTION move_orders_to_bill_json(
    p_table_no TEXT,
    p_party_no INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_bill_items JSONB;
BEGIN
    -- Aggregating orders into a JSONB array including is_separate flag
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

    RETURN v_bill_items;
END;
$$ LANGUAGE plpgsql;
`;

async function runUpdate() {
    const client = await pool.connect();
    try {
        console.log("Updating stored procedure...");
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
