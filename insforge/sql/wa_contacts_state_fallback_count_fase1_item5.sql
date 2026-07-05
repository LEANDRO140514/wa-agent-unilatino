-- Fase 1 ítem 5: Fallbacks §12 — racha consecutiva de baja confianza (B1)

ALTER TABLE wa_contacts_state
  ADD COLUMN IF NOT EXISTS fallback_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN wa_contacts_state.fallback_count IS
  '§12: racha consecutiva de fallback/repetición sin avance; reset en intent reconocido o lazy reset F4.';
