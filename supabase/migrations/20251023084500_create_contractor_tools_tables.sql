-- The central table for all contractor work.
CREATE TABLE "projects" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "project_uid" TEXT UNIQUE NOT NULL, -- Human-readable ID like "PROJ-1001"
    "name" TEXT NOT NULL,
    "customer_id" UUID REFERENCES customers(id),
    "status" TEXT NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
    "start_date" DATE,
    "end_date" DATE,
    "estimated_budget" NUMERIC(12, 2),
    "actual_cost" NUMERIC(12, 2) DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for estimates or bids given to customers.
CREATE TABLE "estimates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" UUID REFERENCES projects(id), -- Can be linked after approval
    "customer_id" UUID NOT NULL REFERENCES customers(id),
    "estimate_uid" TEXT UNIQUE NOT NULL, -- Human-readable ID like "EST-1001"
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED')),
    "total_amount" NUMERIC(12, 2) NOT NULL,
    "valid_until" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Line items within an estimate (e.g., Labor, Materials).
CREATE TABLE "estimate_line_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "estimate_id" UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "quantity" NUMERIC(10, 2) NOT NULL,
    "unit_price" NUMERIC(10, 2) NOT NULL,
    "total" NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Table for tracking all costs associated with a project (Job Costing).
CREATE TABLE "job_costs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "expense_id" UUID REFERENCES expenses(id), -- Link to your existing expenses table
    "cost_type" TEXT NOT NULL CHECK (cost_type IN ('LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'OTHER')),
    "description" TEXT NOT NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for formal change orders to a project.
CREATE TABLE "change_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount_change" NUMERIC(12, 2) NOT NULL, -- Can be positive or negative
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE "projects" IS 'Central hub for a contractor''s jobs.';
COMMENT ON TABLE "job_costs" IS 'Core of the job costing system, tracking all project-related expenses.';
COMMENT ON TABLE "estimates" IS 'Stores bids and estimates for potential work.';
COMMENT ON TABLE "change_orders" IS 'Manages formal changes to a project''s scope and budget.';