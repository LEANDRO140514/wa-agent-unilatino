-- EVA-CJ-1 — Tabla de eventos de atribución de las tres fuentes (§21).
-- Idempotente. NO crear live en esta fase: preparación solamente.

CREATE TABLE IF NOT EXISTS eva_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  source text,
  capture_method text,
  entry_context text,
  normalized_phone text,
  email text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received',
  ghl_action text,
  ghl_contact_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_eva_lead_events_phone ON eva_lead_events (normalized_phone);
CREATE INDEX IF NOT EXISTS idx_eva_lead_events_created ON eva_lead_events (created_at DESC);
