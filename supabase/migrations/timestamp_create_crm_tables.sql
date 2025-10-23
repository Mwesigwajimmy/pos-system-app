-- Table for sales pipeline stages (e.g., Lead, Contacted, Proposal, Won, Lost)
CREATE TABLE "pipeline_stages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "order" INT NOT NULL, -- To define the order in the pipeline
    "is_default" BOOLEAN DEFAULT false,
    UNIQUE(tenant_id, name)
);

-- Table for leads/deals. Can be linked to a customer account if converted.
CREATE TABLE "deals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "title" TEXT NOT NULL, -- e.g., "New Website Project for Acme Corp"
    "value" NUMERIC(12, 2),
    "currency_code" TEXT,
    "stage_id" UUID NOT NULL REFERENCES pipeline_stages(id),
    "customer_id" UUID REFERENCES customers(id), -- Link after conversion
    "contact_name" TEXT,
    "contact_email" TEXT,
    "owner_id" UUID REFERENCES employees(id), -- Salesperson responsible
    "expected_close_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ
);

-- Table for logging all interactions (calls, emails, meetings)
CREATE TABLE "interactions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "customer_id" UUID REFERENCES customers(id),
    "deal_id" UUID REFERENCES deals(id),
    "type" TEXT NOT NULL CHECK (type IN ('EMAIL', 'CALL', 'MEETING', 'NOTE')),
    "content" TEXT NOT NULL,
    "created_by" UUID NOT NULL REFERENCES employees(id),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for support tickets
CREATE TABLE "support_tickets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "ticket_uid" TEXT UNIQUE NOT NULL, -- Human-readable ID like "SUP-1001"
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customer_id" UUID NOT NULL REFERENCES customers(id),
    "assigned_to" UUID REFERENCES employees(id),
    "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED', 'ON_HOLD')),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ
);

-- Table for replies within a support ticket
CREATE TABLE "ticket_replies" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    "author_id" UUID NOT NULL REFERENCES employees(id), -- For staff replies
    -- In a full system, you might have a user ID for customer replies
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for marketing campaigns
CREATE TABLE "marketing_campaigns" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK (type IN ('EMAIL', 'SMS')),
    "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENT', 'ARCHIVED')),
    "target_audience" JSONB, -- Can store criteria for segmentation
    "content" TEXT,
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL REFERENCES employees(id),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE "deals" IS 'Represents sales opportunities or leads in the pipeline.';
COMMENT ON TABLE "interactions" IS 'Logs every touchpoint with a customer or deal.';
COMMENT ON TABLE "support_tickets" IS 'Tracks customer support requests.';
COMMENT ON TABLE "marketing_campaigns" IS 'Manages email or SMS marketing campaigns.';