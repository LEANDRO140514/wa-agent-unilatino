# Phase 7D — WhatsApp Real + Academic Engine Report

**Date:** 2026-06-23  
**Hotfix 7D.1:** `provider_response_id` expuesto en webhook — ver `docs/phase-7d1-provider-response-hotfix-report.md`

**Mode:** recalculate (no POST)
**Result:** 5/5 PASS
**Channel:** +529991525583 → +529994538421

## Investigación provider_response_id

YCloud devuelve `response.id`. El handler lo guarda y ahora también lo expone en `webhookResponse.provider_response_id` (hotfix 7D.1).

Recálculo sobre corrida 2026-06-23T00:47:45Z.

## Tabla por caso

| ID | Input | enriched | intent | outbound_status | provider_id | WARN | Result |
|---:|---|:---:|---|---|---|:---:|---|
| 1 | 1 | yes | career_list | accepted | 6a39d7b1ea37435232ae0b70 | — | PASS |
| 2 | Carreras disponibles | yes | career_list | accepted | 6a39d7b4c140b54d5e92c15a | — | PASS |
| 3 | Derecho online | yes | career_detail | accepted | 6a39d7b8ea37435232ae0b97 | — | PASS |
| 4 | Tengo promedio 9.8, qué beca… | yes | scholarship | accepted | 6a39d7bbc140b54d5e92c16f | — | PASS |
| 5 | No sé qué estudiar | no | fallback | accepted | 6a39d7bfea37435232ae0bb6 | — | PASS |

## Detalle

### Case 1: 1

- inbound_id: `5bcc16a2-1453-4f4c-9aab-62b8a499421d`
- outbound_id: `fe7831c1-f701-40f8-9705-f22acadf9431`
- provider_response_id (resolved): `6a39d7b1ea37435232ae0b70`
- academic_enriched: true



### Case 2: Carreras disponibles

- inbound_id: `ca91a549-4ce9-4235-aa3b-385e5d4a0c01`
- outbound_id: `eabbed02-0da9-4bc6-893f-72496e4b5500`
- provider_response_id (resolved): `6a39d7b4c140b54d5e92c15a`
- academic_enriched: true



### Case 3: Derecho online

- inbound_id: `01ee1724-c8e2-47af-8be1-fddcac7f1131`
- outbound_id: `aca4f48f-de49-43ab-aa09-eb52d1267a60`
- provider_response_id (resolved): `6a39d7b8ea37435232ae0b97`
- academic_enriched: true



### Case 4: Tengo promedio 9.8, qué beca me toca

- inbound_id: `ac713e5d-6cb4-4d15-9dff-5078c022d6a5`
- outbound_id: `f618db0c-5c11-4004-b5ec-d5c08a8ff34c`
- provider_response_id (resolved): `6a39d7bbc140b54d5e92c16f`
- academic_enriched: true



### Case 5: No sé qué estudiar

- inbound_id: `2bdc3cda-4b26-4573-a87a-8640ec2598ab`
- outbound_id: `cab557a5-64e2-44a3-b5a6-a8a68cbc9e85`
- provider_response_id (resolved): `6a39d7bfea37435232ae0bb6`
- academic_enriched: false



## Recomendación

`WA_AGENT_MODE=mock` tras pruebas live.
No activar GHL live sin autorización de Leandro.
Ver `docs/phase-7d-provider-response-id-investigation.md` para mapeo YCloud `id`.