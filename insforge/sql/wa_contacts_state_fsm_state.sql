-- Fase 1 ítem 2/3: FSM lite — columna aditiva (wa_stage se conserva en paralelo)
ALTER TABLE wa_contacts_state
  ADD COLUMN IF NOT EXISTS fsm_state VARCHAR(30) NULL;

COMMENT ON COLUMN wa_contacts_state.fsm_state IS
  'FSM lite: SALUDO_INICIAL | CONSULTA | HUMANO | NO_CONTACT. NULL hasta backfill ítem 3.';
