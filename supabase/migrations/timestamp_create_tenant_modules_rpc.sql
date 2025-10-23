CREATE OR REPLACE FUNCTION get_tenant_module_slugs()
RETURNS TEXT[] AS $$
DECLARE
    v_tenant_id UUID;
    module_slugs TEXT[];
BEGIN
    -- Get the tenant_id from the user's custom claims in their JWT
    v_tenant_id := auth.get_tenant_id();

    SELECT ARRAY_AGG(m.slug)
    INTO module_slugs
    FROM tenant_modules tm
    JOIN modules m ON tm.module_id = m.id
    WHERE tm.tenant_id = v_tenant_id;

    RETURN module_slugs;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;