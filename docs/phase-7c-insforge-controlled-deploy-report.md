# Phase 7C — InsForge Controlled Deploy Report

**Date:** 2026-06-23
**Smoke result:** 10/10 PASS

## Endpoint

https://ernkyni3.us-east.insforge.app/functions/ycloud-wa-inbound

## Tabla por caso

| ID | Input | WA | Academic | Enriched | outbound_real | ghl_live | CF written | Result |
|---:|---|---|---|:---:|---|---|---|---|
| 1 | 1 | carreras_disponibles | career_list | yes | false | false | false | PASS |
| 2 | Carreras disponibles | carreras_disponibles | career_list | yes | false | false | false | PASS |
| 3 | Quiero estudiar Psicología | carrera_interes | career_detail | yes | false | false | false | PASS |
| 4 | Derecho online | carrera_interes | career_detail | yes | false | false | false | PASS |
| 5 | Tengo promedio 9.8, qué beca me … | beca | scholarship | yes | false | false | false | PASS |
| 6 | ¿Tienen meses sin intereses? | ambiguo | payment | yes | false | false | false | PASS |
| 7 | ¿Cuál es su WhatsApp? | ambiguo | contact | yes | false | false | false | PASS |
| 8 | No sé qué estudiar | no_se_que_estudiar | fallback | no | false | false | false | PASS |
| 9 | Quiero hablar con asesor | humano | fallback | no | false | false | false | PASS |
| 10 | Se trabó el test | duda_test | fallback | no | false | false | false | PASS |

## IDs

- Case 1: inbound=2c984152-c36e-4f9e-83b3-9ae14fcbb0cc outbound=722d2865-d32f-4a5f-9dd2-08a571744e22 ghl_log=be0abee1-9fdd-4001-bcd2-a384dbd58e4e
- Case 2: inbound=9f992d08-2074-4444-b975-7d6fd7832f70 outbound=1f474a4d-6a92-4fe6-9241-17106b74b807 ghl_log=6224e677-5351-4ad2-baf5-abb7d5fe14e6
- Case 3: inbound=692cef1c-caf7-4afc-ad87-927a53f4d93d outbound=9de01705-aa55-4682-9161-6409ac5de0a4 ghl_log=953ab9fd-7835-4fc1-bdd5-1380367cc688
- Case 4: inbound=43dd6b71-d20c-43e5-8653-772c8dbf7ead outbound=26ea6987-1279-4c43-8052-69f957fb80ca ghl_log=a9103017-0a31-4fb7-94b6-2868bcced436
- Case 5: inbound=49487702-d608-4c0b-ac26-3e08c8927f6e outbound=b34b50c9-3728-4b22-b7f7-1abc015e041a ghl_log=6b03348c-79ee-4bb6-8128-9bdba90bc8dc
- Case 6: inbound=a03a526d-9a6b-4904-b27d-6339da3c0ada outbound=b2c3bfe2-6d40-4880-a3a2-bbe31b011347 ghl_log=249c6313-af78-41ad-ac6e-a03e80cfb881
- Case 7: inbound=d6705ff7-7863-40ed-9371-f7df8fef8bc0 outbound=785cede2-67d7-4007-9e22-21adcac5549d ghl_log=52c4f154-2b71-4de9-94b3-8b53587135dc
- Case 8: inbound=7cc47df0-16d6-4158-8c25-3314d8b5845e outbound=841ebdf1-d4e8-4cf7-87ab-bf3cb6181ee0 ghl_log=ca9286fd-ac7e-422e-8f92-ba1318d739fc
- Case 9: inbound=2bada40b-26c5-4584-95a7-1b81db8d3dbd outbound=cd564109-74c7-44e5-b339-af957c8f999c ghl_log=86a7f0d8-0914-405b-bf91-879b903e9509
- Case 10: inbound=f7fa9486-7bb0-4706-ac22-46ad64131aff outbound=7cd7e78d-2673-46f1-a6a3-e623f9321088 ghl_log=06b88555-3c37-416b-9044-ee550aef5d62