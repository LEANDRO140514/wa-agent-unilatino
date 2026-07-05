-- Fase 1 ítem 3: FSM lite — closed_by_agent + backfill wa_stage → fsm_state
-- NO_CONTACT rows are never overwritten (F2 / opt-out ítem 2).

ALTER TABLE wa_contacts_state
  ADD COLUMN IF NOT EXISTS closed_by_agent BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN wa_contacts_state.closed_by_agent IS
  'E2: asesor cerró caso en HUMANO; habilita reset TTL lazy (24h) al próximo inbound.';

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT lower(trim(wa_stage)) AS stage
    FROM wa_contacts_state
    WHERE wa_stage IS NOT NULL
      AND trim(wa_stage) <> ''
      AND lower(trim(wa_stage)) NOT IN (
        'inicio', 'pendiente_texto', 'orientacion', 'ambiguo', 'cierre_positivo', 'despedida',
        'carrera_interes', 'carreras_exploracion', 'carreras_online', 'ubicacion_consultada',
        'rvoe_consultado', 'objecion_precio', 'promocion_interes', 'nivel_no_principal',
        'revalidacion_interes', 'carrera_no_ofertada', 'test_recomendado',
        'asesor_requerido', 'soporte_test', 'post_test', 'beca_interes',
        'no_contact'
      )
  LOOP
    RAISE NOTICE 'fsm_backfill: wa_stage unmapped → CONSULTA: %', rec.stage;
  END LOOP;
END $$;

UPDATE wa_contacts_state
SET fsm_state = CASE
  WHEN lower(trim(wa_stage)) IN (
    'inicio', 'pendiente_texto', 'orientacion', 'ambiguo', 'cierre_positivo', 'despedida'
  ) THEN 'SALUDO_INICIAL'
  WHEN lower(trim(wa_stage)) IN (
    'asesor_requerido', 'soporte_test', 'post_test', 'beca_interes'
  ) THEN 'HUMANO'
  WHEN lower(trim(wa_stage)) = 'no_contact' THEN 'NO_CONTACT'
  WHEN lower(trim(wa_stage)) IN (
    'carrera_interes', 'carreras_exploracion', 'carreras_online', 'ubicacion_consultada',
    'rvoe_consultado', 'objecion_precio', 'promocion_interes', 'nivel_no_principal',
    'revalidacion_interes', 'carrera_no_ofertada', 'test_recomendado'
  ) THEN 'CONSULTA'
  ELSE 'CONSULTA'
END
WHERE fsm_state IS NULL;
