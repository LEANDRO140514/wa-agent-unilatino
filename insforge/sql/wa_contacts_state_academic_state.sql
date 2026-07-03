-- Eva WA — persistencia de memoria académica multi-turno (academic-engine state)
-- Ejecutar en InsForge SQL editor antes de deploy del handler que escribe academic_state.

ALTER TABLE wa_contacts_state
  ADD COLUMN IF NOT EXISTS academic_state JSONB DEFAULT NULL;

COMMENT ON COLUMN wa_contacts_state.academic_state IS
  'Estado académico serializado (last_career, current_modality, etc.) para academic-engine multi-turno';
