const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  database: "restaurant_billing",
  password: "Sathvik123!",
  port: 5432,
  host: "localhost",
});
pool
  .query(
    `
      WITH FlatItems AS (
          SELECT 
              b.track as shift_name,
              item->>'item_name' as item_name,
              item->>'category' as legacy_category,
              (item->>'quantity')::integer as qty,
              (item->>'line_total')::decimal as amount,
              COALESCE(item->'categories', '[]'::jsonb) as categories_json
          FROM bills b,
          jsonb_array_elements(b.items_json) as item
          WHERE b.bill_date >= '2026-02-25' AND b.bill_number > 0
          AND (
            item->>'category' ILIKE '%Idli%' OR
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(
                CASE 
                  WHEN jsonb_typeof(COALESCE(item->'categories', '[]'::jsonb)->0) = 'array' THEN COALESCE(item->'categories', '[]'::jsonb)->0
                  ELSE COALESCE(item->'categories', '[]'::jsonb)
                END
              ) cat
              WHERE cat->>'name' ILIKE '%Idli%'
            )
          )
      ),
      ProcessedItems AS (
          SELECT 
              shift_name,
              item_name,
              qty,
              amount,
              COALESCE(
                  (SELECT SUM((cat->>'qty')::integer) FROM jsonb_array_elements(
                    CASE 
                      WHEN jsonb_typeof(categories_json->0) = 'array' THEN categories_json->0
                      ELSE categories_json
                    END
                  ) cat),
                  1
              ) as multiplier,
              COALESCE(
                  (SELECT cat->>'name' FROM jsonb_array_elements(
                    CASE 
                      WHEN jsonb_typeof(categories_json->0) = 'array' THEN categories_json->0
                      ELSE categories_json
                    END
                  ) cat LIMIT 1),
                  legacy_category
              ) as category_name
          FROM FlatItems
      )
      SELECT   
        item_name,
        category_name as category,
        SUM(qty * multiplier) as total_quantity,
        SUM(amount) as total_amount,
        shift_name
      FROM ProcessedItems
      GROUP BY item_name, category_name, shift_name
      ORDER BY total_quantity DESC
`,
  )
  .then((res) => console.log(res.rows))
  .catch((err) => console.error(err.message))
  .finally(() => process.exit(0));
