# EVA LLM — Shadow + Rewrite (Fase 7G.1 / 7G.2)

Capa de sugerencia IA sobre el academic-engine. En **shadow** solo registra comparación; en **rewrite** puede reemplazar `final_response` con allowlist y guardrails.

## Modos

| `EVA_LLM_ENABLED` | `LLM_MODE` | Comportamiento |
|-------------------|------------|----------------|
| `false` | cualquiera | Sin LLM. `responseText` = academic-engine / WA. |
| `true` | `shadow` | Genera `suggested_response`; `final_response` = `factual_response`. |
| `true` | `rewrite` | Allowlist + `validateRewrite`; si PASS → `final_response` = `suggested_response`. |

## Flujo rewrite (7G.2)

1. `academic-engine` produce `factual_response`.
2. `eva-llm` genera `suggested_response` (OpenAI o `fake` sin API key).
3. `validateShadowSuggestion()` → `guardrail_warnings`.
4. `validateRewrite()` compara suggested vs factual (montos, becas, escalamiento humano, test vocacional).
5. Si intent ∈ allowlist y sin `block_reason` → `eva_llm_rephrased=true`, `final_response` = suggested.
6. Si no → `final_response` = factual, `block_reason` documentado.
7. Handler persiste en `wa_llm_shadow_log` (`mode=rewrite`, `block_reason`, `eva_llm_rephrased`).

### Allowlist rewrite

- `carreras_disponibles`
- `carrera_interes`
- `no_se_que_estudiar`
- `humano`

### Bloqueados (siempre factual)

- `beca` → `scholarship_blocked`
- `duda_test`, `post_test`, `sin_texto`, `ambiguo` → `blocked_intent` o `skipped_intent`
- Cualquier `guardrail_warnings` → `guardrail_blocked`
- `validateRewrite` risky / `added_claims` / datos críticos cambiados
- `suggested_response` vacía → `empty_suggestion`
- Error LLM (con `EVA_LLM_FAIL_OPEN=true`) → `llm_error`

## Variables

| Secret | Descripción |
|--------|-------------|
| `EVA_LLM_ENABLED` | `true` activa capa LLM |
| `LLM_MODE` | `shadow` (7G.1) o `rewrite` (7G.2) |
| `LLM_PROVIDER` | `openai` o `fake` |
| `LLM_MODEL` | ej. `gpt-4o-mini` |
| `EVA_LLM_FAIL_OPEN` | `true` → fallback a factual si falla OpenAI |
| `OPENAI_API_KEY` | InsForge secret; sin key → provider `fake` |

## Pruebas

```bash
# 7G.1 shadow
node tests/run-phase7g1-llm-shadow.mjs

# 7G.2 rewrite mock/dry_run (requiere LLM_MODE=rewrite en InsForge)
node tests/run-phase7g2-llm-rewrite-mock.mjs
```

## SQL

Tabla `wa_llm_shadow_log` — columnas opcionales 7G.2: `block_reason`, `eva_llm_rephrased`.

## Restricciones 7G.2

- Solo `WA_AGENT_MODE=mock` + `GHL_SYNC_MODE=dry_run`.
- No rewrite en beca ni con guardrails activos.
- No activar WhatsApp/GHL live sin fase 7G.3+ autorizada.
