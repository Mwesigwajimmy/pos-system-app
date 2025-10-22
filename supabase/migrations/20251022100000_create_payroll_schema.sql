-- ========= PAYROLL EXTENSION SCHEMA =========
-- This script creates a fully generic, multi-tenant payroll system.

-- ---- ENUMS (Type Definitions) ----
-- Defines every possible type of payroll element.
CREATE TYPE "public"."element_type" AS ENUM (
  'EARNING',
  'PRE_TAX_DEDUCTION',
  'TAX',
  'POST_TAX_DEDUCTION',
  'EMPLOYER_CONTRIBUTION'
);

-- Defines the states of a payroll run workflow.
CREATE TYPE "public"."payroll_status" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);


-- ---- CORE TABLES ----

-- TENANTS table (Assuming you have one, this is a reference)
-- If you don't have a tenants table, you'll need one to link businesses.
-- It would look something like this:
-- CREATE TABLE "public"."tenants" (
--   "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
--   "business_name" text NOT NULL,
--   "country_code" varchar(2) NOT NULL, -- "UG", "KE", "US"
--   "default_currency_code" varchar(3) NOT NULL -- "UGX", "KES", "USD"
-- );

-- EMPLOYEES table (Assuming you have one, this is a reference)
-- It needs a tenant_id to scope employees to a business.
-- ALTER TABLE "public"."employees" ADD COLUMN "tenant_id" uuid REFERENCES tenants(id);


-- Table 1: PAYROLL_ELEMENTS
-- This is the GLOBAL dictionary of every possible line item on a payslip.
CREATE TABLE "public"."payroll_elements" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "country_code" varchar(2), -- NULL means it's a global element like "Bonus"
    "name" text NOT NULL, -- e.g., "Basic Salary", "Income Tax", "NSSF Employee"
    "type" element_type NOT NULL,
    "is_system_defined" boolean NOT NULL DEFAULT false, -- True for tax/statutory items
    CONSTRAINT payroll_elements_country_name_unique UNIQUE ("country_code", "name")
);
ALTER TABLE "public"."payroll_elements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON "public"."payroll_elements" FOR SELECT USING (true);
COMMENT ON TABLE "public"."payroll_elements" IS 'Global dictionary of all possible earning, deduction, and contribution types.';


-- Table 2: CONTRACTS & CONTRACT_ELEMENTS
-- Defines an employee's salary structure.
CREATE TABLE "public"."contracts" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "employee_id" uuid NOT NULL REFERENCES "public"."employees"(id) ON DELETE CASCADE,
    "pay_schedule" text NOT NULL DEFAULT 'monthly',
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;
-- Add RLS policies to scope access to the tenant of the employee.

CREATE TABLE "public"."contract_elements" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "contract_id" uuid NOT NULL REFERENCES "public"."contracts"(id) ON DELETE CASCADE,
    "element_id" uuid NOT NULL REFERENCES "public"."payroll_elements"(id),
    "amount" numeric(18, 4) NOT NULL, -- High precision for financial data
    "currency_code" varchar(3) NOT NULL
);
ALTER TABLE "public"."contract_elements" ENABLE ROW LEVEL SECURITY;
-- Add RLS policies to scope access to the tenant of the employee.
CREATE INDEX ON "public"."contract_elements" ("contract_id");


-- Table 3: PAYROLL_RUNS & PAYSLIPS
-- The core operational tables.
CREATE TABLE "public"."payroll_runs" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "public"."tenants"(id) ON DELETE CASCADE,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "status" payroll_status NOT NULL DEFAULT 'DRAFT',
    "log_details" jsonb,
    "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "public"."payroll_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow tenant access" ON "public"."payroll_runs" FOR ALL USING (auth.uid() IN (SELECT user_id FROM get_users_for_tenant(tenant_id)));
-- Note: get_users_for_tenant is a helper function you'd create.

CREATE TABLE "public"."payslips" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "payroll_run_id" uuid NOT NULL REFERENCES "public"."payroll_runs"(id) ON DELETE CASCADE,
    "employee_id" uuid NOT NULL REFERENCES "public"."employees"(id) ON DELETE CASCADE,
    "currency_code" varchar(3) NOT NULL,
    "gross_earnings" numeric(18, 4) NOT NULL DEFAULT 0,
    "net_pay" numeric(18, 4) NOT NULL DEFAULT 0,
    "total_deductions" numeric(18, 4) NOT NULL DEFAULT 0,
    "total_employer_contributions" numeric(18, 4) NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "public"."payslips" ENABLE ROW LEVEL SECURITY;
-- Add RLS policies based on the payroll_run's tenant.
CREATE INDEX ON "public"."payslips" ("payroll_run_id");

CREATE TABLE "public"."payslip_details" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "payslip_id" uuid NOT NULL REFERENCES "public"."payslips"(id) ON DELETE CASCADE,
    "element_id" uuid NOT NULL REFERENCES "public"."payroll_elements"(id),
    "calculated_amount" numeric(18, 4) NOT NULL
);
ALTER TABLE "public"."payslip_details" ENABLE ROW LEVEL SECURITY;
-- Add RLS policies based on the payslip's parent.
CREATE INDEX ON "public"."payslip_details" ("payslip_id");


-- ---- SEED SYSTEM-DEFINED PAYROLL ELEMENTS FOR UGANDA ----
-- These are the foundational elements for your first supported country.
INSERT INTO "public"."payroll_elements" (country_code, name, type, is_system_defined)
VALUES
    ('UG', 'Basic Salary', 'EARNING', true),
    ('UG', 'PAYE', 'TAX', true),
    ('UG', 'NSSF Employee', 'PRE_TAX_DEDUCTION', true),
    ('UG', 'NSSF Employer', 'EMPLOYER_CONTRIBUTION', true);

-- Add a global element for bonuses
INSERT INTO "public"."payroll_elements" (country_code, name, type, is_system_defined)
VALUES
    (NULL, 'Bonus', 'EARNING', true);