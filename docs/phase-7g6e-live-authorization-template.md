# 7G.6E — Plantilla de autorización explícita (live controlado)

**Fase:** 7G.6E-PREP — Paquete final de autorización  
**Uso:** Leandro completa, firma y conserva **fuera del repo** (copia local / gestor secrets)  
**IMPORTANTE:** No pegar teléfonos E.164 reales en GitHub ni en commits.

---

## 1. Contexto

Esta plantilla es el gate humano final antes de cambiar secrets InsForge. Sin este documento firmado, **7G.6E NO-GO**.

Estado runtime al momento de la autorización (debe ser):

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
EVA_LLM_ENABLED=false
```

---

## 2. Perfil de activación autorizado (marcar uno)

| Perfil | Descripción | Marcar |
|--------|-------------|:------:|
| **A** | Solo WhatsApp live, GHL dry_run | ☐ |
| **B** | WhatsApp live + GHL live, sin custom fields | ☐ |
| **C** | WhatsApp live + GHL live + custom fields `wa_*` | ☐ |

**Recomendación técnica inicial:** Perfil **A** primero.

---

## 3. Bloque de autorización (completar manualmente)

Copiar, completar y firmar. **No commitear al repositorio.**

---

### AUTORIZO 7G.6E LIVE CONTROLADO

Yo, **______________________________** (Leandro / owner), autorizo activar **únicamente** durante la ventana indicada abajo, bajo supervisión técnica y con rollback listo.

**Perfil autorizado:** ☐ A · ☐ B · ☐ C

**Flags autorizados (según perfil):**

| Flag | Perfil A | Perfil B | Perfil C |
|------|----------|----------|----------|
| `WA_AGENT_MODE` | `live_outbound` | `live_outbound` | `live_outbound` |
| `GHL_SYNC_MODE` | `dry_run` | `live` | `live` |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | `false` | `true` |
| `EVA_LLM_ENABLED` | `false` | `false` | `false` |

**Allowlist autorizada (E.164 — completar en copia privada, NO en repo):**

```
+52XXXXXXXXXX_TEST_1
+52XXXXXXXXXX_ADMISIONS_1
+52XXXXXXXXXX_ADMISIONS_2
```

Secret InsForge: `GHL_LIVE_ALLOWED_PHONES` = CSV sin espacios de los E.164 anteriores.

**Ventana autorizada:**

| Campo | Valor |
|-------|-------|
| Fecha | ______________________________ |
| Hora inicio | ______________________________ |
| Hora fin (máx. 60 min) | ______________________________ |
| Responsable monitoreo | ______________________________ |
| Responsable rollback | ______________________________ |

**Condiciones aceptadas:**

- [ ] Pre-live checklist (`phase-7g6d-pre-live-checklist.md`) completado
- [ ] Rollback runbook a mano (`phase-7g6e-live-activation-rollback-runbook.md`)
- [ ] `run-phase-7g6e-live-readiness-strict.mjs` PASS con tree clean
- [ ] Asesores presentes y guion operativo revisado
- [ ] Meta Ads permanecen OFF
- [ ] Rollback a mock/dry_run al cierre o ante incidente

**Firma:** ______________________________  
**Fecha/hora firma:** ______________________________

---

## 4. Revocación

La autorización queda **revocada** automáticamente si:

- Expira la ventana horaria
- Se ejecuta rollback
- Cualquier criterio NO-GO del runbook se activa
- Leandro revoca verbalmente o por escrito

Tras revocación: volver a `mock` / `dry_run` / `CF=false` sin excepción.

---

## 5. Referencias

| Documento | Uso |
|-----------|-----|
| `phase-7g6e-secrets-allowlist-checklist.md` | Secrets y allowlist |
| `phase-7g6e-live-activation-rollback-runbook.md` | Pasos activación/rollback |
| `phase-7g6d-pre-live-checklist.md` | Gate pre-activación |
| `phase-7g6c-admissions-operator-script.md` | Guion asesores |
