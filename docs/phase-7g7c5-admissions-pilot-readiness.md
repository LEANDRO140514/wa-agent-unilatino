# 7G.7C.5 — Cierre operativo pre-piloto admisiones

**Estado:** 📋 **READINESS EMITIDO** — sin cambios productivos en esta fase  
**Fecha:** 2026-06-26  
**Base:** `c8c164e` — 7G.7C.4-UI-CHECK aprobado  
**Tipo:** documentación operativa · GO / NO-GO · protocolo piloto orgánico admisiones

---

## 1. Resumen del estado actual

Eva WA Universidad Latino queda validada como **Reference Implementation** en las capas ya cerradas:

| Capa | Estado validado | Evidencia |
|------|-----------------|-----------|
| WhatsApp real (YCloud) | ✅ Validado en fases previas (7G.4R, 7G.5C, 7G.6C) | Reportes 7G.4R / 7G.5C |
| GHL live (tags, notes, tasks) | ✅ Validado | 7G.7C.3, 7G.7C.4, 7G.7C.4-UI-CHECK |
| Custom fields `wa_*` (8 keys) | ✅ Validados | 7G.5B, 7G.7C.4, UI-CHECK |
| `qualified_only` + allowlist | ✅ Validado | 7G.7C.1–7G.7C.4 |
| Rollback seguro | ✅ Verificado | 7G.7C.4 post-rollback + probe |
| Contactos únicos / sin duplicados | ✅ Confirmado | 7G.7C.4-UI-CHECK |
| Opportunities | ✅ No usadas (count=0 en 3 contactos piloto) | UI-CHECK |
| Meta Ads | ✅ No activo / no publicado | Política 7G.8 pendiente |
| LLM real en producción | ⚠️ **Revisar** — ver §2 | Secret vs expectativa |
| Runtime productivo | ✅ Modo seguro activo | Probe 2026-06-26 |

### Resultados 7G.7C.4 (cerrados)

- Contactos únicos por teléfono (`+529991525583`, `+529993314831`, `+529996428094`).
- Sin duplicados GHL.
- Tags piloto: `eva-wa`, `wa_interes_carrera`, `wa_requiere_asesor`.
- Notes en casos calificados (M2–M4); blocked en M1/M5.
- Tasks costo (`Validar costo/colegiatura — lead WhatsApp`) y asesor correctas.
- Custom fields `wa_*` completos (8/8).
- Runtime sin cambios al cierre del piloto.

**Última fase cerrada:** 7G.7C.4-UI-CHECK (`c8c164e`).

---

## 2. Runtime seguro confirmado (lectura 2026-06-26)

**Endpoint:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**WhatsApp business Eva:** `+529994538421`

### Secrets InsForge (solo lectura)

| Secret | Valor observado | Esperado seguro | OK |
|--------|-----------------|-----------------|-----|
| `WA_AGENT_MODE` | `mock` | `mock` | ✅ |
| `GHL_SYNC_MODE` | `dry_run` | `dry_run` | ✅ |
| `GHL_SYNC_POLICY` | `qualified_only` | `qualified_only` | ✅ |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | `false` | ✅ |
| `GHL_LIVE_ALLOWED_PHONES` | `+529991525583` | single phone | ✅ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | `true` | ✅ |
| `EVA_LLM_ENABLED` | **`true`** | **`false`** | ⚠️ |
| `LLM_MODE` | `rewrite` | `off` o `shadow` pre-piloto | ⚠️ |

### Probe seguro (`Hola`, allowlist)

```json
{
  "mode": "mock",
  "ghl_sync_mode": "dry_run",
  "outbound_real": false,
  "ghl_live": false,
  "ghl_dry_run": true,
  "cf": false,
  "policy": "qualified_only",
  "ghl_policy_blocked": true,
  "academic": true,
  "eva_llm_enabled": true
}
```

**GHL location ID:** `uPgYlVj3v4nLWNRc5SQq` (sin cambios).

### Nota LLM (bloqueo pre-piloto admisiones)

