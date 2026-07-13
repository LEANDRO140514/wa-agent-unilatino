-- FASE 9B — Core-engine shadow comparison log (Costura 1)
-- Aplicar en InsForge Dashboard SQL editor antes de activar FF_CORE_SHADOW.
-- Patrón: espejo de wa_llm_shadow_log (Phase 7G.1).

CREATE TABLE IF NOT EXISTS wa_core_shadow_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_message_id UUID,
  normalized_phone TEXT,
  eva_state TEXT,
  core_state TEXT,
  eva_intent TEXT,
  eva_outcome TEXT,
  eva_response TEXT,
  core_flags JSONB DEFAULT '{}'::jsonb,
  core_reason_codes JSONB DEFAULT '[]'::jsonb,
  core_action TEXT,
  core_transition_allowed BOOLEAN,
  core_transition_to TEXT,
  core_gate_allowed BOOLEAN,
  core_gate_reason TEXT,
  agreement BOOLEAN,
  disagreement_reason TEXT,
  vendor_commit TEXT,
  mode TEXT NOT NULL DEFAULT 'shadow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_core_shadow_log_created_at
  ON wa_core_shadow_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_core_shadow_log_phone
  ON wa_core_shadow_log (normalized_phone);

CREATE INDEX IF NOT EXISTS idx_wa_core_shadow_log_agreement
  ON wa_core_shadow_log (agreement);
