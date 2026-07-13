-- EVA-CJ-1 — Campos de journey dirigido y atribución (§21).
-- Idempotente. NO ejecutar live en esta fase: preparación solamente.
-- No modifica ghl_contact_id, no borra columnas, no altera tipos.

ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS menu_state text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS menu_version text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS menu_last_action text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS menu_updated_at timestamptz;

ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS eva_fuente_lead text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS eva_metodo_captura text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS eva_contexto_entrada text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS eva_ultimo_touch text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS eva_tema_atencion text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS eva_estado_journey text;
ALTER TABLE wa_contacts_state ADD COLUMN IF NOT EXISTS eva_siguiente_accion text;
