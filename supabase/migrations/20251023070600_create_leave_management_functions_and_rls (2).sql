--- DATABASE FUNCTION (RPC) for updating leave balance ---
-- This function safely increments the used_days for an employee's leave balance.
-- It uses an UPSERT to handle cases where a balance record for the year doesn't exist yet.
CREATE OR REPLACE FUNCTION update_leave_balance(
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_days_to_add NUMERIC,
    p_year INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get the tenant_id for the new record
    SELECT tenant_id INTO v_tenant_id FROM employees WHERE id = p_employee_id;

    INSERT INTO leave_balances (tenant_id, employee_id, leave_type_id, year, used_days, accrued_days)
    VALUES (
        v_tenant_id,
        p_employee_id,
        p_leave_type_id,
        p_year,
        p_days_to_add,
        (SELECT default_days_per_year FROM leave_types WHERE id = p_leave_type_id) -- Set initial accrued days
    )
    ON CONFLICT (employee_id, leave_type_id, year)
    DO UPDATE SET
        used_days = leave_balances.used_days + p_days_to_add;
END;
$$;