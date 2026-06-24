-- Phase 7G.1 — EVA LLM shadow comparison log
-- Apply in InsForge Dashboard SQL editor when enabling shadow mode in staging/prod.

CREATE TABLE IF NOT EXISTS wa_llm_shadow_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_message_id UUID,
  normalized_phone TEXT,
  wa_intent TEXT,
  academic_intent TEXT,
  factual_response TEXT,
  suggested_response TEXT,
  final_response TEXT,
  mode TEXT NOT NULL DEFAULT 'shadow',
  provider TEXT,
  model TEXT,
  guardrail_warnings JSONB DEFAULT '[]'::jsonb,
  llm_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_llm_shadow_log_created_at
  ON wa_llm_shadow_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_llm_shadow_log_phone
  ON wa_llm_shadow_log (normalized_phone);

CREATE INDEX IF NOT EXISTS idx_wa_llm_shadow_log_inbound
  ON wa_llm_shadow_log (inbound_message_id);

-- Phase 7G.2 — rewrite metadata (safe to re-run)
ALTER TABLE wa_llm_shadow_log ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE wa_llm_shadow_log ADD COLUMN IF NOT EXISTS eva_llm_rephrased BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_wa_llm_shadow_log_mode
  ON wa_llm_shadow_log (mode);
