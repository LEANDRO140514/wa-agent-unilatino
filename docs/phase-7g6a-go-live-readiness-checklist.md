# Phase 7G.6A — Go-live readiness checklist y plan operativo Eva WA

**Estado:** ✅ **DOCUMENTACIÓN COMPLETA** — no activa producción  
**Fecha:** 2026-06-24  
**Checkpoint:** `0060b3a` (7G.5C piloto combinado PASS)

---

## 1. Resumen ejecutivo

| Punto | Detalle |
|-------|---------|
| Eva WA en piloto cerrado | **Validada** — 7G.5C (WA + GHL + CF + allowlist) |
| ¿Es go-live masivo? | **No** |
| Próxima fase recomendada | **7G.6B** — piloto interno ampliado (2–3 teléfonos) |
| Meta Ads | **Apagados** — no autorizados |
| Producción abierta | **NO autorizada** |

Este documento consolida checklist, monitoreo, rollback y criterios de decisión para pasos controlados posteriores. **No modifica secrets ni runtime.**

---

## 2. Estado técnico validado

| Capacidad | Fase | Resultado | Referencia |
|-----------|------|-----------|------------|
| YCloud inbound | 7G.4R / 7G.5C | ✅ Real | `phase-7g4r-real-inbound-wa-delivery-test.md` |
| YCloud outbound | 7G.4R / 7G.5C | ✅ `accepted` | `phase-7g5c-combined-wa-ghl-live-pilot-report.md` |
| Eva IA rewrite | 7G.3A / 7G.5C | ✅ Limitado (beca bloqueada) | `phase-7g3a-classifier-hotfix-report.md` |
| Academic engine | 7G.5C | ✅ career_list / scholarship | 7G.5C report |
| GHL live | 7G.5A / 7G.5B / 7G.5C | ✅ | `phase-7g5a-ghl-live-controlled-report.md` |
| Tags GHL | 7G.5A / 7G.5C | ✅ `eva-wa` + intent | 7G.5A report |
| Notes GHL | 7G.5A / 7G.5C | ✅ | 7G.5A report |
| Tasks GHL | 7G.5A / 7G.5C | ✅ humano + beca | 7G.5A report |
| Custom fields `wa_*` | 7G.5B / 7G.5C | ✅ 8 keys | `phase-7g5b-ghl-custom-fields-controlled-report.md` |
| Allowlist | 7G.4T / 7G.5A | ✅ | `phase-7g4t-ghl-live-allowlist-report.md` |
| Rollback | Todas | ✅ Protocolo probado | 7G.5A–7G.5C reports |
| Smoke 7G.3A | Post-cada fase | ✅ 14/14 | `run-phase7g3a-classifier-hotfix.mjs` |
| Preflight CF 7G.5B | Post-cada fase | ✅ 9/9 | `run-phase7g5b-custom-fields-preflight.mjs` |

---

## 3. Estado seguro actual (registro)

**Verificado 7G.6A preflight (runtime InsForge):**

| Secret / flag | Valor esperado | Confirmado |
|---------------|----------------|:----------:|
| `WA_AGENT_MODE` | `mock` | ✅ |
| `GHL_SYNC_MODE` | `dry_run` | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | ✅ |
| `GHL_LIVE_ALLOWED_PHONES` | `+529991525583` (count=1) | ✅ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | ✅ |
| `EVA_LLM_ENABLED` | `true` | ✅ |
| `LLM_MODE` | `rewrite` | ✅ |
| `LLM_PROVIDER` | `openai` | ✅ |
| `EVA_LLM_FAIL_OPEN` | `true` | ✅ |
| `wa_errors` críticos recientes | 0 | ✅ |

**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**WhatsApp business Eva:** `+529994538421`  
**Contacto GHL piloto Leandro:** `ZPqb7Jit2zn64uaME9Cp`

---

## 4. Configuración propuesta para 7G.6B (NO activar aún)

| Secret | Valor piloto interno |
|--------|---------------------|
| `WA_AGENT_MODE` | `live_outbound` |
| `GHL_SYNC_MODE` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `true` |
| `GHL_LIVE_ALLOWED_PHONES` | `+529991525583,+52XXXXXXXXXX,+52YYYYYYYYYY` |

**Condiciones:**

- Teléfonos internos **definidos y autorizados por Leandro** antes de activar.
- Máximo **2–3 teléfonos** además de Leandro (total 3–4 en allowlist).
- Duración sugerida: **30–60 minutos**.
- Supervisión manual obligatoria (técnico + GHL + YCloud).
- Activación en orden: `GHL_SYNC_MODE=live` → `GHL_WRITE_CUSTOM_FIELDS=true` → `WA_AGENT_MODE=live_outbound`.
- Redeploy de función si secrets no se reflejan en runtime (lección 7G.5A).

---

## 5. Teléfonos internos autorizados

