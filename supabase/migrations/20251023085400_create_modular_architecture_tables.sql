-- 1. A table to define all the major modules/pillars in your system.
CREATE TABLE "modules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT UNIQUE NOT NULL, -- e.g., "Human Capital Management", "Contractor Tools"
    "description" TEXT,
    "slug" TEXT UNIQUE NOT NULL -- e.g., "hcm", "contractor"
);

-- 2. A "join table" that connects a tenant to the modules they have activated.
-- This is the core of the switchboard.
CREATE TABLE "tenant_modules" (
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "module_id" UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_id, module_id)
);

-- Enable RLS for these new tables
ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_modules" ENABLE ROW LEVEL SECURITY;

-- Policies: Any authenticated user can read the list of available modules.
CREATE POLICY "Allow read access to all authenticated users"
ON "modules"
FOR SELECT USING (auth.role() = 'authenticated');

-- Policies: Users can only see the module connections for their own tenant.
CREATE POLICY "Allow tenant access to their own modules"
ON "tenant_modules"
FOR SELECT USING (tenant_id = auth.get_tenant_id());