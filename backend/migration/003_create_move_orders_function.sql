-- Migration 003: Create move_orders_to_bill_json stored procedure
-- This function moves orders from the orders table to the bills.items JSONB column

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
