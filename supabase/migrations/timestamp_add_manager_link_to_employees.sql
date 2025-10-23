-- Add a self-referencing column to establish the manager-employee hierarchy.
ALTER TABLE "employees"
ADD COLUMN "manager_id" UUID REFERENCES "employees"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "employees"."manager_id" IS 'The ID of the employee who is the manager of this employee.';


-- RLS POLICY: Allow managers to view their direct reports' requests.
-- This policy is additive to the existing ones.
CREATE POLICY "Allow managers to view their team's requests"
ON "leave_requests"
FOR SELECT
USING (
  employee_id IN (SELECT id FROM employees WHERE manager_id = (SELECT id FROM employees WHERE user_id = auth.uid()))
);


--- DATABASE FUNCTION (RPC) for fetching team requests ---
-- This function securely fetches all PENDING leave requests for a manager's direct reports.
CREATE OR REPLACE FUNCTION get_manager_team_requests(p_manager_id UUID)
RETURNS TABLE(
    id UUID,
    start_date DATE,
    end_date DATE,
    status TEXT,
    leave_type_name TEXT,
    employee_id UUID,
    employee_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lr.id,
        lr.start_date,
        lr.end_date,
        lr.status,
        lt.name as leave_type_name,
        e.id as employee_id,
        e.full_name as employee_name
    FROM
        leave_requests lr
    JOIN
        employees e ON lr.employee_id = e.id
    JOIN
        leave_types lt ON lr.leave_type_id = lt.id
    WHERE
        e.manager_id = p_manager_id AND lr.status = 'PENDING';
END;
$$;