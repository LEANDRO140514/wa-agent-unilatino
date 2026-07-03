-- ENG-0A-bis: RPC helpers for academic_state (bypass PostgREST column schema cache + edge HTTP loop)
-- Idempotent: CREATE OR REPLACE

CREATE OR REPLACE FUNCTION public.get_wa_contact_academic_state(p_normalized_phone text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT academic_state
  FROM wa_contacts_state
  WHERE normalized_phone = p_normalized_phone
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.patch_wa_contact_academic_state(
  p_normalized_phone text,
  p_academic_state jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state jsonb;
BEGIN
  UPDATE wa_contacts_state
  SET academic_state = p_academic_state,
      updated_at = NOW()
  WHERE normalized_phone = p_normalized_phone
  RETURNING academic_state INTO v_state;

  RETURN v_state;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wa_contact_academic_state(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patch_wa_contact_academic_state(text, jsonb) TO anon, authenticated;
