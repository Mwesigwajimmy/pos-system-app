-- Table for performance review cycles
CREATE TABLE "performance_cycles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL, -- e.g., "2025 Q4 Performance Review"
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED')),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for individual performance reviews
CREATE TABLE "performance_reviews" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cycle_id" UUID NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
    "employee_id" UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    "manager_id" UUID REFERENCES employees(id),
    "employee_self_evaluation" TEXT,
    "manager_evaluation" TEXT,
    "overall_rating" INT CHECK (overall_rating BETWEEN 1 AND 5),
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    "submitted_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ
);

-- Table for employee goals
CREATE TABLE "employee_goals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    "cycle_id" UUID REFERENCES performance_cycles(id), -- Optional link to a review cycle
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" DATE,
    "progress" INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE "performance_reviews" IS 'Contains individual employee reviews for a specific cycle.';
COMMENT ON TABLE "employee_goals" IS 'Tracks individual goals set by or for employees.';