# 7G.7C.7-B — Pilot conversation mock replay

**Estado:** ✅ **REPLAY COMPLETO PASS** (local mock, secuencial)  
**Fecha:** 2026-06-26  
**Base commit:** `ad70bcbc29b186d6d5e2ed0bc88ca059414473f0` — `fix: improve eva wa pilot conversation intents`

---

## 1. Resumen ejecutivo

| Métrica | Resultado |
|---------|-----------|
| Mensajes replay | **15/15** |
| PASS | **15** |
| WARN | **0** |
| FAIL | **0** |
| Regresión 7G.7C.7-A | **13/13 PASS** |
| Modo | **mock** local (handler + academic-engine) |
| GHL | **dry_run** simulado (tags/tasks preview) |
| LLM | **off** |

**Veredicto:** conversación piloto reproducida correctamente tras hotfix 7G.7C.7-A. Sin deploy, sin live, sin secrets.

---

## 2. Flags observados (runner local)

| Flag | Valor |
|------|-------|
| `WA_AGENT_MODE` / `mode` | `mock` |
| `GHL_SYNC_MODE` | `dry_run` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| `ACADEMIC_ENGINE_ENABLED` | `true` |
| `EVA_LLM_ENABLED` | `false` |
| `LLM_MODE` | `off` |
| `outbound_real` | `false` |
| `ghl_live` | `false` |

---

## 3. Metodología

- **Runner:** `tests/run-phase7g7c7b-pilot-conversation-replay.mjs`
- **Contexto secuencial:** cada mensaje hereda `wa_stage`, `wa_last_intent`, `wa_needs_human` del turno anterior (simula `wa_contacts_state`).
- **Pipeline:** `classifyIntent` → `applyAcademicAndLlmEnrichment` (cuando aplica).
- **GHL:** `getIntentTags()` + `shouldCreateTaskDryRun()` — preview dry_run, sin API GHL.
- **Evidencia JSON:** `tests/.phase7g7c7b-replay-results.json`

---

## 4. Tabla mensaje por mensaje

| # | Mensaje | Intent | Stage | Academic | Task | Tags GHL (dry_run) | Resultado |
|---|---------|--------|-------|----------|------|-------------------|-----------|
| 1 | Tienen revalidación de estudios? | `revalidacion_estudios` | `revalidacion_interes` | no | sí | `eva-wa`, `wa_revalidacion`, `wa_requiere_asesor` | **PASS** |
| 2 | tienen maestrias? | `niveles_no_principales` | `nivel_no_principal` | no | no* | `eva-wa`, `wa_nivel_no_principal`, `wa_posgrado` | **PASS** |
| 3 | veo que tienen preparatoria | `niveles_no_principales` | `nivel_no_principal` | no | no* | `eva-wa`, `wa_nivel_no_principal`, `wa_preparatoria` | **PASS** |
| 4 | me gusta negocios internacionales, pero tengo dudas | `fallback_inteligente` | `orientacion` | **sí** | no | `eva-wa`, `wa_interes_info` | **PASS** |
| 5 | esta cara no? | `objecion_precio` | `objecion_precio` | no | no | `eva-wa`, `wa_objecion_precio`, `wa_interes_beca` | **PASS** |
| 6 | tienen descuento? | `beca` | `beca_interes` | **sí** | sí | `eva-wa`, `wa_interes_beca` | **PASS** |
| 7 | en que unicacion estan? | `ubicacion_campus` | `ubicacion_consultada` | no | no | `eva-wa`, `wa_ubicacion` | **PASS** |
| 8 | Ubicacion? | `ubicacion_campus` | `ubicacion_consultada` | no | no | `eva-wa`, `wa_ubicacion` | **PASS** |
| 9 | la Universidad reconocida y acreditada en México? | `rvoe_reconocimiento` | `rvoe_consultado` | no | no | `eva-wa`, `wa_rvoe` | **PASS** |
| 10 | tienen reconocimiento oficial? | `rvoe_reconocimiento` | `rvoe_consultado` | no | no | `eva-wa`, `wa_rvoe` | **PASS** |
| 11 | hola | `ambiguo` | `inicio` | no | no | `eva-wa`, `wa_interes_info` | **PASS** |
| 12 | tienen reconocimiento oficial? | `rvoe_reconocimiento` | `rvoe_consultado` | no | no | `eva-wa`, `wa_rvoe` | **PASS** |
| 13 | que promociones tienen? | `promociones_descuentos` | `promocion_interes` | no | sí | `eva-wa`, `wa_interes_promocion`, `wa_interes_beca`, `wa_requiere_asesor` | **PASS** |
| 14 | carreras online? | `carreras_online` | `carreras_online` | **sí** | no | `eva-wa`, `wa_interes_carreras` | **PASS** |
| 15 | medicida tienen? | `carrera_no_ofertada` | `carrera_no_ofertada` | no | no | `eva-wa`, `wa_carrera_no_ofertada`, `wa_salud` | **PASS** |

\*Ver observación §6 sobre `ghl_would_create_task` vs `create_task` en `niveles_no_principales`.

---

## 5. Validaciones por caso (piloto)

