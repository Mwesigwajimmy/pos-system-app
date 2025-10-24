-- BI: Table for customizable user dashboards
CREATE TABLE "dashboards" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE, -- Tied to a user
    "name" TEXT NOT NULL,
    "layout" JSONB, -- Stores the grid layout and widget configuration
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ
);

-- SCM: Table for vendors/suppliers
CREATE TABLE "vendors" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SCM: Table for purchase requisitions (the step before a purchase order)
CREATE TABLE "purchase_requisitions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "requester_id" UUID NOT NULL REFERENCES employees(id),
    "vendor_id" UUID REFERENCES vendors(id),
    "description" TEXT NOT NULL,
    "expected_cost" NUMERIC(12, 2),
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ORDERED')),
    "approved_by" UUID REFERENCES employees(id),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ
);

-- SCM: Table for warehouse bin locations
CREATE TABLE "warehouse_bins" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE, -- Link to your existing locations
    "name" TEXT NOT NULL, -- e.g., "Aisle 1, Shelf 3, Bin 4"
    "barcode" TEXT UNIQUE,
    UNIQUE(location_id, name)
);

-- SCM: A linking table to track which products are in which bins
CREATE TABLE "product_bin_locations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "bin_id" UUID NOT NULL REFERENCES warehouse_bins(id) ON DELETE CASCADE,
    "quantity" INT NOT NULL,
    "updated_at" TIMESTAMPTZ
);

COMMENT ON TABLE "dashboards" IS 'Stores user-defined dashboards for BI.';
COMMENT ON TABLE "vendors" IS 'Manages supplier and vendor information.';
COMMENT ON TABLE "purchase_requisitions" IS 'Tracks internal requests for purchases before they become POs.';
COMMENT ON TABLE "warehouse_bins" IS 'Defines specific storage locations within a warehouse.';
COMMENT ON TABLE "product_bin_locations" IS 'Tracks the quantity of a product in a specific bin.';