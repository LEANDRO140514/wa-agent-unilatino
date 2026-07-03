# 7G.6D — Plan de activación live controlada

**Fase:** 7G.6D — Preparación piloto live con allowlist  
**Estado:** Preparación — **NO activar live en esta fase**  
**Fecha:** 2026-07-03  
**Base commit:** `071d970` (post 7G.6C push)  
**Endpoint Eva:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**WhatsApp Eva:** `+52 999 453 8421`

---

## 1. Objetivo

Dejar documentado el plan operativo exacto para pasar de **mock/dry_run** a una **prueba live limitada con allowlist**, supervisada por Leandro y admisiones, sin go-live masivo ni Meta Ads.

7G.6D **no ejecuta** la activación — solo prepara checklists, runner readiness y criterios GO/NO-GO para la fase **7G.6E** (activación autorizada).

---

## 2. Alcance

| Incluido | Excluido |
|----------|----------|
| Piloto humano 3–6 teléfonos allowlist | Tráfico orgánico abierto |
| GHL live + custom fields `wa_*` | Meta Ads |
| WA `live_outbound` a allowlist | EVA Test / calculadora |
| Sesión 45–60 min supervisada | Cambios YCloud webhook |
| Rollback ≤1 min documentado | SQL remoto / borrado datos |

---

## 3. Responsables

| Rol | Persona | Responsabilidad |
|-----|---------|-----------------|
| Owner / GO-NO-GO | Leandro | Autorizar activación 7G.6E, rollback, cierre |
| Admisiones 1 | _(placeholder)_ | Mensajes WA + revisión GHL |
| Admisiones 2 | _(placeholder)_ | Mensajes WA + revisión GHL |
| Técnico | Cursor / Leandro | Flags InsForge, monitoreo, `wa_errors`, rollback |

**Guiones:** `phase-7g6c-admissions-operator-script.md` · **Checklists:** `phase-7g6d-pre-live-checklist.md` · `phase-7g6d-rollback-checklist.md`

---

## 4. Prerrequisitos (antes de 7G.6E)

- [ ] 7G.6C runner **7/7 PASS** en mock/dry_run
- [ ] VAL-0 **7/7 PASS**
- [ ] ENG-0C **17/17 PASS** · ENG-0B **4/4 PASS** · Smoke 7C **10/10 PASS**
- [ ] `run-phase-7g6d-live-readiness.mjs` **PASS** con `PHASE_7G6D_STRICT_GIT=1`
- [ ] Deploy ENG-0D confirmado en InsForge
- [ ] Rollback checklist impreso / accesible
- [ ] Asesores capacitados (guion operativo)
- [ ] Autorización **escrita** de Leandro para 7G.6E

---

## 5. Allowlist requerida

Secret InsForge: `GHL_LIVE_ALLOWED_PHONES` — lista CSV de E.164 **sin espacios**.

### Template (placeholders — reemplazar en 7G.6E con valores reales en InsForge)

| Nombre | Placeholder E.164 | Rol |
|--------|-------------------|-----|
| Owner / decisión | `+52XXXXXXXXXX_TEST_1` | Leandro — autoriza y supervisa |
| Admisiones 1 | `+52XXXXXXXXXX_ADMISIONS_1` | Asesor piloto |
| Admisiones 2 | `+52XXXXXXXXXX_ADMISIONS_2` | Asesor piloto |

**Regla:** ningún número real en documentación pública del repo. Valores E.164 reales solo en InsForge secrets / env local de Leandro.

**Valor default seguro (hoy):** allowlist mínima owner-only (count=1).

---

## 6. Números permitidos (operación live)

Solo teléfonos en `GHL_LIVE_ALLOWED_PHONES` reciben:

- `ghl_sync_mode=live`
- Escritura tags / notes / tasks / `wa_*`
- `outbound_real=true` (respuesta WA real)

Cualquier otro número: debe permanecer en dry_run o rechazado por guard allowlist.

---

## 7. Horario de prueba

| Item | Valor |
|------|-------|
| Ventana recomendada | L–V, 10:00–18:00 (CDMX) |
| Duración sesión live | 45–60 min máximo |
| Supervisión técnica | Obligatoria toda la sesión |
| Primera hora post-activación | Monitoreo continuo (ver §12) |

---

## 8. Casos permitidos

| # | Caso | Mensaje ejemplo |
|---|------|-----------------|
| 1 | Menú / carreras | `1` · `Derecho online` |
| 2 | Test vocacional | `No sé qué estudiar` |
| 3 | Beca | `Tengo promedio 9.2, qué beca me toca` |
| 4 | Humano / asesor | `Quiero hablar con asesor` |
| 5 | Costo + duración | Multi-turn tras carrera |
| 6 | Documentos | `Qué documentos necesito para inscribirme?` |

