# 7G.6C — Checklist piloto admisiones controlado

**Fase:** 7G.6C — Piloto humano admisiones controlado  
**Estado:** Preparación (modo seguro mock/dry_run)  
**Fecha:** 2026-07-03  
**Base commit:** `906c5bb` (post VAL-0)  
**Endpoint Eva:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**WhatsApp Eva (oficial):** `+52 999 453 8421`

---

## 1. Objetivo del piloto

Validar el flujo **humano-operativo** con personal de admisiones antes de cualquier go-live masivo:

- Eva responde por WhatsApp con información académica verificada
- GHL refleja tags, notes, tasks y campos `wa_*` (dry_run hasta autorización)
- Asesores identifican leads Eva WA y saben cuándo escalar
- Allowlist estricta, rollback en ≤1 minuto
- Sin Meta Ads, sin orgánico masivo, sin EVA Test

**No es go-live.** Es sesión guiada con supervisión técnica.

---

## 2. Responsables

| Rol | Persona | Responsabilidad |
|-----|---------|-----------------|
| Owner / decisión | Leandro | Autorizar activación live, rollback, go/no-go |
| Admisiones 1 | _(nombre en sesión)_ | Enviar mensajes WA, revisar GHL |
| Admisiones 2 | _(nombre en sesión)_ | Enviar mensajes WA, revisar GHL |
| Responsable técnico | Cursor / Leandro | Monitoreo InsForge, logs, `wa_errors`, rollback |

**Guion asesores:** `docs/phase-7g6c-admissions-operator-script.md`

---

## 3. Teléfonos allowlist (E.164 redactados)

Solo estos números pueden recibir GHL live **cuando Leandro autorice explícitamente**:

| Nombre | Rol | Teléfono E.164 | Autorizado | Observaciones |
|--------|-----|----------------|:----------:|---------------|
| Leandro | owner / tester | `+52******5583` | ✅ | Validado 7G.5C / 7G.6B |
| Admisiones 1 | asesor | `+52******4831` | ✅ | Tester 1 — 7G.6B PASS |
| Admisiones 2 | asesor | `+52******8094` | ✅ | Tester 2 — 7G.6B PASS |

**Regla:** ningún número entra en allowlist sin autorización explícita de Leandro.

**Valor InsForge (default seguro):** `GHL_LIVE_ALLOWED_PHONES` = solo owner (count=1).

---

## 4. Horario de prueba

| Item | Valor |
|------|-------|
| Ventana sugerida | L–V, 10:00–18:00 (hora CDMX) |
| Duración máxima sesión live | 45–60 minutos |
| Supervisión técnica | Obligatoria durante toda la sesión |
| Pre-sesión | Ejecutar runner seguro 7G.6C + VAL-0 + regresiones |

---

## 5. Casos permitidos

Durante la sesión (automático o humano), se permiten:

| # | Caso | Mensaje ejemplo | Intent esperado |
|---|------|-----------------|-----------------|
| 1 | Lead frío / menú | `Hola` → `Quiero ver carreras` | ambiguo → carreras_disponibles |
| 2 | Carrera específica | `Me interesa Derecho online` | carrera_interes |
| 3 | Costo + duración | `Cuanto cuesta?` → `Y cuanto dura?` | academic_state multi-turn |
| 4 | Beca | `Tengo promedio 9.2, qué beca me toca` | beca |
| 5 | Humano / asesor | `Quiero hablar con un asesor` | humano + task |
| 6 | Documentos | `Qué documentos necesito para inscribirme?` | documents |
| 7 | Test vocacional | `No sé qué estudiar` | no_se_que_estudiar |

Mensajes del guion corto (admisiones): `1`, `Derecho online`, `Quiero hablar con asesor`.

---

## 6. Casos prohibidos

| Prohibido | Motivo |
|-----------|--------|
| Teléfonos fuera de allowlist en sesión live | Riesgo GHL/WA no controlado |
| Editar campos protegidos en GHL | `promedio`, `beca_elegible`, UTM, vocacional, etc. |
| Activar Meta Ads | Fuera de scope hasta 7G.8 |
| Enviar desde EVA Test o calculadora | Aislamiento de entornos |
| Repetir mismo mensaje sin esperar respuesta | Riesgo duplicados / confusión operativa |
| Compartir número Eva fuera del equipo piloto | Control de tráfico |
| Activar `EVA_LLM_ENABLED=true` | No autorizado |
| Usar `OPENAI_API_KEY` en piloto | No autorizado |

