# 7G.7C.6-B — Briefing admisiones + asesor confirmado

**Estado:** 📋 **BRIEFING DOCUMENTADO** — sin activación de piloto live  
**Fecha:** 2026-06-26  
**Base:** `e134f6a` — 7G.7C.6-A LLM alignment  
**Tipo:** documentación operativa para sesión admisiones · sin cambios productivos

---

## 1. Resumen de estado previo

| Fase | Estado | Commit / evidencia |
|------|--------|-------------------|
| 7G.7C.5 — Readiness pre-piloto | ✅ Cerrado | `712bb2e` |
| 7G.7C.6-A — LLM alignment | ✅ Cerrado | `e134f6a` |
| DB read-only validation pre-briefing | ✅ **GO** | Sin writes; críticos 30 min = 0 |
| Piloto live (WA + GHL) | ❌ **NO autorizado** en esta fase | Solo briefing |

### Runtime seguro confirmado (InsForge)

```txt
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
GHL_SYNC_POLICY=qualified_only
GHL_LIVE_ALLOWED_PHONES=+529991525583
ACADEMIC_ENGINE_ENABLED=true
EVA_LLM_ENABLED=false
LLM_MODE=off
```

**WhatsApp business Eva:** `+529994538421` (`+52 999 453 8421`)  
**Endpoint técnico:** `https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound`  
**GHL location:** `uPgYlVj3v4nLWNRc5SQq`

### DB (read-only, pre-briefing)

- Tablas `wa_inbound_messages`, `wa_outbound_messages`, `wa_contacts_state`, `wa_errors`, `wa_ghl_sync_log`: **existen**.
- Post-rollback: **0** outbound `accepted`, **0** `wa_ghl_sync_log` con `sync_mode=live`.
- `wa_contacts_state`: **sin duplicados** por `normalized_phone` (índice único).
- Críticos recientes (30 min): **0**.

---

## 2. Briefing para admisiones

### Qué es Eva WA

**Eva** es la asistente automatizada de **Universidad Latino** por WhatsApp. Responde desde el número oficial de la universidad usando información académica validada (carreras, modalidades, becas con reglas, orientación). Las conversaciones relevantes se registran en **GoHighLevel (GHL)** para que admisiones dé seguimiento comercial.

**Hoy es un piloto controlado**, no atención al público general ni campaña Meta.

---

### Qué sí hace Eva

| Capacidad | Descripción |
|-----------|-------------|
| Responder por WhatsApp | Automático al escribir a `+52 999 453 8421` |
| Informar carreras | Lista y detalle de programas oficiales (ej. Derecho en línea) |
| Orientación | Test vocacional, “no sé qué estudiar” |
| Becas | Tabla factual según promedio declarado (sin inventar porcentajes) |
| Escalar a humano | Cuando el lead pide asesor o hay señal de costo que requiere validación |
| Registrar en GHL | Tags, notes, tasks y campos `wa_*` en leads calificados |

---

### Qué no hace Eva

| Límite | Detalle |
|--------|---------|
| No sustituye al asesor en cierre | Eva orienta y canaliza; inscripción y casos complejos van a humano |
| No inventa precios finales | Costos sensibles generan task de validación, no cifra definitiva sin asesor |
| No modifica campos protegidos GHL | No toca `promedio`, `beca_elegible`, UTM, pipeline, opportunities |
| No atiende fuera de allowlist | En piloto solo teléfonos autorizados reciben sync GHL live |
| No usa LLM creativo en piloto | `EVA_LLM_ENABLED=false` — respuestas desde motor académico + reglas |
| No es campaña masiva | Sin Meta Ads ni difusión del número en esta fase |

---

### Cuándo escala a asesor

Eva crea señal en GHL (y responde canalizando) cuando:

1. El lead dice explícitamente que quiere **hablar con asesor** (`humano`).
2. Pregunta **costo/colegiatura** de una carrera → task **“Validar costo/colegiatura — lead WhatsApp”**.
3. Consulta **beca** con datos que requieren validación humana.
4. Casos de **inscripción** o seguimiento comercial explícito según reglas del sistema.

**Saludos simples** (`Hola`) y **agradecimientos post-escalación** (`Gracias`) **no** deben generar task nueva ni sync innecesario (`qualified_only`).

---

### Qué verá el asesor en GHL

Al abrir el contacto del lead (por teléfono E.164):

| Elemento | Qué esperar |
|----------|-------------|
| **Contacto** | Un registro por teléfono (sin duplicados) |
| **Tags** | `eva-wa` + tags de tema (`wa_interes_carrera`, `wa_requiere_asesor`, etc.) |
| **Notes** | Resumen con intent, routing, score — prefijo `[Eva WA — qualified_only]` en piloto reciente |
| **Tasks** | Solo cuando corresponde: costo o asesor (títulos en español claro) |
| **Campos wa_*** | Último intent, etapa, resumen, textos inbound/outbound |

**Opportunities / pipeline:** no se crean en este piloto.

---

