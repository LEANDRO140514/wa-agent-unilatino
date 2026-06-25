# Phase 7G.6C-PREP — Piloto con admisiones (pendiente)

**Estado:** 📋 **PENDIENTE** — sesión programada para mañana con personal de admisiones  
**Fecha prep:** 2026-06-24  
**Checkpoint:** `7bbef4d` (7G.6B cerrada + rollback confirmado)

---

## 1. Estado

**7G.6C no se ejecuta hoy.** Queda agendada para **mañana** con admisiones presentes.

Objetivo de 7G.6C: validar operación real desde el punto de vista de admisiones — WhatsApp, GHL (tags, notes, tasks, campos `wa_*`), seguimiento de leads y utilidad operativa.

**No es go-live masivo.** Meta Ads siguen apagados.

---

## 2. Razón del aplazamiento

Leandro decidió posponer 7G.6C para realizarla **con personal de admisiones presente**, de modo que puedan:

- Ver respuestas de Eva en WhatsApp en tiempo real.
- Revisar contactos, tags, notes y tasks en GHL.
- Validar que la información es útil para seguimiento comercial.
- Reportar incidencias en el momento.
- Decidir juntos si el flujo está listo para tráfico orgánico limitado.

---

## 3. Configuración actual segura (hoy — no tocar)

| Flag / control | Valor |
|----------------|-------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_SYNC_MODE` | **`dry_run`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `GHL_LIVE_ALLOWED_PHONES` | **`+529991525583`** (count=1) |
| Meta Ads | **OFF** |
| Go-live masivo | **NO autorizado** |

**Verificado 7G.6C-PREP:** runtime InsForge confirma `mock`, `dry_run`, `CF=false`, `outbound_real=false`, `allowed_phones_count=1`.

**Endpoint Eva:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**WhatsApp business Eva:** `+529994538421`

---

## 4. Configuración temporal mañana (solo durante sesión)

Activar **únicamente** con Leandro presente y lista final de teléfonos:

| Secret | Valor temporal |
|--------|----------------|
| `GHL_LIVE_ALLOWED_PHONES` | Lista E.164 autorizados (ver §6) |
| `GHL_SYNC_MODE` | **`live`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`true`** |
| `WA_AGENT_MODE` | **`live_outbound`** |

**Orden activación:** allowlist → `GHL_SYNC_MODE=live` → `GHL_WRITE_CUSTOM_FIELDS=true` → `WA_AGENT_MODE=live_outbound`.

**Duración máxima sugerida:** 45–60 minutos. Supervisión técnica obligatoria.

---

## 5. Participantes

| Rol | Persona | Responsabilidad |
|-----|---------|-----------------|
| Owner / decisión | Leandro | Autorizar activación, rollback, go/no-go |
| Admisiones 1 | _(nombre mañana)_ | Enviar mensajes WA, revisar GHL |
| Admisiones 2 | _(nombre mañana)_ | Enviar mensajes WA, revisar GHL |
| Responsable técnico | _(asignar)_ | Monitoreo InsForge, logs, rollback |

**Guion entregable:** `docs/phase-7g6c-admissions-test-script.md`

---

## 6. Teléfonos (completar mañana antes de activar)

| Nombre | Rol | Teléfono E.164 | Autorizado | Observaciones |
|--------|-----|----------------|:----------:|---------------|
| Leandro | owner / tester | `+529991525583` | ✅ | Validado 7G.5C / 7G.6B — GHL `ZPqb7Jit2zn64uaME9Cp` |
| Admisiones 1 | asesor | `+52___________` | ☐ | Completar mañana |
| Admisiones 2 | asesor | `+52___________` | ☐ | Completar mañana |

**Referencia 7G.6B (internos previos):** `+529993314831`, `+529996428094` — reutilizar solo si mismas personas confirman.

**Regla:** ningún número entra en allowlist sin autorización explícita de Leandro.

---

## 7. Guion para admisiones (resumen)

1. **Eva responde automáticamente** por WhatsApp al número oficial `+529994538421`.
2. Cada conversación **se refleja en GHL**: contacto, tags, note y campos `wa_*`.
3. Si el lead pide **asesor** → debe aparecer **task** en GHL + tag `wa_requiere_asesor`.
4. Si pregunta **beca** → respuesta factual (sin inventar %); note/task según diseño; **no** modificar campo `promedio` ni `beca_elegible`.
5. **No editar campos** en GHL durante la prueba salvo autorización de Leandro.
6. Enviar mensajes **uno por uno**, esperar respuesta visible antes del siguiente.
7. Reportar de inmediato: duplicados, datos incorrectos, sin respuesta WA, task faltante.

---

## 8. Mensajes sugeridos para prueba

Cada participante autorizado envía desde su WhatsApp personal **a Eva** (`+529994538421`):

| Orden | Mensaje | Intent esperado |
|:-----:|---------|-----------------|
| 1 | `1` | carreras_disponibles |
| 2 | `Derecho online` | carrera_interes |
| 3 | `No sé qué estudiar` | no_se_que_estudiar |
| 4 | `Tengo promedio 9.2, qué beca me toca` | beca (Muy alto / 40% / 50% inscripción) |
| 5 | `Quiero hablar con asesor` | humano (+ task) |

**Mínimo por persona si hay poco tiempo:** `1`, `Derecho online`, `Quiero hablar con asesor`.

---

## 9. Qué observar en GHL (admisiones)

| Check | Esperado |
|-------|----------|
| Contacto | Creado o actualizado (sin duplicado) |
| Tags | `eva-wa` + tag de intent (`wa_interes_carreras`, etc.) |
| Notes | Nota con resumen de conversación |
| Tasks | Solo humano / beca (según diseño) |
| Campos `wa_*` | 8 campos actualizados (`wa_last_intent`, `wa_stage`, …) |
| Duplicados | **No** — un contacto por teléfono |
| Campos protegidos | **Intactos** — ver § protegidos abajo |

**Campos protegidos (no deben cambiar):** `carrera_recomendada`, `match_percent`, `promedio`, `beca_elegible`, `email`, `firstName`, `lastName`, UTM, `fbclid`, `gclid`, campos test vocacional y MiBeca.

---

## 10. Rollback en 1 minuto

Al terminar la sesión (o ante incidente):

1. `WA_AGENT_MODE` → **`mock`**
2. `GHL_WRITE_CUSTOM_FIELDS` → **`false`**
3. `GHL_SYNC_MODE` → **`dry_run`**

Mantener o reducir allowlist a solo Leandro: `+529991525583`.

**Verificación:**

```bash
node tests/run-phase7g3a-classifier-hotfix.mjs
node tests/run-phase7g5b-custom-fields-preflight.mjs
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
- Cualquier tester reporta comportamiento extraño

---

## 12. Decisión al final de mañana

| Opción | Descripción |
|--------|-------------|
| **A** | Repetir piloto 7G.6C |
| **B** | Ampliar orgánico limitado (más números / horario acotado) |
| **C** | Preparar go-live orgánico real (checklist 7G.6A §15) |
| **D** | Detener y corregir antes de continuar |

Documentar decisión en: `docs/phase-7g6c-admissions-pilot-report.md` (crear post-sesión).

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6a-go-live-readiness-checklist.md` | Checklist general |
| `phase-7g6a-monitoring-template.md` | Registro sesión |
| `phase-7g6c-admissions-test-script.md` | Guion admisiones |
| `phase-7g6b-internal-pilot-report.md` | Evidencia piloto técnico previo |

---

**Próximo paso:** mañana — completar teléfonos §6, activar flags §4, ejecutar guion, rollback §10, reporte post-sesión.
