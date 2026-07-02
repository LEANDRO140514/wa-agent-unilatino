# Phase 7G.6C — Piloto con admisiones (sesión comercial)

**Estado:** ✅ **COMPLETADO** — 2026-06-25 · 15/15 PASS · rollback pendiente  
**Fecha prep:** 2026-06-24 · **Ejecutado:** 2026-06-25  
**Checkpoint:** `7bb05b3`

---

## 1. Estado

Objetivo: validar operación real con **admisiones presentes** — WhatsApp, GHL (tags, notes, tasks, campos `wa_*`), utilidad operativa para inscripciones.

**No es go-live masivo.** Meta Ads siguen apagados hasta 7G.8 aprobado.

**Preflight 2026-06-25:** runtime InsForge confirma `mock`, `dry_run`, `CF=false`, `outbound_real=false`, `allowed_phones_count=1`. Smokes 7G.3A **14/14** · 7G.5B **9/9**.

---

## 2. Configuración actual segura (default — rollback siempre vuelve aquí)

| Flag / control | Valor |
|----------------|-------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_SYNC_MODE` | **`dry_run`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `GHL_LIVE_ALLOWED_PHONES` | **owner autorizado** (count=1) |
| Meta Ads | **OFF** |
| Go-live masivo | **NO autorizado** |

**Endpoint Eva:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**WhatsApp business Eva:** `+529994538421`

---

## 3. Configuración temporal sesión (solo con Leandro + admisiones presentes)

| Secret | Valor temporal |
|--------|----------------|
| `GHL_LIVE_ALLOWED_PHONES` | Ver §6 (3 E.164) |
| `GHL_SYNC_MODE` | **`live`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`true`** |
| `WA_AGENT_MODE` | **`live_outbound`** |

**Allowlist completa (copiar en InsForge):**

```
GHL_LIVE_ALLOWED_PHONES=<E.164_ALLOWLIST_7G6C>
```

**Orden activación:** allowlist → `GHL_SYNC_MODE=live` → redeploy si aplica → `GHL_WRITE_CUSTOM_FIELDS=true` → `WA_AGENT_MODE=live_outbound`.

**Duración máxima sugerida:** 45–60 minutos. Supervisión técnica obligatoria.

---

## 4. Participantes

| Rol | Persona | Responsabilidad |
|-----|---------|-----------------|
| Owner / decisión | Leandro | Autorizar activación, rollback, go/no-go |
| Admisiones 1 | _(nombre en sesión)_ | Enviar mensajes WA, revisar GHL |
| Admisiones 2 | _(nombre en sesión)_ | Enviar mensajes WA, revisar GHL |
| Responsable técnico | Cursor / Leandro | Monitoreo InsForge, logs, rollback |

**Guion entregable:** `docs/phase-7g6c-admissions-test-script.md`

---

## 5. Teléfonos autorizados (E.164 — confirmados piloto 7G.6B)

| Nombre | Rol | Teléfono E.164 | Autorizado | Contacto GHL | Observaciones |
|--------|-----|----------------|:----------:|--------------|---------------|
| Leandro | owner / tester | `+52******5583` | ✅ | contacto GHL redactado | Validado 7G.5C / 7G.6B |
| Admisiones 1 | asesor | `+52******4831` | ✅ | contacto GHL redactado | Tester 1 — 7G.6B PASS |
| Admisiones 2 | asesor | `+52******8094` | ✅ | contacto GHL redactado | Tester 2 — 7G.6B PASS |

**Regla:** ningún número entra en allowlist sin autorización explícita de Leandro. Si cambia personal, actualizar esta tabla antes de activar.

---

## 6. Guion para admisiones (resumen)

1. **Eva responde automáticamente** por WhatsApp al número oficial `+529994538421`.
2. Cada conversación **se refleja en GHL**: contacto, tags, note y campos `wa_*`.
3. Si el lead pide **asesor** → debe aparecer **task** en GHL + tag `wa_requiere_asesor`.
4. Si pregunta **beca** → respuesta factual (sin inventar %); note/task según diseño; **no** modificar `promedio` ni `beca_elegible`.
5. **No editar campos** en GHL durante la prueba salvo autorización de Leandro.
6. Enviar mensajes **uno por uno**, esperar respuesta visible antes del siguiente.
7. Reportar de inmediato: duplicados, datos incorrectos, sin respuesta WA, task faltante.

---

## 7. Mensajes sugeridos para prueba

Cada participante autorizado envía desde su WhatsApp personal **a Eva** (`+529994538421`):

| Orden | Mensaje | Intent esperado |
|:-----:|---------|-----------------|
| 1 | `1` | carreras_disponibles |
| 2 | `Derecho online` | carrera_interes |
| 3 | `No sé qué estudiar` | no_se_que_estudiar |
| 4 | `Tengo promedio 9.2, qué beca me toca` | beca (Muy alto / 40%) |
| 5 | `Quiero hablar con asesor` | humano (+ task) |

**Mínimo por persona si hay poco tiempo:** `1`, `Derecho online`, `Quiero hablar con asesor`.

---

## 8. Qué observar en GHL (admisiones)

| Check | Esperado |
|-------|----------|
| Contacto | Creado o actualizado (sin duplicado) |
| Tags | `eva-wa` + tag de intent (`wa_interes_carreras`, etc.) |
| Notes | Nota con resumen de conversación |
| Tasks | humano / beca (según diseño) |
| Campos `wa_*` | 8 campos actualizados |
| `allowlist_matched` | **`true`** en logs live |
| Duplicados | **No** — un contacto por teléfono |
| Campos protegidos | **Intactos** — ver §9 |

---

## 9. Campos protegidos (no deben cambiar)

`carrera_recomendada`, `match_percent`, `promedio`, `beca_elegible`, `email`, `firstName`, `lastName`, UTM, `fbclid`, `gclid`, campos test vocacional y MiBeca.

Referencia cruzada: `docs/phase-7g4u-ghl-fields-landings-vs-eva.md`

---

## 10. Rollback en 1 minuto

Al terminar la sesión (o ante incidente):

1. `WA_AGENT_MODE` → **`mock`**
2. `GHL_WRITE_CUSTOM_FIELDS` → **`false`**
3. `GHL_SYNC_MODE` → **`dry_run`**
4. `GHL_LIVE_ALLOWED_PHONES` → **`solo owner autorizado / allowlist mínima interna`**

**Verificación:**

```bash
node tests/run-phase7g3a-classifier-hotfix.mjs
node tests/run-phase7g5b-custom-fields-preflight.mjs
node tests/run-phase7g6c-admissions-pilot-validate.mjs
```

Plantilla monitoreo: `docs/phase-7g6a-monitoring-template.md`

---

## 11. Criterios para detener la sesión

Detener y hacer rollback **inmediato** si ocurre:

- Respuesta duplicada en WhatsApp
- WhatsApp no responde **2 veces seguidas** al mismo tester
- GHL crea contacto duplicado
- Task incorrecta, faltante o excesiva
- Beca con datos incorrectos o rewrite no bloqueado
- Campo protegido modificado
- Custom field fuera de whitelist `wa_*`
- Error YCloud o GHL 4xx/5xx
- `wa_errors` crítico
- `allowlist_matched=false` en número autorizado
- Cualquier tester reporta comportamiento extraño

---

## 12. Decisión al final de sesión

| Opción | Descripción |
|--------|-------------|
| **A** | Repetir piloto 7G.6C |
| **B** | Avanzar a **7G.6D** orgánico limitado (checklist §15 7G.6A) |
| **C** | Preparar **7G.8** Meta Ads mínimo controlado |
| **D** | Detener y corregir antes de continuar |

Documentar decisión en: `docs/phase-7g6c-organic-limited-go-live-report.md`

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6a-go-live-readiness-checklist.md` | Checklist general |
| `phase-7g6a-monitoring-template.md` | Registro sesión |
| `phase-7g6c-admissions-test-script.md` | Guion admisiones |
| `phase-7g6b-internal-pilot-report.md` | Evidencia piloto técnico previo |
| `phase-7g6d-organic-limited-prep.md` | Siguiente paso orgánico |
| `phase-7g8-meta-ads-controlled-plan.md` | Meta Ads mínimo (no activar aún) |

---

**Próximo paso:** ~~activar flags~~ ✅ ejecutado — **rollback §10** → reporte `phase-7g6c-organic-limited-go-live-report.md` → 7G.6D.