| Nombre | Rol | Teléfono E.164 | Responsable | Autorizado | Observaciones |
|--------|-----|----------------|-------------|:----------:|---------------|
| Leandro | owner / tester | `+529991525583` | Leandro | **Sí** | Validado 7G.4R, 7G.5A, 7G.5B, 7G.5C |
| _(pendiente)_ | asesor / admisiones 1 | `+52___________` | — | No | Completar antes 7G.6B |
| _(pendiente)_ | asesor / admisiones 2 | `+52___________` | — | No | Completar antes 7G.6B |

**Regla:** ningún número entra en allowlist sin autorización explícita de Leandro.

---

## 6. Horario de monitoreo (plantilla)

| Campo | Valor (completar en 7G.6B) |
|-------|----------------------------|
| Fecha | __________ |
| Hora inicio | __________ |
| Hora fin máxima | __________ (+60 min) |
| Responsable técnico | __________ |
| Responsable GHL | __________ |
| Responsable WhatsApp / YCloud | __________ |
| Canal incidentes | WhatsApp grupo interno / Slack / __________ |

---

## 7. Checklist ANTES de activar 7G.6B

- [ ] Git working tree limpio
- [ ] HEAD incluye `0060b3a` o posterior
- [ ] Flags seguros confirmados (`mock`, `dry_run`, `CF=false`)
- [ ] Allowlist actualizada con teléfonos internos definidos
- [ ] Contactos GHL de prueba identificados (sin duplicados previos)
- [ ] Dashboard YCloud abierto (delivery logs)
- [ ] Dashboard GHL abierto (contacto + tasks)
- [ ] InsForge logs / SQL accesibles (`wa_errors`, `wa_ghl_sync_log`)
- [ ] Protocolo rollback impreso o a mano (§10)
- [ ] `node tests/run-phase7g3a-classifier-hotfix.mjs` → **14/14 PASS**
- [ ] `node tests/run-phase7g5b-custom-fields-preflight.mjs` → **9/9 PASS**
- [ ] Autorización escrita de Leandro para 7G.6B

---

## 8. Checklist DURANTE 7G.6B (por mensaje)

Por cada mensaje de cada tester:

- [ ] Inbound registrado (`processed_inbound_live`)
- [ ] Outbound `accepted` + `provider_response_id`
- [ ] Recepción visual WhatsApp confirmada
- [ ] `ghl_sync_mode=live`, `status=ok`
- [ ] `custom_fields_written=true`, count=8
- [ ] Keys CF solo whitelist `wa_*`
- [ ] Campos protegidos no modificados
- [ ] Task creada solo si intent lo requiere (humano, beca, etc.)
- [ ] `wa_errors` críticos = 0
- [ ] Tiempo de respuesta aceptable (< 30 s objetivo)

Usar plantilla: `docs/phase-7g6a-monitoring-template.md`

---

## 9. Checklist POST 7G.6B

- [ ] Rollback ejecutado (orden §10)
- [ ] `WA_AGENT_MODE=mock` confirmado
- [ ] `GHL_WRITE_CUSTOM_FIELDS=false` confirmado
- [ ] `GHL_SYNC_MODE=dry_run` confirmado
- [ ] Smoke 7G.3A → **14/14 PASS**
- [ ] Preflight 7G.5B → **9/9 PASS**
- [ ] `wa_errors` revisados (30 min)
- [ ] Reporte 7G.6B creado
- [ ] Decisión siguiente documentada (§15)

---

## 10. Protocolo de rollback en 1 minuto

**Orden en InsForge Dashboard:**

1. `WA_AGENT_MODE` → **`mock`**
2. `GHL_WRITE_CUSTOM_FIELDS` → **`false`**
3. `GHL_SYNC_MODE` → **`dry_run`**

**Mantener:** `GHL_LIVE_ALLOWED_PHONES` (no expandir en rollback).

**Verificación inmediata:**

```bash
node tests/run-phase7g3a-classifier-hotfix.mjs
node tests/run-phase7g5b-custom-fields-preflight.mjs
```

Esperado: `outbound_real=false`, `ghl_live=false`, `custom_fields_written=false`.

Si flags no cambian tras Dashboard → redeploy `ycloud-wa-inbound` (mismo bundle) sin cambiar código.

---

## 11. Criterios de interrupción inmediata

Ejecutar rollback §10 si ocurre **cualquiera**:

| # | Condición |
|---|-----------|
| 1 | Loop de mensajes WhatsApp |
| 2 | Respuestas duplicadas al mismo inbound |
| 3 | GHL escribe contacto incorrecto |
| 4 | Contacto duplicado creado |
| 5 | Custom field fuera de whitelist `wa_*` |
| 6 | Campo protegido modificado |
| 7 | Error YCloud 4xx/5xx en outbound |
| 8 | Error GHL 4xx/5xx |
| 9 | `wa_errors` crítico nuevo |
| 10 | LLM altera datos de beca (rewrite no bloqueado) |
| 11 | Beca con `eva_llm_rephrased=true` |
| 12 | Mensaje enviado a teléfono no en allowlist |
| 13 | Latencia > 60 s de forma repetida |
| 14 | Asesor reporta dato académico incorrecto |
| 15 | `WA_AGENT_MODE` queda `live_outbound` tras fin de prueba |

