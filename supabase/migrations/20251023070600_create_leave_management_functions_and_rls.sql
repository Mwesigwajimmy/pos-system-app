-- First, enable RLS on all relevant tables
ALTER TABLE "leave_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_balances" ENABLE ROW LEVEL SECURITY;

-- Get the tenant_id from the user's custom claims
CREATE OR REPLACE FUNCTION auth.get_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt()->>'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS POLICY: TENANT ISOLATION
-- Users can only access data belonging to their own tenant.
CREATE POLICY "Allow tenant access based on jwt"
ON "leave_types"
FOR ALL USING (tenant_id = auth.get_tenant_id());

CREATE POLICY "Allow tenant access based on jwt"
ON "leave_requests"
FOR ALL USING (tenant_id = auth.get_tenant_id());

CREATE POLICY "Allow tenant access based on jwt"
ON "leave_balances"
FOR ALL USING (tenant_id = auth.get_tenant_id());

-- RLS POLICY: USER-SPECIFIC ACCESS
-- Employees can only see their own leave requests and balances.
-- NOTE: We assume 'employees' table has a 'user_id' column linking to auth.users
CREATE POLICY "Allow employees to see their own requests and balances"
ON "leave_requests"
FOR SELECT USING (employee_id = (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Allow employees to create their own requests"
ON "leave_requests"
FOR INSERT WITH CHECK (employee_id = (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Add more specific policies for managers later if needed.

--- DATABASE FUNCTION (RPC) ---
-- This function calculates the leave balances for a given employee for the current year.
CREATE OR REPLACE FUNCTION get_employee_leave_balances(p_employee_id UUID)
RETURNS TABLE(
    leave_type_name TEXT,
    accrued_days NUMERIC,
    used_days NUMERIC,
    available_days NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lt.name AS leave_type_name,
        COALESCE(lb.accrued_days, lt.default_days_per_year, 0) AS accrued_days,
        COALESCE(lb.used_days, 0) AS used_days,
        (COALESCE(lb.accrued_days, lt.default_days_per_year, 0) - COALESCE(lb.used_days, 0)) AS available_days
    FROM
        leave_types lt
    LEFT JOIN
        leave_balances lb ON lt.id = lb.leave_type_id
        AND lb.employee_id = p_employee_id
        AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    WHERE
        lt.tenant_id = (SELECT tenant_id FROM employees WHERE id = p_employee_id);
END;
$$;