### Tags y campos a revisar

**Tags frecuentes en piloto 7G.7C.4:**

```txt
eva-wa
wa_interes_carrera
wa_requiere_asesor
```

**Custom fields permitidos (8 keys):**

```txt
wa_last_intent
wa_last_message_at
wa_stage
wa_needs_human
wa_summary
wa_source
wa_last_inbound_text
wa_last_outbound_text
```

Si aparece un campo fuera de esta lista o se altera `promedio` / `beca_elegible` → **reportar de inmediato** y considerar stop.

---

### Cómo leer tasks y notes

| Tipo | Título / contenido típico | Acción asesor |
|------|---------------------------|---------------|
| **Task costo** | `Validar costo/colegiatura — lead WhatsApp` | Validar colegiatura oficial y contactar lead |
| **Task asesor** | `Atender lead WhatsApp — Solicita asesor` | Tomar conversación en WA o llamada según proceso interno |
| **Note** | `Eva WA — interacción WhatsApp` + routing | Contexto para priorizar; no es mensaje al lead |

Las tasks **no se duplican** por un `Gracias` después de escalar — si ven task extra tras cierre, reportar.

---

### Qué hacer si un lead pide humano

1. Confirmar que en GHL apareció tag `wa_requiere_asesor` y task de asesor.
2. Revisar `wa_summary` y última note.
3. **Tomar el lead** por el canal acordado (WhatsApp personal del asesor o proceso institucional).
4. No editar campos GHL salvo autorización de Leandro.
5. Si el lead escribe `Gracias` tras la canalización, Eva no debe reiniciar menú ni crear task duplicada.

---

### Qué hacer si Eva responde algo incompleto o incorrecto

1. **No reenviar** el mismo mensaje muchas veces — esperar 1–2 min.
2. Capturar: hora, mensaje enviado, respuesta recibida, captura WA.
3. Avisar **inmediatamente** a Leandro + responsable técnico.
4. Si es dato académico incorrecto (carrera inexistente, beca inventada) → **criterio de stop** (ver abajo).
5. El asesor puede responder manualmente al lead si la sesión lo autoriza, documentando el incidente.

---

### Criterios de pausa / stop (operativos)

Detener la sesión y avisar rollback si ocurre **cualquiera**:

- Eva no responde tras 2 minutos (en ventana live).
- WhatsApp real a número no autorizado.
- Contacto **duplicado** en GHL.
- Task **duplicada** no esperada (especialmente post-`Gracias`).
- Dato académico **incorrecto** o carrera fantasma.
- Campo GHL **fuera de whitelist** `wa_*`.
- Cualquier `wa_errors` crítico reportado por monitoreo técnico.
- Confusión operativa que impida seguir el guion con seguridad.

**Canal stop:** Leandro `+529991525583` + responsable técnico en sesión.

---

### Rollback operativo (al cerrar o ante stop)

Orden estándar (ejecuta responsable técnico, no admisiones):

```txt
1. WA_AGENT_MODE=mock
2. GHL_WRITE_CUSTOM_FIELDS=false
3. GHL_SYNC_MODE=dry_run
4. GHL_SYNC_POLICY=qualified_only
5. GHL_LIVE_ALLOWED_PHONES=+529991525583
6. Redeploy ycloud-wa-inbound si InsForge no recarga secrets
```

Verificar probe: `outbound_real=false`, `ghl_live=false`.

---

## 3. Pendientes humanos — confirmación sesión

Completar **antes de activar piloto live** (esta fase solo documenta; marcar en kickoff):

| Rol | Confirmado | Nombre / contacto | Notas |
|-----|:----------:|-------------------|-------|
| **Asesor responsable** | ✅ | Admisiones 1 / Admisiones 2 (rotación o ambos) | Tel. `+529993314831`, `+529996428094` |
| **Owner / decisión rollback** | ✅ | Leandro | `+529991525583` |
| **Horario ventana piloto** | ⬜ | _Completar: fecha + inicio/fin (30–60 min)_ | |
| **Canal comunicación interna** | ⬜ | _WhatsApp grupo / llamada / presencial_ | Sugerido: WA directo Leandro + técnico en sesión |
| **Monitoreo InsForge** | ⬜ | _Responsable técnico_ | `wa_errors`, logs función |
| **Monitoreo GHL** | ⬜ | _Asesor o Leandro_ | contactos, tags, tasks |
| **Rollback owner** | ✅ | Leandro (+ ejecución técnica) | Decisión final stop/rollback |

**Asesor confirmado** a nivel de rol y teléfonos piloto; **ventana horaria y canales** se cierran en kickoff de sesión.

---

## 4. Guion de sesión

### Referencia principal

Existe y está vigente:

**`docs/phase-7g6c-admissions-test-script.md`**

Guion comercial 7G.6C (5 pasos: carreras → Derecho → vocacional → beca → asesor). Duración estimada **45–60 min**.

### Guion alternativo validado (7G.7C.4)

Si se prefiere flujo más corto y ya probado en GHL live + WA mock:

