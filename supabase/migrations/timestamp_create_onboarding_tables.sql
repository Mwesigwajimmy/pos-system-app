-- Table for reusable onboarding checklist templates
CREATE TABLE "onboarding_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_by" UUID NOT NULL REFERENCES employees(id),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ
);

-- Table for the individual items/tasks within a template
CREATE TABLE "onboarding_template_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_after_days" INT, -- e.g., Task is due 3 days after employee start date
    "responsible_role" TEXT CHECK (responsible_role IN ('MANAGER', 'EMPLOYEE', 'HR')),
    "order" INT NOT NULL
);

-- Table to assign a template to a specific new employee
CREATE TABLE "employee_onboarding_checklists" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employee_id" UUID UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    "template_id" UUID NOT NULL REFERENCES onboarding_templates(id),
    "start_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    "assigned_by" UUID NOT NULL REFERENCES employees(id),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to track the status of each individual task for a specific employee
CREATE TABLE "employee_onboarding_tasks" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "checklist_id" UUID NOT NULL REFERENCES employee_onboarding_checklists(id) ON DELETE CASCADE,
    "template_item_id" UUID NOT NULL REFERENCES onboarding_template_items(id),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ,
    "notes" TEXT
);

COMMENT ON TABLE "onboarding_templates" IS 'Stores reusable onboarding checklist templates.';
COMMENT ON TABLE "onboarding_template_items" IS 'Defines the individual tasks within a template.';
COMMENT ON TABLE "employee_onboarding_checklists" IS 'Assigns an onboarding template to a new employee.';
COMMENT ON TABLE "employee_onboarding_tasks" IS 'Tracks the progress of each task for a specific employee.';