--- Function Definition #1 ---
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
$function$


--- Function Definition #2 ---
CREATE OR REPLACE FUNCTION public.move_orders_to_bill_json(p_bill_id integer, p_table_no character varying, p_party_no character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$


