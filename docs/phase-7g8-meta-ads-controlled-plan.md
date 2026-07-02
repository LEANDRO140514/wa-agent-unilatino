# Phase 7G.8 — Meta Ads mínimo controlado + GHL consola primaria

**Estado:** 📋 **PLAN TÉCNICO** — **NO activar Meta Ads ni cambiar código/runtime**  
**Fecha:** 2026-06-25  
**Prerequisitos:** 7G.6C PASS · 7G.6D orgánico limitado PASS (recomendado) · autorización operativa Leandro

---

## 1. Objetivo comercial

Salir con **Meta Click to WhatsApp** en presupuesto bajo, usando **GHL como consola primaria** de admisiones, sin romper seguridad ni colisionar con landings Orchids.

| Principio | Detalle |
|-----------|---------|
| GHL | CRM operativo — tags, notes, tasks, `wa_*` |
| WhatsApp | Solo vía YCloud / Eva WA |
| Landings | Sin modificar campos protegidos (`phase-7g4u`) |
| Volumen | Piloto mínimo — no campaña masiva |

---

## 2. Estado actual del código (auditoría flags)

| Flag / feature | ¿Existe? | Ubicación | Notas |
|----------------|:--------:|-----------|-------|
| `GHL_LIVE_ALLOWED_PHONES` | ✅ | `ycloud-wa-inbound.js` | Bloquea GHL live si teléfono ∉ lista |
| `GHL_LIVE_REQUIRE_ALLOWLIST` | ❌ | — | **No implementado** — propuesta §3 |
| Rate limit leads públicos | ❌ | — | Propuesta §3 |
| Horario activación GHL live | ❌ | — | `after_hours_logic_enabled=false` hoy (4B) |
| Meta prefill classifier | ✅ | Fase 5A | `no_se_que_estudiar` para prefill test |
| Meta Ads en código | ❌ | — | Correcto — activación solo en Meta Business Manager |

**Conclusión:** para tráfico **público** (Meta u orgánico abierto) hace falta implementar modo acotado **antes** de `GHL_LIVE_REQUIRE_ALLOWLIST=false`.

---

## 3. Propuesta técnica — modo público acotado

### 3.1 Nuevo flag principal

```
GHL_LIVE_REQUIRE_ALLOWLIST=false   # default: true (comportamiento actual)
```

| Valor | Comportamiento |
|-------|----------------|
| `true` (default) | **Actual** — solo teléfonos en `GHL_LIVE_ALLOWED_PHONES` escriben GHL live |
| `false` | Permite GHL live para **cualquier** inbound procesado, sujeto a límites §3.2 |

**Importante:** `false` **no** desactiva otros guardrails (`GHL_PROTECTED_FIELDS`, whitelist `wa_*`).

### 3.2 Límites obligatorios cuando `REQUIRE_ALLOWLIST=false`

| Variable propuesta | Default piloto | Descripción |
|--------------------|----------------|-------------|
| `GHL_PUBLIC_LIVE_MAX_LEADS` | `15` | Máx. contactos **nuevos** GHL por ventana |
| `GHL_PUBLIC_LIVE_WINDOW_MINUTES` | `60` | Ventana deslizante para cupo |
| `GHL_PUBLIC_LIVE_SCHEDULE` | `America/Merida;Mon-Fri 09:00-18:00,Sat 09:00-13:00` | Fuera de horario → skip GHL live o solo log |
| `GHL_PUBLIC_LIVE_ALERT_THRESHOLD` | `10` | Alerta manual al alcanzar N leads/hora |

### 3.3 Pseudológica (implementación futura — **no deployar sin aprobación**)

```
if ghlSyncMode !== 'live' → dry_run (actual)

if ghlLiveRequireAllowlist !== 'false':
  → resolveGhlLiveAllowlist() (actual 7G.4T)

else:
  if !withinSchedule() → log skipped_schedule; return
  if newLeadsInWindow() >= maxLeads → log skipped_rate_limit; return
  → syncGHLContactLive() normal
  → log allowlist_matched: null, public_live: true
```

### 3.4 Monitoreo activo (operativo, no código)

- Dashboard OpenAI / InsForge logs cada 15 min durante campaña
- SQL volumen + `wa_errors` (ver `phase-7g6d-organic-limited-prep.md` §8)
- Responsable admisiones revisa GHL tasks cada hora
- Canal incidentes: Leandro directo

### 3.5 Rollback inmediato

