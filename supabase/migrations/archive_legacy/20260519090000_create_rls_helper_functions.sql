-- Migration: Create helper functions for Row-Level Security (RLS) policies.
-- These functions provide a secure way to access user claims from the JWT.

-- Function to get a specific claim from the currently authenticated user's JWT.
-- Usage: get_my_claim('user_role') -> 'admin'
CREATE OR REPLACE FUNCTION public.get_my_claim(claim TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN nullif(current_setting('request.jwt.claims', true), '')::JSONB ->> claim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the customer_id for the currently authenticated user.
-- This is a convenience wrapper around get_my_claim.
-- Usage: get_my_customer_id() -> 'uuid-for-customer'
CREATE OR REPLACE FUNCTION public.get_my_customer_id()
RETURNS UUID AS $$
DECLARE
    customer_id_text TEXT;
BEGIN
    customer_id_text := get_my_claim('customer_id');
    IF customer_id_text IS NULL THEN
        RETURN NULL;
    END IF;
    -- The claim is stored as a JSON string, so we need to unquote it before casting.
    RETURN (TRIM(BOTH '"' FROM customer_id_text))::UUID;
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if casting fails for any reason
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