| Paso | Mensaje | Expectativa GHL |
|:----:|---------|-----------------|
| 1 | `Hola` | Sin sync (blocked) |
| 2 | `Me interesa Derecho en línea` | Note + tags + CF |
| 3 | `Cuánto cuesta Derecho en línea?` | Task costo |
| 4 | `Quiero hablar con asesor` | Task asesor |
| 5 | `Gracias` | Sin task duplicada |

**Recomendación 7G.7C.6:** usar guion **7G.6C** para sesión admisiones (cobertura comercial más amplia); guion **7G.7C.4** como subconjunto mínimo si hay poco tiempo.

### Participantes autorizados (E.164)

| Rol | Teléfono | GHL contact ID |
|-----|----------|----------------|
| Leandro | `+529991525583` | `ZPqb7Jit2zn64uaME9Cp` |
| Admisiones 1 | `+529993314831` | `LxSpYSe41hBpnA6iiLSp` |
| Admisiones 2 | `+529996428094` | `W0n06gpVjIM4cRSthsHa` |

Máximo **3–5 leads** controlados en piloto; no ampliar allowlist sin autorización de Leandro.

---

## 5. Matriz GO / NO-GO — piloto live

### GO solo si (todas)

| # | Condición | Estado pre-7G.7C.6-C |
|---|-----------|----------------------|
| 1 | Asesor confirmado | ✅ rol + teléfonos |
| 2 | Briefing realizado | ⬜ pendiente sesión kickoff |
| 3 | Ventana de prueba definida | ⬜ pendiente fecha/hora |
| 4 | Rollback entendido | ✅ documentado |
| 5 | Flags re-verificados antes de activar | ⬜ en fase activación |
| 6 | **WA live autorizado explícitamente** (Leandro) | ❌ no aún |
| 7 | **GHL live autorizado explícitamente** (Leandro) | ❌ no aún |
| 8 | 3 a 5 leads máximo | ✅ definido |
| 9 | Monitoreo activo (InsForge + GHL) | ⬜ asignar en kickoff |

### NO-GO si (cualquiera)

| # | Condición |
|---|-----------|
| 1 | Asesor no confirmado o no presente |
| 2 | Briefing no realizado |
| 3 | `EVA_LLM_ENABLED=true` o `LLM_MODE≠off` al activar |
| 4 | `WA_AGENT_MODE` no está en `mock` **antes** del switch controlado |
| 5 | `GHL_SYNC_MODE` no está en `dry_run` **antes** del switch controlado |
| 6 | No hay rollback owner identificado |
| 7 | Meta Ads o tráfico público activo |
| 8 | Allowlist con números no autorizados |

### Veredicto piloto live (ahora)

| Dimensión | Decisión |
|-----------|----------|
| **Briefing documentado (7G.7C.6-B)** | ✅ **GO** — listo para kickoff con admisiones |
| **Activación piloto live (7G.7C.6-C)** | ❌ **NO-GO** — falta kickoff, ventana, autorización explícita WA+GHL live |

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Activación live sin briefing | No activar flags hasta kickoff completado |
| LLM reactivado accidentalmente | Re-verificar secrets pre-switch |
| Tasks históricas en contactos tester | Archivar en GHL UI; no confundir con piloto nuevo |
| Asesor no distingue task costo vs asesor | Briefing § tasks/notes |
| Secrets sin reload post-cambio | Redeploy + probe obligatorio |
| Difusión del número Eva | Solo allowlist; sin Meta |

---

## 7. Próxima acción recomendada

**7G.7C.6-C — Kickoff + activación piloto controlado** (fase separada, con autorización explícita):

1. Realizar **sesión briefing** 15–20 min con admisiones usando este doc + `phase-7g6c-admissions-test-script.md`.
2. Completar tabla §3 (horario, canales, monitores).
3. Re-verificar secrets (`mock`, `dry_run`, LLM off).
4. Con autorización de Leandro: activación temporal allowlist 3 E.164 + GHL live + CF + `live_outbound`.
5. Ejecutar guion; monitoreo cada 15 min; rollback al cerrar; reporte fase.

**7G.7C.6-B no activa producción.** Solo deja listo el material operativo.

---

## 8. Checklist kickoff (imprimible)

### Antes de activar (responsable técnico)

- [ ] Secrets: mock / dry_run / CF false / LLM off
- [ ] Probe: `outbound_real=false`, `ghl_live=false`
- [ ] Asesor(es) presentes
- [ ] GHL abierto en location correcta
- [ ] Guion repasado
- [ ] Rollback owner confirmado

### Durante

- [ ] Monitoreo 15 min: `wa_errors`, GHL contactos
- [ ] Un mensaje a la vez por participante
- [ ] Reporte inmediato de anomalías

### Después

- [ ] Rollback aplicado
- [ ] Probe post-rollback
- [ ] Debrief 5 min con admisiones (útil sí/no)

---

*Documento interno — Universidad Latino / Eva WA — Fase 7G.7C.6-B*