---

## 7. Criterios PASS / FAIL

### PASS (sesión lista para continuar)

- [ ] Preflight remoto: `mode=mock`, `ghl_sync_mode=dry_run` (o live autorizado con allowlist)
- [ ] Runner 7G.6C seguro: **7/7 PASS**
- [ ] VAL-0: **7/7 PASS**
- [ ] ENG-0C: **17/17 PASS**
- [ ] ENG-0B: **4/4 PASS**
- [ ] Smoke 7C: **10/10 PASS**
- [ ] `wa_errors` críticos recientes: **0**
- [ ] Respuestas WA coherentes y sin carreras fantasma
- [ ] GHL: contacto único, tags `eva-wa`, task en humano/beca
- [ ] Campos protegidos intactos

### FAIL (detener y corregir)

- Cualquier suite de regresión falla
- Flag live sin autorización de Leandro
- Respuesta duplicada en WhatsApp
- WA no responde 2 veces seguidas al mismo tester
- Contacto duplicado en GHL
- Task incorrecta, faltante o excesiva
- Beca con datos incorrectos
- Campo protegido modificado
- Custom field fuera de whitelist `wa_*`
- Error YCloud o GHL 4xx/5xx
- `wa_errors` crítico nuevo
- `allowlist_matched=false` en número autorizado

---

## 8. Criterios de rollback

Al terminar sesión live **o ante incidente**, en ≤1 minuto:

| Secret | Valor rollback |
|--------|----------------|
| `WA_AGENT_MODE` | **`mock`** |
| `GHL_SYNC_MODE` | **`dry_run`** |
| `GHL_WRITE_CUSTOM_FIELDS` | **`false`** |
| `GHL_LIVE_ALLOWED_PHONES` | **solo owner (count=1)** |

**Verificación post-rollback:**

```powershell
node tests/run-phase-7g6c-controlled-admissions-pilot.mjs
node tests/run-phase-val-0-admissions-pilot-safe.mjs
node tests/run-phase7g3a-classifier-hotfix.mjs
node tests/run-phase7g5b-custom-fields-preflight.mjs
```

Plantilla monitoreo: `docs/phase-7g6a-monitoring-template.md`

---

## 9. Monitoreo

| Qué | Cómo | Frecuencia |
|-----|------|------------|
| Flags runtime | Preflight runner / probe endpoint | Pre-sesión + cada 15 min en live |
| `wa_errors` | SQL últimos 30 min | Pre-sesión + post-sesión |
| Respuestas WA | Revisión asesores + logs InsForge | Continuo en sesión |
| GHL contacto/tags/tasks | Asesores en GHL | Por mensaje o al cierre |
| Duplicados inbound | `ycloud_message_id` idempotencia | Automático (ENG-0B) |

**Stop inmediato:** ver §6 casos prohibidos + cualquier FAIL de §7.

---

## 10. Activación controlada (solo con autorización Leandro)

**Default actual (NO cambiar sin autorización):**

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

**Orden si se autoriza sesión live:**

1. Actualizar `GHL_LIVE_ALLOWED_PHONES` (3 E.164 §3)
2. `GHL_SYNC_MODE=live`
3. Redeploy si aplica
4. `GHL_WRITE_CUSTOM_FIELDS=true`
5. `WA_AGENT_MODE=live_outbound`
6. Confirmar probe: `allowlist_matched=true`, `outbound_real=true`

Referencia detallada: `docs/phase-7g6c-prep-admissions-pilot.md` §3.

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6c-admissions-operator-script.md` | Guion asesores |
| `phase-7g6c-prep-admissions-pilot.md` | Prep histórico + rollback |
| `phase-val-0-admissions-pilot-safe-report.md` | Evidencia VAL-0 |
| `phase-7g6a-go-live-readiness-checklist.md` | Checklist general go-live |
