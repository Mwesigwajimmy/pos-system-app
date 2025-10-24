-- Table to store storefront settings for each tenant
CREATE TABLE "storefronts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "subdomain" TEXT UNIQUE, -- e.g., "my-store.your-platform.com"
    "custom_domain" TEXT UNIQUE,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "currency_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ
);

-- This table links inventory products to the online storefront.
-- It allows for online-specific details without modifying the core product table.
CREATE TABLE "online_products" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "storefront_id" UUID NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
    "slug" TEXT UNIQUE NOT NULL, -- For clean URLs, e.g., "premium-coffee-beans"
    "online_title" TEXT NOT NULL,
    "online_description" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT false,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "updated_at" TIMESTAMPTZ
);

-- Table for orders placed through the eCommerce storefront
CREATE TABLE "online_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "storefront_id" UUID NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
    "order_uid" TEXT UNIQUE NOT NULL, -- Human-readable ID like "WEB-1001"
    "customer_id" UUID REFERENCES customers(id),
    "customer_email" TEXT NOT NULL,
    "total_amount" NUMERIC(12, 2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED')),
    "shipping_address" JSONB,
    "billing_address" JSONB,
    "shipping_method" TEXT,
    "payment_gateway" TEXT,
    "payment_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for items within an online order
CREATE TABLE "online_order_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    "product_id" UUID NOT NULL REFERENCES products(id),
    "quantity" INT NOT NULL,
    "price_at_purchase" NUMERIC(10, 2) NOT NULL
);

-- Table for online booking settings for service-based tenants
CREATE TABLE "booking_settings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "allow_online_booking" BOOLEAN NOT NULL DEFAULT false,
    "booking_window_days" INT DEFAULT 30, -- How many days in advance can customers book
    "cancellation_policy" TEXT,
    "requires_prepayment" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ
);

COMMENT ON TABLE "storefronts" IS 'Manages the online store settings for each tenant.';
COMMENT ON TABLE "online_products" IS 'Makes inventory products available online with specific details.';
COMMENT ON TABLE "online_orders" IS 'Stores orders originating from the eCommerce storefront.';
COMMENT ON TABLE "booking_settings" IS 'Controls online booking availability and rules for service businesses.';