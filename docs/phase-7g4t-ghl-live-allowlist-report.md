# Phase 7G.4T — GHL Live Allowlist Report

**Date:** 2026-06-24
**Status:** **PASS** (8/8 checks)

## Summary

- Variable: `GHL_LIVE_ALLOWED_PHONES`
- Block only when `GHL_SYNC_MODE=live`
- No real GHL API calls (stubbed `leadconnectorhq.com`)
- No WhatsApp live (`WA_AGENT_MODE=mock`)
- No deploy

## Cases

| ID | Name | Result |
|:---:|---|:---:|
| 1 | dry_run sin allowlist | PASS |
| 2 | live sin allowlist | PASS |
| 3 | live teléfono no permitido | PASS |
| 4 | live teléfono permitido mock GHL | PASS |
| 5 | live normalized_phone vacío | PASS |
| 6 | live lista con espacios | PASS |
| 7 | live beca permitido | PASS |
| P | parse spaces | PASS |

## Block reasons

- `blocked_allowlist_missing` — live sin lista
- `blocked_allowlist_no_phone` — teléfono vacío
- `blocked_allowlist_phone` — teléfono fuera de lista

## Recommendation 7G.5A

1. Set `GHL_LIVE_ALLOWED_PHONES=+529991525583` in InsForge before `GHL_SYNC_MODE=live`.
2. Keep `GHL_WRITE_CUSTOM_FIELDS=false`.
3. Pilot 3–5 messages; rollback to `dry_run` after.