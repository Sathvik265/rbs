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
        console.log("--- Consolidating SP move_orders_to_bill_json ---");

        // 1. Drop both versions
        await client.query("DROP FUNCTION IF EXISTS public.move_orders_to_bill_json(integer, character varying, character varying);");
        await client.query("DROP FUNCTION IF EXISTS public.move_orders_to_bill_json(integer, text, text);");

        console.log("Dropped existing functions.");

        // 2. Create the correct version (using TEXT for broad compatibility)
        const createQuery = `
CREATE OR REPLACE FUNCTION public.move_orders_to_bill_json(p_bill_id integer, p_table_no text, p_party_no text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
        console.log("Created correct function.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

fixSP();
