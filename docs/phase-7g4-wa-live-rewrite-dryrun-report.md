# Phase 7G.4 — WA Live Outbound + GHL Dry_run Report

**Date:** 2026-06-24  
**Status:** **RECLASIFICADO** — API accepted PASS; delivery WhatsApp **NOT VALIDATED**  
**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**Commit base:** `95d339767a8903a844272785c86979209a062702`  
**Número de prueba:** `+52555740001` (Leandro) → negocio `+529994538421`

---

## Resumen ejecutivo (post-validación Leandro)

| Capa | Resultado |
|------|-----------|
| InsForge procesamiento (intent, rewrite, GHL dry_run) | **PASS** |
| InsForge → YCloud API (`outbound_status=accepted`) | **PASS** (5/5) |
| YCloud → WhatsApp → teléfono Leandro | **NOT VALIDATED** |
| Confirmación humana recepción | **FAIL** — Leandro no recibió mensajes |

**Causa probable:** ventana de mensajería WhatsApp de **24 horas cerrada**. Los mensajes 7G.4 fueron **outbound iniciado por backend** (inbound simulado vía POST a InsForge), no respuesta a un mensaje previo del usuario en WhatsApp.

**Advertencia YCloud observada:**

> *"You can only reply to this conversation using a template message due to 24 hour message window restriction"*

**Conclusión:** `accepted` en nuestra DB **no equivale** a `delivered` al usuario. La fase 7G.4 **no** valida entrega end-to-end. Siguiente paso: **[7G.4R](phase-7g4r-real-inbound-wa-delivery-test.md)** (inbound real iniciado por Leandro).

---

## Rollback a mock — COMPLETADO

| Acción | Estado |
|--------|--------|
| `WA_AGENT_MODE=mock` | **Confirmado** (preflight non-inbound 2026-06-24) |
| Smoke `run-phase7g3a-classifier-hotfix.mjs` | **14/14 PASS** |
| `outbound_real=false` en mock | Confirmado |
| Más outbound backend-initiated | **Detenido** |

---

## 1. Flags durante prueba original 7G.4

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `LLM_MODE` | `rewrite` |
| `outbound_real` | `true` |
| `outbound_status` | `accepted` (API) |
| `ghl_live` | `false` |

## 2. Resultado técnico por caso (API layer)

| ID | Input | Intent | Rephrased | Outbound API | provider_response_id | API | Delivery |
|---:|---|---|:---:|:---:|---|:---:|:---:|
| 1 | `1` | carreras_disponibles | yes | accepted | `6a3b7d8f260ad5003755f09f` | PASS | NOT VALIDATED |
| 2 | `Derecho online` | carrera_interes | yes | accepted | `6a3b7d9a260ad5003755f0c5` | PASS | NOT VALIDATED |
| 3 | `No sé qué estudiar` | no_se_que_estudiar | yes | accepted | `6a3b7da66ffcaa19618dab3a` | PASS | NOT VALIDATED |
| 4 | `Quiero hablar con asesor` | humano | yes | accepted | `6a3b7db120bb2b792f8c8b26` | PASS | NOT VALIDATED |
| 5 | `Tengo promedio 9.8, qué beca me toca` | beca | no | accepted | `6a3b7dbe260ad5003755f140` | PASS | NOT VALIDATED |

## 3. Qué sí validó 7G.4

- Pipeline InsForge con `live_outbound` activo.
- YCloud acepta solicitudes de envío (`provider_response_id` generado).
- Rewrite allowlist + bloqueo beca en runtime.
- GHL permanece en `dry_run`.
- Sin GHL live, sin custom fields live, sin Meta Ads.

## 4. Qué NO validó 7G.4

- Entrega visual en WhatsApp del usuario.
- Estado `delivered` / `read` en YCloud.
- Ventana 24h abierta para session messages.
- Inbound real desde webhook YCloud (fue POST simulado al handler).

## 5. Diferencia accepted vs delivered

| Estado | Significado | 7G.4 |
|--------|-------------|------|
| `accepted` | YCloud recibió y aceptó la API request | Sí (5/5) |
| `sent` | YCloud envió a Meta/WA | No confirmado |
| `delivered` | Llegó al dispositivo | **No confirmado** |
| `read` | Usuario leyó | No aplica |

## 6. Logs DB (referencia)

- `wa_inbound_messages`: +5 con `processed_inbound_live` (inbound simulado).
- `wa_outbound_messages`: +5 con `status=accepted`.
- Confirmación humana: **ningún mensaje recibido por Leandro**.

## 7. wa_errors

Solo `phone_normalization_failed` en preflight; sin críticos LLM/outbound/GHL.

## 8. Coste OpenAI (7G.4 original)

~$0.0014 USD (5 llamadas).

## 9. Recomendación

1. **No** avanzar a 7G.5 ni GHL live hasta completar **7G.4R**.
2. Mantener `WA_AGENT_MODE=mock` hasta inicio de 7G.4R.
3. En 7G.4R: Leandro envía primero desde WhatsApp real → abre ventana 24h → validar recepción.
4. **No** re-ejecutar `run-phase7g4-wa-live-rewrite-dryrun.mjs` (inbound simulado).

## Reproducir validación mock post-rollback

```bash
node tests/run-phase7g3a-classifier-hotfix.mjs
```

## Próxima fase

Ver procedimiento: [`docs/phase-7g4r-real-inbound-wa-delivery-test.md`](phase-7g4r-real-inbound-wa-delivery-test.md)
