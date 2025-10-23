-- =========== PHASE 3: ADVANCED INVENTORY ===========

-- Add tracking method to the main products table
ALTER TABLE "products"
ADD COLUMN "inventory_tracking_method" TEXT NOT NULL DEFAULT 'QUANTITY' CHECK (inventory_tracking_method IN ('QUANTITY', 'SERIAL', 'LOT'));

-- Table to store individual serial numbers for a product
CREATE TABLE "serial_numbers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "serial_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'SOLD', 'DEFECTIVE')),
    "purchase_order_id" UUID REFERENCES purchase_orders(id), -- Optional: Link to purchase
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, serial_number)
);

-- Table to store batches/lots of a product
CREATE TABLE "lot_numbers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "lot_number" TEXT NOT NULL,
    "quantity_in_stock" INT NOT NULL,
    "expiry_date" DATE,
    "purchase_order_id" UUID REFERENCES purchase_orders(id),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, lot_number)
);

COMMENT ON COLUMN "products"."inventory_tracking_method" IS 'Determines if we track by quantity, serial number, or lot number.';
COMMENT ON TABLE "serial_numbers" IS 'Tracks individual serialized items for high-value goods.';
COMMENT ON TABLE "lot_numbers" IS 'Tracks batches of items, essential for food or medical industries.';

-- =========== PHASE 3: ADVANCED PRICING ===========

-- Main table for pricing rules
CREATE TABLE "pricing_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "priority" INT NOT NULL DEFAULT 0, -- Higher number means higher priority
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conditions for a rule (e.g., applies to a specific customer or product)
CREATE TABLE "pricing_rule_conditions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL REFERENCES pricing_rules(id) ON DELETE CASCADE,
    "type" TEXT NOT NULL CHECK (type IN ('CUSTOMER', 'PRODUCT', 'CATEGORY')),
    "target_id" UUID NOT NULL, -- The ID of the customer, product, or category
    "quantity_min" INT
);

-- Actions for a rule (e.g., sets a fixed price or a discount)
CREATE TABLE "pricing_rule_actions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL REFERENCES pricing_rules(id) ON DELETE CASCADE,
    "type" TEXT NOT NULL CHECK (type IN ('FIXED_PRICE', 'PERCENTAGE_DISCOUNT')),
    "value" NUMERIC(10, 2) NOT NULL
);

COMMENT ON TABLE "pricing_rules" IS 'The engine for creating complex pricing structures.';
COMMENT ON TABLE "pricing_rule_conditions" IS 'Defines WHEN a pricing rule should apply.';
COMMENT ON TABLE "pricing_rule_actions" IS 'Defines WHAT happens when a pricing rule is applied.';


-- =========== PHASE 4: API INTEGRATIONS FRAMEWORK ===========

-- Table to store available third-party integrations
CREATE TABLE "integrations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "slug" TEXT UNIQUE NOT NULL, -- e.g., "dhl", "fedex", "stripe"
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL CHECK (category IN ('SHIPPING', 'PAYMENT', 'TAX')),
    "logo_url" TEXT
);

-- Table to store tenant-specific credentials for an integration
CREATE TABLE "tenant_integrations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "integration_id" UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    -- Encrypted storage for API keys and other secrets.
    -- Supabase Vault is the recommended way to handle this securely.
    -- For this schema, we'll use a text field as a placeholder.
    "credentials" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, integration_id)
);

COMMENT ON TABLE "tenant_integrations" IS 'Stores the connection details for a business''s third-party apps.';