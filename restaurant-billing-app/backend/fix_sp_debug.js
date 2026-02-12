const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fixSP() {
    const client = await pool.connect();
    try {
        console.log("--- Updating SP with Debug Logging ---");

        const createQuery = `
CREATE OR REPLACE FUNCTION public.move_orders_to_bill_json(p_bill_id integer, p_table_no text, p_party_no text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_bill_items JSONB;
    v_count INTEGER;
BEGIN
    -- DEBUG LOG: Start
    INSERT INTO debug_logs (message, data) 
    VALUES ('SP Start', jsonb_build_object('bill_id', p_bill_id, 'table', p_table_no, 'party', p_party_no));

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
                            THEN jsonb_build_array(i.category::text) 
                            ELSE '[]'::jsonb 
                          END
        )
    )
    INTO v_bill_items
    FROM orders o
    LEFT JOIN items i ON (i.alpha_code = o.item_code OR i.numeric_code = o.numeric_item_code)
    WHERE o.table_no::text = p_table_no
    AND o.party_no::text = p_party_no;

    -- DEBUG LOG: Items Found
    v_count := jsonb_array_length(COALESCE(v_bill_items, '[]'::jsonb));
    INSERT INTO debug_logs (message, data) 
    VALUES ('SP Items Found', jsonb_build_object('count', v_count, 'items', v_bill_items));

    -- 2. Update the bill items_json
    UPDATE bills 
    SET items_json = COALESCE(v_bill_items, '[]'::jsonb)
    WHERE id = p_bill_id;

    -- 3. Delete the moved orders
    DELETE FROM orders 
    WHERE table_no::text = p_table_no 
    AND party_no::text = p_party_no;

END;
$function$;
        `;

        await client.query(createQuery);
        console.log("Updated SP with debug logging.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

fixSP();
