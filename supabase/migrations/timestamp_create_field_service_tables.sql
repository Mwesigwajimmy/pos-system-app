-- The core table for a dispatchable job or service call.
CREATE TABLE "work_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "work_order_uid" TEXT UNIQUE NOT NULL, -- Human-readable ID like "WO-1001"
    "project_id" UUID REFERENCES projects(id), -- Optional: Link to a larger contractor job
    "customer_id" UUID NOT NULL REFERENCES customers(id),
    "summary" TEXT NOT NULL, -- Short description of the job, e.g., "Annual HVAC Maintenance"
    "details" TEXT, -- Detailed notes from the technician
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED')),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    "scheduled_date" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A "join table" to assign one or more technicians (employees) to a work order.
CREATE TABLE "work_order_assignments" (
    "work_order_id" UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    "employee_id" UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    PRIMARY KEY (work_order_id, employee_id)
);

-- Table for tracking company equipment/assets.
CREATE TABLE "equipment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL, -- e.g., "Van #3", "Excavator #1"
    "type" TEXT, -- e.g., "Vehicle", "Heavy Machinery", "Tool"
    "serial_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE')),
    "last_maintenance_date" DATE,
    "next_maintenance_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log table to track which technician used what equipment on which job.
CREATE TABLE "equipment_log" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL REFERENCES equipment(id),
    "work_order_id" UUID NOT NULL REFERENCES work_orders(id),
    "checked_out_by" UUID NOT NULL REFERENCES employees(id),
    "checked_out_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "checked_in_at" TIMESTAMPTZ,
    "notes" TEXT
);

COMMENT ON TABLE "work_orders" IS 'The central record for a field service job or task.';
COMMENT ON TABLE "work_order_assignments" IS 'Links technicians (employees) to work orders.';
COMMENT ON TABLE "equipment" IS 'A registry of all company assets, tools, and vehicles.';
COMMENT ON TABLE "equipment_log" IS 'Provides a history of equipment usage for jobs.';