**Nivel 1 (30 s):** Meta Ads pause en Business Manager  
**Nivel 2 (1 min):** InsForge secrets → modo seguro:

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
GHL_LIVE_ALLOWED_PHONES=<OWNER_E.164_ALLOWLIST>
GHL_LIVE_REQUIRE_ALLOWLIST=true
```

---

## 4. Configuración Meta Ads mínima (documental — NO activar)

Basado en `meta-pilot-phase5a.md`:

| Parámetro | Valor piloto |
|-----------|--------------|
| Objetivo | Mensajes / Click to WhatsApp |
| Destino | `+52 999 453 8421` |
| Mensaje prefill | `Hola, quiero hacer el test vocacional` |
| Presupuesto | **$150–300 MXN/día** (mínimo controlado) |
| Duración inicial | **48–72 h** |
| Ubicación | Mérida + ZMM Yucatán |
| Audiencia | 17–25, educación superior |

**Copy sugerido:**

> ¿No sabes qué carrera estudiar? 🎓  
> Haz nuestro test vocacional y descubre opciones.  
> Escríbenos por WhatsApp y Eva te ayuda a iniciar.

---

## 5. Flags InsForge piloto Meta (solo tras aprobación)

**Secuencia recomendada:**

```
# Paso 1 — implementar y desplegar handler con §3 (PR separado)
GHL_LIVE_REQUIRE_ALLOWLIST=false
GHL_PUBLIC_LIVE_MAX_LEADS=15
GHL_PUBLIC_LIVE_WINDOW_MINUTES=60
GHL_PUBLIC_LIVE_SCHEDULE=America/Merida;Mon-Fri 09:00-18:00,Sat 09:00-13:00

# Paso 2 — activar live (orden habitual)
GHL_SYNC_MODE=live
GHL_WRITE_CUSTOM_FIELDS=true
WA_AGENT_MODE=live_outbound

# Allowlist puede quedar solo Leandro como red de seguridad secundaria
GHL_LIVE_ALLOWED_PHONES=<OWNER_E.164_ALLOWLIST>
```

**Alternativa sin implementar §3 (más segura, no escala):** mantener `REQUIRE_ALLOWLIST=true` — **no viable** para Meta Ads (leads desconocidos).

---

## 6. Comportamiento Eva esperado (prefill Meta)

| Campo | Esperado |
|-------|----------|
| intent | `no_se_que_estudiar` |
| tags | `eva-wa`, `wa_interes_test` |
| `wa_stage` | `test_recomendado` |
| task | no |
| respuesta | link `https://testunilatino.algorithmus.io` |

Fixture: `tests/payloads/ycloud-phase5a-meta-prefill.json`

---

## 7. Checklist pre-activación Meta (operativa)

### Seguridad Eva / GHL

- [ ] 7G.6C admisiones PASS
- [ ] 7G.6D orgánico limitado PASS (recomendado)
- [ ] Modo público acotado **implementado y probado** en staging/mock
- [ ] `GHL_PROTECTED_FIELDS` verificados post-deploy
- [ ] Rollback probado (Meta pause + InsForge mock)

### Meta Business Manager

- [ ] Cuenta ads + método pago
- [ ] Pixel / CAPI (opcional fase 1)
- [ ] Campaña Click to WhatsApp borrador (no publicar)
- [ ] Presupuesto tope diario configurado
- [ ] Geo Mérida/Yucatán

### Operaciones

- [ ] Admisiones informadas — GHL consola primaria
- [ ] Horario soporte alineado §3.4
- [ ] Plantilla monitoreo 7G.6A completada

---

## 8. Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| GHL live sin allowlist → volumen Meta | Alta | `GHL_PUBLIC_LIVE_MAX_LEADS` + pause Meta |
| Colisión campos landings | Media | `GHL_PROTECTED_FIELDS` + solo `wa_*` |
| Beca rewrite incorrecta | Alta | `LLM_MODE=rewrite` + block beca (actual) |
| Duplicados GHL | Media | search-by-phone antes de create |
| Costo OpenAI | Media | monitoreo tokens; `EVA_LLM_FAIL_OPEN` |
| Lead fuera horario | Baja | after-hours message 4B; task next day |

---

## 9. Secuencia de salida comercial (3 pasos)

| Orden | Fase | Gate | Meta Ads |
|:-----:|------|------|:--------:|
| 1 | **7G.6C** Admisiones allowlist 3 | Utilidad GHL confirmada | OFF |
| 2 | **7G.6D** Orgánico limitado | Cupo + horario OK | OFF |
| 3 | **7G.8** Meta mínimo | Implement §3 + checklist §7 | ON (BM manual) |

---

## 10. Entregables pendientes (código — NO en este commit)

1. PR: `GHL_LIVE_REQUIRE_ALLOWLIST` + rate limit + schedule en `resolveGhlLiveAllowlist` / `syncGHLContact`
2. Tests: extender `run-phase7g4t-ghl-live-allowlist.mjs` con casos público acotado
3. Reporte post-implementación: `phase-7g8-meta-ads-preflight-report.md`
4. Activación Meta: **solo** Leandro en Business Manager tras sign-off

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `meta-pilot-phase5a.md` | Copy y config Meta base |
| `phase-7g4t-ghl-live-allowlist-report.md` | Allowlist actual |
| `phase-7g4u-ghl-fields-landings-vs-eva.md` | Campos protegidos |
| `phase-7g6c-organic-limited-go-live-report.md` | Piloto admisiones |
| `phase-7g6d-organic-limited-prep.md` | Orgánico previo a Meta |

---

**Este documento es plan técnico para aprobación operativa. Meta Ads y `GHL_LIVE_REQUIRE_ALLOWLIST=false` permanecen OFF hasta implementación + sign-off.**