| # | Criterio clave | Cumple |
|---|----------------|--------|
| 1 | Revalidación sin menú; proceso sí; asesor por revisión; sin prometer materias | ✅ |
| 2 | Maestrías → Preparatoria y Posgrados; sin costos/horarios inventados | ✅ |
| 3 | Preparatoria sin lista licenciaturas | ✅ |
| 4 | Negocios Internacionales con detalle oficial (mensualidad, modalidad, RVOE) | ✅ |
| 5 | Objeción precio/becas; sin menú | ✅ |
| 6 | Descuento → tabla becas oficial (academic enriched) | ✅ |
| 7 | `unicacion` → dirección + Maps; **sin** asesor ni visita | ✅ |
| 8 | Ubicación repetida; misma regla | ✅ |
| 9 | RVOE general; sin acreditaciones inventadas | ✅ |
| 10 | Reconocimiento oficial → RVOE | ✅ |
| 11 | `hola` → menú permitido (saludo vago) | ✅ |
| 12 | RVOE post-hola; sin menú | ✅ |
| 13 | Promociones → becas/descuentos oficiales + asesor solo para vigentes | ✅ |
| 14 | Solo carreras En línea oficiales | ✅ |
| 15 | Medicida → Medicina no ofertada + alternativas Salud | ✅ |

### Respuestas resumidas (muestra)

| # | Extracto respuesta |
|---|-------------------|
| 1 | Sí, contamos con proceso de revalidación de materias… ¿Te gustaría que te contacte un asesor? |
| 4 | Negocios Internacionales • Presencial • $4,650/mes • Inscripción $8,000 • RVOE 809… |
| 5 | Entiendo 😊… apoyos y becas de excelencia según promedio… |
| 6 | Becas de excelencia por promedio de bachillerato: • Sobresaliente (9.6–10): 50%… |
| 7–8 | Campus Central Santa Rita Cholul… Google Maps (sin asesor/visita) |
| 14 | Carreras en modalidad En línea: Derecho Online, Administración…, Ventas y Mercadotecnia… |
| 15 | Por ahora no tengo Medicina… Psicología, Enfermería y Nutrición |

---

## 6. Observaciones (no bloqueantes)

1. **Msg 4 — intent `fallback_inteligente` vs `carrera_interes`:** el clasificador WA no matchea `negocios internacionales` en `EVA_CAREER_NAMES`, pero **academic-engine** enriquece con `career_detail` correcto. Comportamiento útil; candidato a intent `carrera_interes` directo en fase futura.
2. **Msg 5 — contexto carrera:** `objecion_precio` dispara por frase corta (`cara`) aunque `wa_last_intent` sea `fallback_inteligente`; respuesta de becas es correcta. Persistencia `wa_last_career` seguiría mejorando continuidad fina.
3. **Msg 10/12 — RVOE general:** sin carrera en contexto activo post-`hola`, responde RVOE genérico (esperado). RVOE específico requeriría carrera en mensaje o `wa_last_career` persistido.
4. **GHL task preview `niveles_no_principales`:** `create_task=false` en decisión WA, pero `EVA_TASK_INTENTS` incluye el intent → `ghl_would_create_task=true` en dry_run preview (msgs 2–3). Alinear en fase posterior si se desea task solo al aceptar asesor.

---

## 7. Regresiones detectadas

**Ninguna FAIL** en replay ni en suite 7G.7C.7-A.

Comportamiento **mejorado vs piloto live 7G.7C.6-E:**

- Sin bucle de menú en preguntas concretas
- Revalidación, maestrías, preparatoria, ubicación, RVOE, promociones, medicina cubiertos
- Ubicación sin oferta asesor/visita (corrección post-7G.7C.7-A)

---

## 8. Tests ejecutados

| Suite | Resultado |
|-------|-----------|
| `tests/run-phase7g7c7b-pilot-conversation-replay.mjs` | **15/15 PASS** |
| `tests/run-phase7g7c7a-pilot-conversation-hotfix.mjs` | **13/13 PASS** |

---

## 9. Confirmaciones operativas

| Control | Estado |
|---------|--------|
| Secrets modificados | ❌ no |
| Flags InsForge | ❌ no |
| Deploy | ❌ no |
| WA live | ❌ no |
| GHL live | ❌ no |
| LLM | ❌ off |
| Meta Ads | ❌ no |
| Commit en esta fase | ❌ no (solo reporte + runner) |

---

## 10. Recomendación siguiente

1. **7G.7C.7-C** — bundle + deploy controlado a InsForge (mantener mock/dry_run).
2. Smoke remoto del mismo replay contra endpoint (opcional: adaptar runner a POST como `run-phase7g6d-replay-mock.mjs`).
3. Alinear `EVA_TASK_INTENTS` vs `createTask` en `niveles_no_principales`.
4. Opcional: matchear `negocios internacionales` como `carrera_interes` directo en clasificador WA.
5. Evaluar persistir `wa_last_career` para RVOE/objeción multi-turno.

---

## 11. Archivos de esta fase (sin commit)

| Archivo | Rol |
|---------|-----|
| `docs/phase-7g7c7b-pilot-conversation-replay.md` | Este reporte |
| `tests/run-phase7g7c7b-pilot-conversation-replay.mjs` | Runner replay |
| `tests/.phase7g7c7b-replay-results.json` | Evidencia JSON |

---

*Documento interno — Universidad Latino / Eva WA — Fase 7G.7C.7-B*
