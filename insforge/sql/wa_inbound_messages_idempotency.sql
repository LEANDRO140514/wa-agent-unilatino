-- ENG-0B: Idempotencia webhook por ycloud_message_id
-- Idempotente: CREATE UNIQUE INDEX IF NOT EXISTS (partial, non-null only)
--
-- PRE-CHECK (ejecutar antes de aplicar en prod):
--   SELECT ycloud_message_id, COUNT(*) AS cnt
--   FROM wa_inbound_messages
--   WHERE ycloud_message_id IS NOT NULL
--   GROUP BY ycloud_message_id
--   HAVING COUNT(*) > 1;
--
-- Si hay duplicados históricos, NO aplicar este índice hasta deduplicar
-- de forma controlada (ver docs/phase-eng-0b-webhook-idempotency-report.md).

CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_inbound_messages_ycloud_message_id_unique
ON wa_inbound_messages (ycloud_message_id)
WHERE ycloud_message_id IS NOT NULL;