Mínimo por asesor si hay poco tiempo: `1`, `Derecho online`, `Quiero hablar con asesor`.

---

## 9. Casos prohibidos

- Teléfonos fuera de allowlist en sesión live
- Editar campos protegidos GHL (`promedio`, `beca_elegible`, UTM, vocacional, MiBeca)
- Meta Ads ON
- `EVA_LLM_ENABLED=true` / OpenAI en piloto
- Compartir número Eva fuera del equipo
- Repetir mismo mensaje sin esperar respuesta
- Activar sin rollback checklist a mano

---

## 10. Criterios GO / NO-GO

### GO (autorizar 7G.6E)

- Leandro autoriza explícitamente por escrito
- Readiness runner PASS (strict git + suites + flags seguros pre-activación)
- Asesores presentes + GHL abierto
- Allowlist E.164 cargada en InsForge (valores reales, no en repo)
- Rollback checklist listo
- `wa_errors` críticos = 0 (30 min)

### NO-GO (postponer 7G.6E)

- Cualquier suite de regresión falla
- Flag live detectado sin autorización
- Asesor no disponible
- Incidente abierto en 7G.6C histórico sin cerrar
- `wa_errors` crítico nuevo
- Deploy pendiente no verificado

---

## 11. Pasos de activación (7G.6E — NO ejecutar en 7G.6D)

**Orden estricto** — solo con Leandro presente:

| Paso | Secret / acción | Valor |
|:----:|-----------------|-------|
| 1 | Confirmar readiness | `node tests/run-phase-7g6d-live-readiness.mjs` con `PHASE_7G6D_STRICT_GIT=1` |
| 2 | `GHL_LIVE_ALLOWED_PHONES` | CSV E.164 reales (3 placeholders §5) |
| 3 | `GHL_SYNC_MODE` | `live` |
| 4 | Redeploy function | Si secrets no hot-reload |
| 5 | `GHL_WRITE_CUSTOM_FIELDS` | `true` |
| 6 | `WA_AGENT_MODE` | `live_outbound` |
| 7 | Probe allowlist | POST test desde `+52XXXXXXXXXX_TEST_1` → `allowlist_matched=true`, `outbound_real=true` |
| 8 | Iniciar guion admisiones | Ver operator script |

**NO cambiar:** `EVA_LLM_ENABLED` (permanece `false`).

---

## 12. Monitoreo (primera hora + during-live)

| Intervalo | Qué revisar |
|-----------|-------------|
| T+0–15 min | Probe flags · primera respuesta WA · GHL contacto único |
| T+15–30 min | Tags `eva-wa` · tasks humano/beca · duplicados |
| T+30–60 min | `wa_errors` SQL · reportes asesores · allowlist_matched |
| Continuo | Stop criteria §13 |

**Plantilla:** `docs/phase-7g6a-monitoring-template.md`

### During-live checklist (resumen)

- [ ] Cada mensaje asesor → respuesta WA visible ≤30 s
- [ ] GHL: un contacto por teléfono
- [ ] Task creada en humano/beca
- [ ] Campos protegidos intactos
- [ ] Sin respuestas duplicadas
- [ ] `allowlist_matched=true` en logs para números autorizados

---

## 13. Pasos de rollback

Ver detalle: `docs/phase-7g6d-rollback-checklist.md`

| Paso | Secret | Valor rollback |
|:----:|--------|----------------|
| 1 | `WA_AGENT_MODE` | `mock` |
| 2 | `GHL_WRITE_CUSTOM_FIELDS` | `false` |
| 3 | `GHL_SYNC_MODE` | `dry_run` |
| 4 | `GHL_LIVE_ALLOWED_PHONES` | owner-only mínimo |
| 5 | Verificar | `outbound_real=false`, `ghl_live=false` |
| 6 | Ejecutar | `run-phase-7g6d-live-readiness.mjs` |

**Stop inmediato + rollback** si: WA duplicado · sin respuesta 2× · contacto duplicado GHL · task incorrecta · beca incorrecta · campo protegido tocado · error 4xx/5xx · `wa_errors` crítico.

---

## 14. Criterios de cierre (fin sesión 7G.6E)

- [ ] Rollback ejecutado (§13)
- [ ] Readiness PASS post-rollback
- [ ] Monitoreo template completado
- [ ] Decisión documentada: repetir / avanzar orgánico / detener
- [ ] Reporte sesión live (fase posterior)

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6c-controlled-admissions-pilot-checklist.md` | Piloto seguro completado |
| `phase-7g6d-pre-live-checklist.md` | Gate pre-activación |
| `phase-7g6d-rollback-checklist.md` | Rollback operativo |
| `phase-7g6d-organic-limited-prep.md` | Siguiente fase orgánico (post-live) |
| `phase-7g6a-go-live-readiness-checklist.md` | Checklist general |
