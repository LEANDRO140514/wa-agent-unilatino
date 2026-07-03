# 7G.6E — Checklist secrets / allowlist

**Fase:** 7G.6E-PREP  
**Uso:** Completar antes de activación live (7G.6E)  
**Regla:** E.164 reales solo en InsForge secrets / env local — **nunca en el repo**

---

## A. Allowlist E.164

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| A1 | Lista E.164 preparada (mín. 3 números) | ☐ | Owner + 2 asesores |
| A2 | Valores cargados en `GHL_LIVE_ALLOWED_PHONES` (InsForge) | ☐ | CSV sin espacios |
| A3 | Placeholders documentados en plantilla autorización | ☐ | `+52XXXXXXXXXX_*` |
| A4 | **No hay teléfonos reales en repo Git** | ☐ | `git grep` limpio |
| A5 | Cada número verificado en WhatsApp personal | ☐ | |
| A6 | Allowlist default pre-sesión = owner-only (count=1) | ☐ | Estado seguro actual |

**Template allowlist (placeholders — reemplazar en InsForge):**

```
GHL_LIVE_ALLOWED_PHONES=+52XXXXXXXXXX_TEST_1,+52XXXXXXXXXX_ADMISIONS_1,+52XXXXXXXXXX_ADMISIONS_2
```

---

## B. YCloud credentials

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| B1 | YCloud API key presente en InsForge secrets | ☐ | No commitear |
| B2 | Webhook apunta a `ycloud-wa-inbound` | ☐ | **No modificar en prep** |
| B3 | Número business Eva confirmado | ☐ | `+529994538421` |
| B4 | Template WA aprobados para respuestas | ☐ | Si aplica outbound |

---

## C. GHL credentials (si perfil B o C)

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| C1 | GHL API key / location ID presentes | ☐ | InsForge secrets |
| C2 | Custom fields `wa_*` existen en GHL | ☐ | Solo perfil C |
| C3 | Tags Eva configurados (`eva-wa`, etc.) | ☐ | |
| C4 | Campos protegidos identificados | ☐ | Ver 7G.6C checklist |
| C5 | GHL dry_run validado en suites recientes | ☐ | 7G.6C PASS |

---

## D. Flags InsForge (estado pre-activación)

| Secret | Valor actual esperado | OK |
|--------|----------------------|:--:|
| `WA_AGENT_MODE` | `mock` | ☐ |
| `GHL_SYNC_MODE` | `dry_run` | ☐ |
| `GHL_WRITE_CUSTOM_FIELDS` | `false` | ☐ |
| `ACADEMIC_ENGINE_ENABLED` | `true` | ☐ |
| `EVA_LLM_ENABLED` | `false` | ☐ |

---

## E. Equipo y responsables

| # | Check | OK | Notas |
|---|-------|:--:|-------|
| E1 | Leandro disponible (autorización + GO/NO-GO) | ☐ | |
| E2 | Asesor admisiones disponible | ☐ | |
| E3 | Responsable técnico monitoreo | ☐ | |
| E4 | Responsable rollback designado | ☐ | |
| E5 | Plantilla autorización firmada (copia privada) | ☐ | `phase-7g6e-live-authorization-template.md` |

---

## F. Validación técnica pre-activación

```powershell
$env:PHASE_7G6D_STRICT_GIT="1"
node tests/run-phase-7g6e-live-readiness-strict.mjs
```

| Suite | Esperado | OK |
|-------|----------|:--:|
| 7G.6E strict readiness | PASS | ☐ |
| 7G.6D readiness | PASS | ☐ |
| 7G.6C | 7/7 PASS | ☐ |
| VAL-0 | 7/7 PASS | ☐ |

---

## G. Seguridad repo

| # | Check | OK |
|---|-------|:--:|
| G1 | `.env` / credentials no trackeados | ☐ |
| G2 | Sin E.164 reales en docs commiteados | ☐ |
| G3 | Sin API keys en logs de test | ☐ |

```powershell
git grep -E "\+52[0-9]{10}" docs/ tests/ ; if ($LASTEXITCODE -eq 0) { Write-Error "E.164 real detectado" }
```

---

## Decisión

| Resultado | Acción |
|-----------|--------|
| Todos ☐ → ☑ | Proceder a 7G.6E con autorización firmada |
| Cualquier fallo | **NO-GO** — no tocar secrets live |
