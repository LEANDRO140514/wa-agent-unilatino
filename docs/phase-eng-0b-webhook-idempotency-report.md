# ENG-0B — Idempotencia webhook por `ycloud_message_id`

**Fecha:** 2026-07-03  
**Base repo:** `main` @ `93bc987`  
**Runtime remoto:** no modificado (sin deploy en esta fase)  
**Modo:** mock / dry_run

---

## 1. Problema

YCloud puede reenviar el mismo evento webhook. Sin idempotencia, cada replay generaba:

- Nuevo `wa_inbound_messages`
- Nuevo `wa_outbound_messages` (mock)
- Side effects en `wa_contacts_state`, `wa_ghl_sync_log`
- Riesgo futuro de WhatsApp/GHL duplicados en live

La columna `ycloud_message_id` ya existía y se insertaba, pero **no había dedup** ni índice único.

---

## 2. Diseño de idempotencia

### Regla principal

Si llega un webhook con `ycloud_message_id` ya presente en `wa_inbound_messages`:

```txt
No insertar inbound duplicado
No generar respuesta / outbound
No ejecutar GHL sync
No actualizar contacts_state
HTTP 200 con skipped + idempotent
```

Respuesta replay:

```json
{
  "ok": true,
  "skipped": true,
  "idempotent": true,
  "reason": "duplicate_ycloud_message_id",
  "ycloud_message_id": "eng0b-msg-001",
  "inbound_id": "<uuid existente>"
}
```

### Sin `ycloud_message_id`

- Procesa flujo normal (no bloquea)
- Warning no bloqueante: `missing_ycloud_message_id; idempotency skipped`

### Race condition

- Early-return por lookup antes del insert
- Si insert falla por unique violation (`23505`), captura y responde idempotent
- Índice único parcial **pendiente** hasta deduplicar históricos (ver §3)

### Helpers (exportados en handler)

| Función | Rol |
|---------|-----|
| `resolveYcloudMessageId(parsed)` | Normaliza ID desde payload |
| `findExistingInboundByYcloudMessageId(client, id)` | Lookup oldest row |
| `tryIdempotentEarlyReturn(...)` | Early-return HTTP |
| `handleInboundInsertUniqueRace(...)` | Fallback post-insert unique error |
| `buildIdempotentWebhookResponse(...)` | Respuesta estándar |

---

## 3. SQL

**Archivo:** `insforge/sql/wa_inbound_messages_idempotency.sql`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_inbound_messages_ycloud_message_id_unique
ON wa_inbound_messages (ycloud_message_id)
WHERE ycloud_message_id IS NOT NULL;
```

| Item | Estado |
|------|--------|
| SQL en repo | **Sí** |
| SQL aplicado en InsForge | **No** (bloqueado por duplicados históricos) |
| Índice único remoto | **No** |

### Duplicados previos (pre-check remoto)

7 grupos con `COUNT = 2` cada uno — fixtures E2E reutilizados:

| `ycloud_message_id` | Filas |
|---------------------|-------|
| `msg-case-01` … `msg-case-07` | 2 c/u |

**Estrategia segura (no destructiva):**

1. Aplicar handler idempotente **primero** (early-return evita nuevos duplicados).
2. Tras deploy, auditar pares duplicados (conservar fila más antigua por `received_at`).
3. Deduplicar manualmente o con script aprobado (fuera de ENG-0B).
4. Entonces aplicar `wa_inbound_messages_idempotency.sql`.

---

## 4. Handler changes

**Archivo:** `insforge/functions/ycloud-wa-inbound.js` (+95 líneas aprox.)

Flujo insertado tras `getClient()`:

1. `resolveYcloudMessageId(parsed)`
2. Si ausente → `logWarning` opcional
3. Si presente → lookup → early-return idempotent
4. Insert con `ycloud_message_id` normalizado
5. On unique error → race handler → idempotent response

**Mock DB:** `mock-insforge-client.js` — soporte `.order()`, simulación unique en insert inbound.

---

## 5. Pruebas replay (mock DB)

```bash
node tests/run-phase-eng-0b-idempotency.mjs
→ 4/4 PASS
```

| Caso | message_id | inbound Δ | outbound Δ | ghl_log Δ | Resultado |
|------|------------|-----------|------------|-----------|-----------|
| 1 — primer evento | `eng0b-msg-001` | +1 | +1 | +1 | `ok`, procesado |
| 2 — replay exacto | `eng0b-msg-001` | **0** | **0** | **0** | `idempotent=true` |
| 3 — mismo tel, nuevo id | `eng0b-msg-002` | +1 | +1 | +1 | procesado |
| 4 — sin message_id | null | +1 | +1 | — | procesado + warning |

Teléfono test: `+525559990200`

**Live InsForge:** pendiente deploy del handler (`PHASE_ENG0B_LIVE=1` tras aprobación).

---

## 6. Smoke 7C

```bash
node tests/run-phase7c-insforge-smoke.mjs
→ 10/10 PASS
```

Runtime remoto actual (pre-deploy ENG-0B) — smoke no regresó.

---

## 7. Flags seguros confirmados

| Flag | Valor |
|------|-------|
| `mode` | `mock` |
| `ghl_sync_mode` | `dry_run` |
| `outbound_real` | `false` |
| `ghl_live` | `false` |
| `custom_fields_written` | `false` |
| `academic_engine_enabled` | `true` |
| `eva_llm_enabled` | `false` |

---

## 8. `wa_errors` recientes (30 min post-smoke)

**0 filas** — sin errores nuevos en runtime remoto.

---

## 9. Riesgos pendientes

| Riesgo | Mitigación |
|--------|------------|
| Índice único no aplicado | Early-return en handler; aplicar SQL tras dedup |
| 7 duplicados históricos `msg-case-*` | No borrar auto; dedup manual antes de índice |
| Race sin índice | Dos requests simultáneos podrían duplicar hasta índice activo |
| Live replay no validado remoto | Deploy + `PHASE_ENG0B_LIVE=1` post-aprobación |
| `docs/phase-7c-insforge-controlled-deploy-report.md` | Regenerado por smoke — **revertir antes de commit** |

---

## 10. Archivos tocados

| Archivo | Tipo |
|---------|------|
| `insforge/functions/ycloud-wa-inbound.js` | Handler idempotencia |
| `insforge/functions/lib/test/mock-insforge-client.js` | Mock order + unique sim |
| `insforge/sql/wa_inbound_messages_idempotency.sql` | **Nuevo** — índice parcial |
| `tests/payloads/phase-eng-0b-idempotency.json` | **Nuevo** |
| `tests/run-phase-eng-0b-idempotency.mjs` | **Nuevo** |
| `docs/phase-eng-0b-webhook-idempotency-report.md` | **Nuevo** — este doc |

**Revertir antes de commit:** `docs/phase-7c-insforge-controlled-deploy-report.md`

---

## 11. Recomendación commit/push

**Commit sugerido (cuando apruebes):**

```
feat(eva): idempotent webhook handling by ycloud_message_id (ENG-0B)
```

**Incluir en commit:** archivos §10 excepto reporte 7C regenerado.

**Post-commit (fase ops separada, no ENG-0B):**

1. Deploy handler bundle Deno-safe
2. Validar replay live con `PHASE_ENG0B_LIVE=1`
3. Deduplicar `msg-case-*` históricos
4. Aplicar `wa_inbound_messages_idempotency.sql`

**No deploy / no push en ENG-0B** — cumplido.