El contexto operativo exige **LLM apagado** (`EVA_LLM_ENABLED=false`). En runtime actual el secret está en `true` con `LLM_MODE=rewrite`. Mientras `WA_AGENT_MODE=mock` no hay outbound real, pero **antes de activar piloto admisiones con WA live** debe alinearse LLM a política acordada (típicamente `EVA_LLM_ENABLED=false` o, como mínimo, `LLM_MODE=shadow` sin rewrite en producción). **Esta fase no modifica secrets.**

---

## 3. Matriz GO / NO-GO

Leyenda: ✅ aprobado · ⚠️ pendiente confirmación humana · ❌ no cumple

| # | Check mínimo | Estado | Evidencia / nota |
|---|--------------|--------|------------------|
| 1 | Runtime seguro confirmado | ✅ | Probe §2 |
| 2 | Smoke seguro disponible | ✅ | Suites 7G.3A (14), 7G.5B (9), 7G.7C.1 (15), 7G.7C.3.1 (8) |
| 3 | GHL location correcta | ✅ | `GHL_LOCATION_ID` configurado; contactos piloto en location |
| 4 | Contactos sin duplicados | ✅ | UI-CHECK 7G.7C.4 |
| 5 | Tags piloto correctos | ✅ | `eva-wa`, `wa_interes_carrera`, `wa_requiere_asesor` |
| 6 | Tasks legibles para asesor | ✅ | Títulos costo/asesor en español claro |
| 7 | Notes legibles | ✅ | Formato `[Eva WA — qualified_only]` + routing |
| 8 | Custom fields WA completos | ✅ | 8 keys `wa_*` en UI-CHECK |
| 9 | Equipo admisiones informado | ⚠️ | Requiere briefing sesión (guion 7G.6C disponible) |
| 10 | Número oficial confirmado | ✅ | Eva `+529994538421` documentado |
| 11 | Rollback definido | ✅ | §8 |
| 12 | LLM apagado | ❌ | Secret `EVA_LLM_ENABLED=true`; alinear antes de live |
| 13 | Meta Ads apagado / no publicado | ✅ | 7G.8 no autorizado |
| 14 | Asesor humano disponible para piloto | ⚠️ | Confirmar en calendario sesión |
| 15 | Criterios de stop definidos | ✅ | §9 |

### Conteo

| Categoría | Resultado |
|-----------|-----------|
| Checks técnicos (1–8, 11, 13, 15) | **12/12 ✅** |
| Checks operativos (9, 14) | **0/2 confirmados** (pendiente sesión) |
| Check LLM (12) | **❌ desalineado** con política esperada |

---

## 4. Decisión recomendada

### GO técnico (piloto orgánico controlado admisiones)

**Sí** — el stack Eva WA + GHL + CF + `qualified_only` + rollback está listo para un piloto **controlado** con ventana acotada, allowlist explícita y monitoreo.

### GO operativo admisiones (sesión con leads reales)

**NO-GO operativo** hasta resolver:

1. **Alinear LLM** — `EVA_LLM_ENABLED=false` (o política explícita documentada y aprobada por Leandro).
2. **Confirmar asesor humano** en ventana 30–60 min.
3. **Briefing admisiones** — guion, qué mirar en GHL, canal de stop.

> Regla: si falta asesor, acceso GHL, rollback o webhook → **NO-GO operativo**, aunque el sistema técnico esté listo.

### Veredicto 7G.7C.5

| Dimensión | Decisión |
|-----------|----------|
| **Técnica** | **GO** condicionado a alinear LLM pre-activación |
| **Operativa admisiones** | **NO-GO** hasta checklist §6 completo |
| **Producción / go-live masivo** | **NO** — fuera de alcance |

---

## 5. Protocolo piloto orgánico admisiones (recomendado)

### Alcance

| Parámetro | Valor recomendado |
|-----------|-------------------|
| Leads | **3 a 5** controlados (E.164 conocidos) |
| Campaña Meta | **Sin** campaña masiva |
| Ventana | **30–60 minutos** |
| Asesor humano | **Presente** y con acceso GHL |
| Opportunities | **No usar** todavía |
| Pipeline GHL | **No modificar** |
| LLM | **Apagado** (`EVA_LLM_ENABLED=false`) |
| Source-of-truth académico | **Sin cambios** |
| EVA Test / calculadora | **No tocar** |

