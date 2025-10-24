-- This function is the core of the automated module assignment system.
CREATE OR REPLACE FUNCTION public.handle_new_user_and_assign_modules()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_business_type TEXT;
    v_module_slugs TEXT[];
BEGIN
    -- 1. Get the business_type from the user's metadata provided at signup.
    v_business_type := NEW.raw_user_meta_data->>'business_type';

    -- 2. Find the tenant that was created for this new user.
    --    This assumes you have a trigger/policy that creates a tenant for each new user.
    --    We find it by looking for a tenant owned by the new user's ID.
    SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_id = NEW.id;

    -- If for some reason a tenant wasn't created, we stop.
    IF v_tenant_id IS NULL THEN
        RAISE WARNING 'No tenant found for new user %', NEW.id;
        RETURN NEW;
    END IF;

    -- 3. Define the module "packages" for each business type.
    --    This is the central mapping logic.
    CASE v_business_type
        WHEN 'Retail / Wholesale' THEN
            v_module_slugs := ARRAY['sales', 'inventory', 'finance', 'hcm', 'crm', 'ecommerce', 'management'];
        WHEN 'Restaurant / Cafe' THEN
            v_module_slugs := ARRAY['sales', 'inventory', 'finance', 'hcm', 'crm', 'management'];
        WHEN 'Contractor' THEN
            v_module_slugs := ARRAY['finance', 'hcm', 'crm', 'contractor', 'management'];
        WHEN 'Field Service' THEN
            v_module_slugs := ARRAY['finance', 'hcm', 'crm', 'field-service', 'management'];
        WHEN 'Distribution' THEN
            v_module_slugs := ARRAY['sales', 'inventory', 'finance', 'hcm', 'crm', 'distribution', 'management'];
        -- Add cases for all other business types...
        ELSE
            -- Default package for "Other" or unhandled types
            v_module_slugs := ARRAY['sales', 'inventory', 'finance', 'management'];
    END CASE;

    -- 4. Insert the corresponding module links into the tenant_modules table.
    --    This uses the array of slugs to find the correct module IDs.
    INSERT INTO public.tenant_modules (tenant_id, module_id)
    SELECT v_tenant_id, m.id
    FROM public.modules m
    WHERE m.slug = ANY(v_module_slugs);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger that executes the function after a new user is created.
CREATE TRIGGER on_auth_user_created_assign_modules
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_and_assign_modules();