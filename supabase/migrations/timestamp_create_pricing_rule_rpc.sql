CREATE TYPE pricing_condition AS (
    type TEXT,
    target_id UUID,
    quantity_min INT
);

CREATE TYPE pricing_action AS (
    type TEXT,
    value NUMERIC
);

CREATE OR REPLACE FUNCTION create_or_update_pricing_rule(
    p_rule_id UUID,
    p_tenant_id UUID,
    p_name TEXT,
    p_priority INT,
    p_is_active BOOLEAN,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_conditions pricing_condition[],
    p_actions pricing_action[]
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_rule_id UUID;
    cond pricing_condition;
    act pricing_action;
BEGIN
    -- 1. Upsert the main rule and get its ID
    INSERT INTO pricing_rules (id, tenant_id, name, priority, is_active, start_date, end_date)
    VALUES (p_rule_id, p_tenant_id, p_name, p_priority, p_is_active, p_start_date, p_end_date)
    ON CONFLICT (id) DO UPDATE
    SET name = p_name, priority = p_priority, is_active = p_is_active, start_date = p_start_date, end_date = p_end_date
    RETURNING id INTO v_rule_id;

    -- 2. Delete existing conditions and actions for this rule
    DELETE FROM pricing_rule_conditions WHERE rule_id = v_rule_id;
    DELETE FROM pricing_rule_actions WHERE rule_id = v_rule_id;

    -- 3. Insert new conditions
    FOREACH cond IN ARRAY p_conditions
    LOOP
        INSERT INTO pricing_rule_conditions (rule_id, type, target_id, quantity_min)
        VALUES (v_rule_id, cond.type, cond.target_id, cond.quantity_min);
    END LOOP;

    -- 4. Insert new actions
    FOREACH act IN ARRAY p_actions
    LOOP
        INSERT INTO pricing_rule_actions (rule_id, type, value)
        VALUES (v_rule_id, act.type, act.value);
    END LOOP;

    RETURN v_rule_id;
END;
$$;