### Participantes sugeridos (ya validados 7G.7C.4)

```txt
+529991525583 — Leandro / coordinación
+529993314831 — Admisiones 1
+529996428094 — Admisiones 2
```

Ampliar a 3–5 leads solo con teléfonos **explícitamente autorizados** y preexistentes en GHL o allowlist acordada.

### Configuración temporal piloto (solo con autorización explícita — no aplicar en 7G.7C.5)

Orden sugerido (referencia `phase-7g6c-prep-admissions-pilot.md`):

```txt
1. GHL_LIVE_ALLOWED_PHONES=<E.164 autorizados>
2. GHL_SYNC_MODE=live
3. GHL_WRITE_CUSTOM_FIELDS=true
4. GHL_SYNC_POLICY=qualified_only
5. WA_AGENT_MODE=live_outbound   ← solo si se autoriza WA real
```

Alternativa conservadora (como 7G.7C.4): **GHL live + WA mock** si aún no se autoriza outbound real.

### Monitoreo durante ventana

Cada **15 minutos** revisar:

| Fuente | Qué mirar |
|--------|-----------|
| `wa_errors` | `function_error`, `ghl_live_failed`, `outbound_live_failed`, `ghl_sync_failed` = 0 |
| `wa_inbound_messages` | volumen, teléfonos allowlist, intents |
| `wa_outbound_messages` | `outbound_real`, status provider |
| `wa_ghl_sync_log` | `policy_blocked` vs `ok`, tasks, duplicados |
| GHL UI | contactos, tags, notes, tasks, `wa_*` |
| Respuestas Eva | calidad factual, sin carreras fantasma, becas bloqueadas correctamente |

### Guion mínimo por lead (5 mensajes)

```txt
1. Hola
2. Me interesa Derecho en línea
3. Cuánto cuesta Derecho en línea?
4. Quiero hablar con asesor
5. Gracias
```

---

## 6. Checklist de activación manual

### Antes del piloto

- [ ] Ejecutar smoke seguro (`run-phase7g3a-classifier-hotfix.mjs`, `run-phase7g5b-custom-fields-preflight.mjs`)
- [ ] Confirmar flags en InsForge (mock/dry_run/CF=false pre-activación)
- [ ] Confirmar **`EVA_LLM_ENABLED=false`** (o excepción documentada y aprobada)
- [ ] Confirmar asesor humano asignado y en sesión
- [ ] Confirmar acceso GHL (location `uPgYlVj3v4nLWNRc5SQq`)
- [ ] Confirmar rollback escrito y responsable asignado
- [ ] Confirmar Eva responde desde academic source-of-truth (`ACADEMIC_ENGINE_ENABLED=true`)
- [ ] Confirmar sin carreras fantasma (probe carrera conocida vs catálogo oficial)
- [ ] Confirmar webhook YCloud activo hacia `ycloud-wa-inbound`
- [ ] Confirmar allowlist E.164 copiada y revisada
- [ ] Briefing admisiones (`phase-7g6c-admissions-test-script.md`)

### Durante piloto

- [ ] Monitoreo cada 15 min (§5)
- [ ] Revisar contactos nuevos/actualizados en GHL
- [ ] Revisar tags (`eva-wa`, intents)
- [ ] Revisar tasks (costo / asesor; sin duplicados post-`Gracias`)
- [ ] Revisar notes
- [ ] Revisar `wa_errors` críticos
- [ ] Revisar calidad de respuestas (tono, datos, escalación)

### Después del piloto

- [ ] Aplicar rollback inmediato (§8)
- [ ] Probe post-rollback: `outbound_real=false`, `ghl_live=false`
- [ ] Ejecutar suites post-rollback (7G.3A, 7G.5B, 7G.7C.1 mínimo)
- [ ] Decidir: mantener seguro / repetir piloto / preparar go-live / backlog
- [ ] Documentar resultado (reporte fase siguiente)

---

## 7. Rollback definido

### Rollback estándar (post-piloto o stop)

```txt
1. WA_AGENT_MODE=mock
2. GHL_WRITE_CUSTOM_FIELDS=false
3. GHL_SYNC_MODE=dry_run
4. GHL_SYNC_POLICY=qualified_only
5. GHL_LIVE_ALLOWED_PHONES=+529991525583
6. Redeploy ycloud-wa-inbound si InsForge no recarga secrets
```