---

## 12. Matriz de riesgos

| Riesgo | Prob. | Impacto | Mitigación | Acción rollback |
|--------|:-----:|:-------:|------------|-----------------|
| WhatsApp no entrega | Media | Alto | Verificar YCloud logs; ventana 24h | Rollback WA → mock |
| GHL duplica contacto | Baja | Alto | Search-by-phone; allowlist | Rollback GHL dry_run |
| Custom field incorrecto | Baja | Alto | Whitelist 8 keys; preflight 7G.5B | CF=false + dry_run |
| Allowlist mal configurada | Baja | Crítico | Solo E.164 exacto; max 3–4 números | Revertir allowlist |
| Asesor no ve task | Media | Medio | Validar GHL UI en piloto | Documentar; no escalar live |
| Pregunta fuera de scope | Alta | Bajo | Clasificador + respuesta ambigua | Monitorear; no rollback |
| Ventana 24h WA cerrada | Media | Medio | Template re-engagement; asesor | Informar usuario |
| Error OpenAI | Baja | Medio | `EVA_LLM_FAIL_OPEN=true` | Revisar logs; rollback si falla abierto |
| Costo OpenAI inesperado | Baja | Medio | Piloto corto; allowlist | Limitar duración |
| Datos académicos incorrectos | Baja | Alto | Academic engine + beca blocked | Rollback inmediato |

---

## 13. Métricas de monitoreo

| Métrica | Fuente | Objetivo piloto |
|---------|--------|-----------------|
| Inbounds | `wa_inbound_messages` | Registrar todos |
| Outbounds accepted | `wa_outbound_messages.status` | 100% en allowlist |
| Errores críticos | `wa_errors` | **0** |
| Costo OpenAI estimado | shadow/usage logs | Documentar; no umbral fijo en 7G.6B |
| Contactos GHL actualizados | `wa_ghl_sync_log` | = testers autorizados |
| Notes creadas | sync log / GHL UI | 1+ por mensaje |
| Tasks creadas | sync log | Solo humano/beca/etc. |
| CF escritos | `custom_fields_written` | 8 por sync ok |
| Intents detectados | inbound + sync log | Distribución esperada |
| Escalaciones humano | intent=`humano` | Contar |
| Becas consultadas | intent=`beca` | Contar; verificar blocked |
| Tiempo respuesta | `received_at` → outbound | < 30 s |

**SQL útil:**

```sql
SELECT i.message_text, i.status, o.status, o.provider_response_id, i.received_at
FROM wa_inbound_messages i
LEFT JOIN wa_outbound_messages o ON o.inbound_message_id = i.id
WHERE i.received_at > NOW() - INTERVAL '1 hour'
ORDER BY i.received_at DESC;
```

---

## 14. Criterios de éxito 7G.6B

- [ ] 2–3 teléfonos internos (además de Leandro) **PASS**
- [ ] Mínimo **12 mensajes** totales (~4–5 por tester)
- [ ] **0** errores críticos
- [ ] **0** duplicados GHL
- [ ] **0** campos protegidos modificados
- [ ] **100%** rollback confirmado
- [ ] Recepción WhatsApp visual confirmada por cada tester
- [ ] GHL visible y útil para admisiones (tags/notes/tasks/CF)

---

## 15. Criterios para avanzar a go-live limitado (post-7G.6B)

- [ ] Piloto interno 7G.6B **PASS**
- [ ] Asesor valida utilidad operativa
- [ ] GHL UI revisado (contacto, tasks, CF)
- [ ] Monitoreo y horario de soporte definidos
- [ ] Meta Ads **siguen OFF**
- [ ] Tráfico orgánico / controlado únicamente
- [ ] Plan de expansión allowlist documentado (no masivo)
- [ ] Autorización explícita Leandro para fase siguiente

---

## 16. Lo que NO se autoriza todavía

- Meta Ads / campañas pagadas
- Campaña masiva / broadcast
- Quitar allowlist o abrir a cualquier número
- GHL live permanente sin supervisión
- WhatsApp live permanente sin monitor
- Agregar números externos no autorizados
- Beca con LLM rewrite
- `post_test` con rewrite
- Modificar campos Orchids / landings / MiBeca
- Deploy de código no probado en piloto
- Push a producción sin checklist completo

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g5c-combined-wa-ghl-live-pilot-report.md` | Evidencia E2E |
| `phase-7g5b-custom-fields-preflight-report.md` | CF whitelist |
| `phase-7g4u-ghl-fields-landings-vs-eva.md` | Campos protegidos |
| `phase-7g6a-monitoring-template.md` | Registro operativo |
| `phase-7g6b-internal-pilot-plan.md` | Plan fase siguiente |
| `phase-7f-go-live-checklist.md` | Checklist histórico 7F |

---

**Próximo paso:** 7G.6B — solo con autorización explícita de Leandro y teléfonos internos definidos.
