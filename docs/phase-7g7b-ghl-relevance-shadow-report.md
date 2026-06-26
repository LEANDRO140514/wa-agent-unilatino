# Phase 7G.7B — GHL Relevance Gate Shadow Mode

**Date:** 2026-06-24  
**Status:** Implemented locally — **no deploy** (awaiting explicit authorization)

## Objective

Add a **shadow** GHL Relevance Gate that computes commercial relevance, lead score, and hypothetical sync actions **without changing real GHL behavior**.

## Files modified / created

| File | Action |
|------|--------|
| `insforge/functions/lib/ghl-relevance-gate.js` | **Created** — pure decision module |
| `insforge/functions/ycloud-wa-inbound.js` | **Modified** — shadow integration + response field |
| `tests/run-phase7g7b-ghl-relevance-shadow.mjs` | **Created** — unit cases A–J |
| `docs/phase-7g7b-ghl-relevance-shadow-report.md` | **Created** — this report |

## Behavior implemented

### Pure module (`ghl-relevance-gate.js`)

Exports:

- `normalizeGhlRelevanceConfig(env)`
- `hasBusinessSignal(input)`
- `isIgnoredIntent(intent)`
- `isRelevantIntent(intent)`
- `requiresHumanHandoff(input)`
- `computeLeadScore(input)` → `{ lead_score, score_breakdown }`
- `evaluateGhlRelevance(input)` → full shadow decision
- `formatGhlRelevanceShadowPayload(decision)` → webhook-safe shape

No external calls (GHL, YCloud, OpenAI, DB).

### Handler integration

After academic/LLM enrichment and **before** `syncGHLContact`:

1. `computeGhlRelevanceShadow()` runs when `GHL_RELEVANCE_SHADOW_MODE !== false` (default **true**).
2. Result attached as `ghl_relevance_shadow` on webhook response.
3. **Real GHL sync path unchanged** — still governed by `GHL_SYNC_MODE`, `GHL_WRITE_CUSTOM_FIELDS`, `GHL_LIVE_ALLOWED_PHONES`.

### New env variables (read-only, safe defaults)

| Variable | Default | Shadow-only in 7G.7B |
|----------|---------|------------------------|
| `GHL_RELEVANCE_SHADOW_MODE` | `true` | Enables shadow calculation |
| `GHL_SYNC_POLICY` | `none` | Appears in shadow; **does not govern real sync** |
| `GHL_LEAD_SCORE_THRESHOLD` | `45` | Organic threshold |
| `GHL_META_ADS_LEAD_SCORE_THRESHOLD` | `50` | Meta Ads threshold |
| `META_ADS_FIRST_MESSAGE_NO_SYNC` | `true` | First Meta greeting → no shadow sync |
| `META_ADS_REQUIRE_QUALIFICATION` | `true` | Meta below threshold → watch only |

### Shadow decision fields

`ghl_relevance_shadow` includes:

`enabled`, `policy`, `lead_score`, `qualified_for_ghl`, `would_sync_to_ghl`, `would_create_contact`, `would_create_note`, `would_create_task`, `would_update_custom_fields`, `routing_decision`, `routing_reason`, `human_handoff_reason`, `ignored_for_ghl`, `score_breakdown`.

### Lead scoring v1

| Rule | Points |
|------|--------|
| Explicit enrollment | +40 |
| Career interest / mention | +30 |
| Beca / costo | +25 |
| Beca + promedio context | +20 |
| Human / asesor | +20 |
| Urgency | +15 |
| Modality (online, etc.) | +10 |
| Vocational test intents | +10 |
| Parent/tutor | +5 |
| Ambiguous noise | −10 |
| Spam/emoji | −20 |

Cap: 0–100.

### Routing bands (shadow)

| Score | Shadow routing |
|-------|----------------|
| 0–29 | `whatsapp_and_insforge_only` |
| 30–44 | `watch_only_or_high_value_exception` (high-value intents may sync) |
| 45–59 | `qualified_contact_note` |
| 60+ | `qualified_contact_note_task` (if handoff / task intent) |

### Special rules

- **Ignored intents** (no business signal): saludo, agradecimiento, despedida, sin_texto, spam, emoji, media_no_text, ambiguo sin señal → `ignored_intent`
- **Post-escalation closure (7G.6D):** Gracias/Bye with `wa_needs_human` or preserve stages → `post_escalation_closure_no_sync`, no task
- **Meta Ads first message:** Hola only → `meta_ads_first_message_no_sync`
- **Human handoff:** humano, inscripcion, duda_test, post_test, queja, explicit asesor request → task in shadow

## Shadow cases table

| Case | Input / context | `would_sync_to_ghl` | `routing_reason` |
|------|-----------------|---------------------|------------------|
| A Saludo | "Hola" | false | `ignored_intent` |
| B Gracias post-escalación | `wa_needs_human`, `asesor_requerido` | false | `post_escalation_closure_no_sync` |
| C Bye post-escalación | same | false | `post_escalation_closure_no_sync` |
| D Carrera | "Me interesa Derecho online" | true | `lead_score_threshold_met` / high-value |
| E Beca | promedio 9.2 | true | `human_handoff` / threshold |
| F Humano | "Quiero hablar con un asesor" | true | `human_handoff` |
| G Media sin texto | audio, empty | false | `ignored_intent` |
| H Meta primer Hola | `source=meta_ads`, first msg | false | `meta_ads_first_message_no_sync` |
| I Meta + carrera | Psicología, not first | true | qualified |
| J Spam | link scam | false | `ignored_intent` |

## Test results

| Runner | Result | Notes |
|--------|--------|-------|
| `run-phase7g7b-ghl-relevance-shadow.mjs` | **11/11 PASS** | All cases A–J + defaults |
| `run-phase7g6d-conversation-hotfix.mjs` | **4/4 PASS** | 7G.6D hotfix preserved |
| `run-phase7g5b-custom-fields-preflight.mjs` | **9/9 PASS** | Mock DB; GHL path unchanged |
| `run-phase7g6d-replay-mock.mjs` | **0/3 PASS** | Remote InsForge in `live_outbound` / `ghl_live` — **env mismatch**, not 7G.7B code |
| `run-phase7g3a-classifier-hotfix.mjs` | **Preflight FAIL** | Same remote live mode; classifier cases not re-run against mock |

**Note:** Replay and 7G.3A hit the **deployed** InsForge endpoint (7G.6C pilot state). 7G.7B is **not deployed** by design. Local handler regressions pass.

## Confirmations

- **GHL real sync:** NOT modified — dry_run/live logic untouched
- **Secrets:** NOT touched
- **InsForge flags:** NOT changed
- **GHL_WA_FIELD_MAP:** NOT modified
- **No new GHL fields**
- **No deploy** in this phase
- **7G.6D hotfix:** Preserved (local 4/4 + shadow cases B/C)

## Safe runtime (unchanged)

```
WA_AGENT_MODE=mock
GHL_SYNC_MODE=dry_run
GHL_WRITE_CUSTOM_FIELDS=false
GHL_LIVE_ALLOWED_PHONES=+529991525583
```

## Risks / next steps

1. **7G.7C** — Wire shadow policy to real sync on allowlist (`GHL_SYNC_POLICY=qualified_only`)
2. Re-run remote replay/3A after rollback to mock **or** after authorized deploy of 7G.7B
3. Validate `ghl_relevance_shadow` in outbound logs / InsForge responses post-deploy
4. Tune Meta Ads thresholds with real campaign traffic

## Related

- Spec: `docs/phase-7g7a-ghl-relevance-gate-spec.md` (`dcfe6a9`)