### Rollback legacy (incidente grave)

```txt
1. WA_AGENT_MODE=mock
2. GHL_WRITE_CUSTOM_FIELDS=false
3. GHL_SYNC_MODE=dry_run
4. GHL_SYNC_POLICY=none
5. GHL_LIVE_ALLOWED_PHONES=+529991525583
```

Runtime final esperado:

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
```

---

## 8. Criterios de stop (inmediato)

Detener piloto y ejecutar rollback si ocurre cualquiera:

1. WhatsApp real fuera de allowlist o sin autorización.
2. GHL live escribe fuera de allowlist.
3. Contacto duplicado en GHL.
4. Task duplicada no esperada (especialmente post-escalación).
5. Custom field fuera de `GHL_WA_FIELD_MAP` / keys no permitidas.
6. `qualified_only` no bloquea saludo/off-topic/gracias post-escalación.
7. `wa_errors` crítico > 0 en ventana activa.
8. Carrera fantasma o dato académico incorrecto en respuesta.
9. LLM altera respuestas sin política aprobada.
10. Meta Ads o tráfico público no autorizado.

**Canal stop:** Leandro `+529991525583` + responsable técnico en sesión.

---

## 9. Bloqueos

| Bloqueo | Severidad | Acción requerida |
|---------|-----------|------------------|
| `EVA_LLM_ENABLED=true` vs política `false` | **Alta** | Alinear secret antes de WA live admisiones |
| `LLM_MODE=rewrite` con LLM enabled | **Media** | Confirmar si rewrite está permitido en piloto; si no, `off`/`shadow` |
| Briefing admisiones no confirmado | **Media** | Sesión prep 15 min con guion 7G.6C |
| Asesor no agendado | **Alta** | NO-GO operativo hasta confirmar |
| Tasks históricas acumuladas (Leandro tester) | **Baja** | Limpiar/archivar en GHL UI opcional; no bloquea piloto |

---

## 10. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Outbound real sin supervisión | Ventana 30–60 min + asesor presente + allowlist |
| LLM rewrite inesperado | Apagar `EVA_LLM_ENABLED` pre-activación |
| Duplicados GHL | Allowlist + contactos conocidos + `qualified_only` |
| Task spam en contacto tester | Usar leads admisiones 2–3; archivar tasks previas |
| Secrets no recargan sin redeploy | Redeploy documentado post-cambio flags |
| Tráfico Meta no controlado | Meta OFF hasta 7G.8 |
| Confusión operativa GHL | Briefing + tags/notes estándar Eva |

---

## 11. Próxima acción recomendada

**Fase sugerida: 7G.7C.6 — Piloto admisiones sesión comercial** (o reutilizar guion 7G.6C con runtime actualizado):

1. **Pre-sesión (15 min):** alinear `EVA_LLM_ENABLED=false`; briefing admisiones; confirmar asesor.
2. **Smoke pre-vuelo:** 7G.3A + 7G.5B en runtime seguro.
3. **Activación temporal:** allowlist 3 E.164 + GHL live + CF true + `WA_AGENT_MODE=live_outbound` **solo con autorización explícita de Leandro**.
4. **Ejecutar** guion 3–5 leads, monitoreo 15 min.
5. **Rollback + reporte** al cerrar ventana.

**No ejecutar en 7G.7C.5:** cambios de secrets, deploy, flags, Meta, opportunities, pipeline, LLM, POSTs productivos.

---

## 12. Reporte final 7G.7C.5

| Entregable | Estado |
|------------|--------|
| Archivo `phase-7g7c5-admissions-pilot-readiness.md` | ✅ Creado |
| GO técnico piloto controlado | ✅ **GO** (condicionado LLM) |
| GO operativo admisiones | ❌ **NO-GO** hasta §6 + LLM |
| Checks aprobados | 12/15 (2 pendientes ops, 1 LLM) |
| Bloqueos | LLM secret, asesor, briefing |
| Riesgos | Documentados §10 |
| Cambios productivos | **Ninguno** |
