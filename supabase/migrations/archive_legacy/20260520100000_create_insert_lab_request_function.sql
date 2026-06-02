-- Migration: Create stored procedure for lab request insertion
-- This bypasses PostgREST schema cache issues by using direct SQL execution

CREATE OR REPLACE FUNCTION public.insert_lab_request(
    p_customer_id UUID,
    p_requested_by_profile_id UUID,
    p_machine_id UUID DEFAULT NULL,
    p_title TEXT DEFAULT 'Lab Test Request',
    p_description TEXT DEFAULT '',
    p_due_date DATE DEFAULT NULL,
    p_priority TEXT DEFAULT 'medium',
    p_is_new_machine BOOLEAN DEFAULT FALSE,
    p_new_machine_data JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, error_message TEXT) AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.oil_lab_requests (
        customer_id,
        requested_by_profile_id,
        machine_id,
        title,
        description,
        due_date,
        priority,
        status,
        request_date,
        is_new_machine,
        new_machine_data,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        p_requested_by_profile_id,
        p_machine_id,
        p_title,
        p_description,
        p_due_date,
        p_priority,
        'pending',
        CURRENT_DATE,
        p_is_new_machine,
        p_new_machine_data,
        NOW(),
        NOW()
    ) RETURNING id INTO v_id;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.insert_lab_request(UUID, UUID, UUID, TEXT, TEXT, DATE, TEXT, BOOLEAN, JSONB) TO authenticated;
