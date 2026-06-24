# Fase 5A — Preparación piloto Meta Click to WhatsApp

> **Estado:** preparación documental + clasificación intents Meta prefill.  
> **Modo seguro:** `WA_AGENT_MODE=mock` | `GHL_SYNC_MODE=dry_run` | `GHL_WRITE_CUSTOM_FIELDS=false`

---

## Objetivo de campaña

Captar leads interesados en orientación vocacional desde Meta Ads con **Click to WhatsApp**, conectándolos con Eva WA para iniciar el test vocacional EVA y dejar trazabilidad en GHL (tags, notas, custom fields, tasks cuando aplique).

**Ángulo recomendado:** ¿No sabes qué carrera estudiar?

---

## Configuración piloto Meta

| Parámetro | Valor |
|---|---|
| Objetivo Meta | Mensajes / Click to WhatsApp |
| Tipo campaña | Click to WhatsApp |
| Destino WhatsApp | **+52 999 453 8421** |
| Mensaje prellenado | `Hola, quiero hacer el test vocacional` |
| Presupuesto recomendado | **$150 – $300 MXN diarios** |
| Duración inicial | **48 – 72 horas** |
| Ubicación | Mérida, Yucatán + zona metropolitana |
| Monitoreo | Mañana, mediodía y tarde |

---

## Copy principal sugerido

```
¿No sabes qué carrera estudiar? 🎓
Haz nuestro test vocacional y descubre opciones que pueden ir contigo.
Escríbenos por WhatsApp y Eva te ayuda a iniciar.
```

**Mensaje prellenado (WhatsApp):**

```
Hola, quiero hacer el test vocacional
```

---

## Comportamiento Eva WA esperado (mensaje prellenado)

| Campo | Valor esperado |
|---|---|
| intent | `no_se_que_estudiar` |
| tags GHL | `eva-wa`, `wa_interes_test` |
| wa_stage | `test_recomendado` |
| wa_needs_human | `false` |
| priority | `low` |
| escalation_required | `false` |
| task | **no** |
| Respuesta Eva | Link test vocacional `https://testunilatino.algorithmus.io` |

---

## Audiencia inicial sugerida

- Edad: 17–25 (ajustable en Meta)
- Intereses: educación superior, universidad, orientación vocacional, becas
- Ubicación: Mérida y zona metropolitana de Yucatán
- Exclusiones: audiencias ya convertidas en GHL (cuando esté disponible)

---

## Checklist antes de activar live

### Secrets InsForge (`ycloud-wa-inbound`)

- [ ] `WA_AGENT_MODE=live_outbound` (solo cuando autorizado)
- [ ] `GHL_SYNC_MODE=live` (solo cuando autorizado)
- [ ] `GHL_WRITE_CUSTOM_FIELDS=true` (solo cuando autorizado)
- [ ] `YCLOUD_WEBHOOK_SECRET` configurado y validado
- [ ] `YCLOUD_BUSINESS_NUMBER` = +529994538421
- [ ] `GHL_WA_FIELD_MAP` válido (8 campos WA)
- [ ] `GHL_API_KEY` y `GHL_LOCATION_ID` correctos

### YCloud / WhatsApp

- [ ] Webhook apunta a `POST .../functions/ycloud-wa-inbound`
- [ ] Número +52 999 453 8421 verificado en YCloud
- [ ] Plantilla / ventana 24h validada para respuestas Eva

### GHL

- [ ] 8 custom fields WA creados y mapeados
- [ ] Contacto de prueba sin duplicados por teléfono
- [ ] Equipo admisiones informado del protocolo 4B

### Eva WA (código)

- [ ] Fase 4A matriz intents desplegada
- [ ] Fase 4B protocolo operativo desplegado
- [ ] Fase 5A prefill Meta clasifica `no_se_que_estudiar`
- [ ] `duda_test` separado (problemas con el test)

### Meta Ads

- [ ] Campaña Click to WhatsApp creada en borrador
- [ ] Mensaje prellenado configurado
- [ ] Presupuesto y duración definidos
- [ ] Pixel / eventos (si aplica) revisados

---

## Checklist de monitoreo (piloto activo)

Revisar **mañana, mediodía y tarde**:

| Métrica | Fuente | Acción si anómalo |
|---|---|---|
| Inbound recibidos | `wa_inbound_messages` | Verificar webhook YCloud |
| Outbound status | `wa_outbound_messages` | Revisar `wa_errors` outbound |
| Intent `no_se_que_estudiar` | response `intent` | Ajustar copy/pre-fill si baja match |
| GHL sync status | `wa_ghl_sync_log` | Revertir a dry_run si fallas |
| Tasks alta prioridad | GHL + `wa_ghl_sync_log` | Asignar asesor según protocolo 4B |
| `wa_errors` | tabla `wa_errors` | Triaging inmediato |
| Duplicados contacto | GHL search por teléfono | No crear; usar update |

### KPIs piloto (48–72 h)

- Mensajes inbound desde Meta
- % clasificados `no_se_que_estudiar`
- % outbound `accepted`
- % GHL sync `ok`
- Tasks creadas (solo beca/post_test/humano/duda_test)
- Tiempo respuesta Eva (mock → live)

---

## Clasificación intents — Meta prefill (Fase 5A)

### → `no_se_que_estudiar` (tag `wa_interes_test`)

- Hola, quiero hacer el test vocacional
- Quiero hacer el test vocacional
- Quiero iniciar el test vocacional
- Quiero hacer el test / Quiero el test
- Me interesa el test vocacional
- Ayúdame con el test vocacional
- Quiero descubrir / saber qué carrera estudiar
- No sé qué carrera estudiar / No sé qué estudiar

### → `duda_test` (tag `wa_duda_test`) — problemas con el test

- No abre el test
- Se trabó el test
- Tengo problema con el test
- No me llegó el resultado
- Error en el test

> **Orden de clasificación:** `duda_test` se evalúa **antes** que `no_se_que_estudiar`.

---

## Referencias

- Fixture: `tests/payloads/ycloud-phase5a-meta-prefill.json`
- Matriz intents: Fase 4A
- Protocolo operativo: Fase 4B
- E2E validado: Fase 4C

---

## Siguiente fase (5B — cuando autorice Leandro)

1. Activar flags live de forma controlada
2. Publicar campaña Meta 48–72 h
3. Monitoreo según checklist
4. Revertir a modo seguro al cerrar ventana piloto
