-- SQL script to create an RPC for fetching the latest lab test per machine
-- This optimizes the alert queue generation by offloading aggregation to the database.

CREATE OR REPLACE FUNCTION get_latest_machine_tests()
RETURNS TABLE (
  machine_id UUID,
  test_date TIMESTAMP WITH TIME ZONE,
  water_content NUMERIC,
  tan_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (t.machine_id)
    t.machine_id,
    t.test_date,
    t.water_content,
    t.tan_value
  FROM oil_lab_tests t
  ORDER BY t.machine_id, t.test_date DESC;
END;
$$ LANGUAGE plpgsql;
