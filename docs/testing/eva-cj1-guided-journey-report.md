# EVA-CJ-1 — Reporte de pruebas (journey dirigido, mock/dry-run)

Runner: `node tests/run-eva-cj1-guided-journey.mjs` — **57/57 PASS**.
Handler real + mock DB (WA_E2E_MOCK_DB). Env de seguridad §22.J activo.

| Grupo | Casos | Resultado | Notas |
| --- | --- | --- | --- |
| A. Menú directo | 10 | PASS | root, 5 opciones, 0/menú globales; A8 usa turno intermedio por anti-repetición legítima de fallbacks-lite |
| B. Contextual carreras | 8 | PASS | prefill exacto, sin acentos y editado; opción 5 inscripción sin task |
| C. Contextual calculadora | 5 | PASS | contexto calculadora_becas ≠ tema carreras; sin promesas de beneficio |
| D. Contextual test | 9 | PASS | post_test sin re-pedir datos; opción 4 delega a academic-engine |
| E. Lenguaje libre | 4 | PASS | pregunta factual → academic-engine; MSI no inventado |
| F. Atribución | 4 | PASS | first-source inmutable, last-touch actualizable, ambiguo→eva_wa |
| G. Dedupe | 3 | PASS | 3 variantes de teléfono → 1 contacto; nunca por nombre |
| H. Merge/protección | 6 | PASS | funciones puras: vacíos, protegidos, inmutables, no-downgrade ×2, fuente autorizada |
| I. Idempotencia | 1 | PASS | mismo inbound → 1 outbound |
| J. Seguridad | 6 | PASS | mock/dry_run/flags false/LLM off/wa_errors=0 |
| Flag OFF | 2 | PASS | comportamiento legacy intacto (intent≠menu_journey, sin campos eva_) |

## Regresión (§23): 9/9 OK
fase1 items 0–6, eng-0b idempotencia, 9B core-shadow. Bundle 432.8 KB.

## Hallazgos de diseño durante pruebas
1. El hook de navegación debe correr ANTES de not-offered: "menú" y
   "Hola, quiero información" eran secuestrados como candidatos de carrera.
   Opt-out conserva prioridad absoluta.
2. La atribución se desacopló del journey: se deriva en el primer contacto
   sin importar qué módulo resolvió el turno.
3. menu_journey fuera de RELEVANT_INTENTS → cero side-effects GHL por diseño.
