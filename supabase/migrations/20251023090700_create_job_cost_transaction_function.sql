-- This function is the core of the job costing system's data integrity.
-- It runs as a single transaction: either both operations succeed, or both fail.
CREATE OR REPLACE FUNCTION add_job_cost_and_update_project(
    p_project_id UUID,
    p_cost_type TEXT,
    p_description TEXT,
    p_amount NUMERIC,
    p_transaction_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Insert the new cost into the job_costs table.
    INSERT INTO job_costs (project_id, cost_type, description, amount, transaction_date)
    VALUES (p_project_id, p_cost_type, p_description, p_amount, p_transaction_date);

    -- 2. Atomically update the actual_cost on the parent projects table.
    UPDATE projects
    SET actual_cost = actual_cost + p_amount
    WHERE id = p_project_id;
END;
$$;