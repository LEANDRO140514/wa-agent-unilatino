# FASE 9B — Core-engine shadow (Costura 1, paso 2/3)

## Objetivo

Ejecutar el juez de `@curdeeclau/algorithmus-core-engine` (Validator →
DecisionMatrix → FSMTransitionChecker → HardGate, vendorizado en FASE 9A)
**en sombra** sobre tráfico real: opina en paralelo a la decisión
determinista de Eva y registra la comparación, sin efecto alguno en las
respuestas.

## Invariantes

- **SHADOW-1:** el módulo nunca modifica la decisión ni la respuesta de Eva.
- **SHADOW-2:** cualquier error se degrada a `console.warn` (`core_shadow_error`); jamás lanza al handler.
- **SHADOW-3:** opt-in explícito con `FF_CORE_SHADOW=true` (default: apagado).

## Alcance

- `lib/core-shadow/index.js` — adapter Eva→core + comparador + logger fail-safe.
- Hook único en el handler, junto a los hooks shadow existentes (CAG/LLM).
- Tabla `wa_core_shadow_log` (espejo del patrón `wa_llm_shadow_log`).
- Mock: registro de la tabla nueva (2 líneas).
- Runner determinista `tests/run-phase9b-core-shadow.mjs` (C1–C4).

## Mapeo de estados (decisión (b): Eva adopta contratos de core)

| Eva | Core | Nota |
| --- | --- | --- |
| SALUDO_INICIAL | INIT | default para contacto nuevo |
| CONSULTA | QUALIFYING | |
| HUMANO | HUMAN_HANDOVER | |
| NO_CONTACT | — | skip: opt-out regulatorio, no hay output que juzgar |

Regla del juez: evalúa desde el **estado previo** al mensaje
(`contactContext.fsm_state`), nunca desde el estado destino de la decisión
(evaluación circular).

Heurística de grounding v1: las respuestas deterministas (canónicas/SOT)
se consideran grounded por construcción cuando hay intent resuelto.
Refinamiento en 9C.

## Activación (staging → prod)

1. Aplicar `insforge/sql/wa_core_shadow_log.sql` en el SQL editor de InsForge.
2. Setear `FF_CORE_SHADOW=true` en el entorno de la función.
3. Redeploy del bundle (`node scripts/bundle-ycloud-wa-deploy.mjs`).

Rollback: `FF_CORE_SHADOW=false` (o ausente). El módulo queda dormido.

## Evidencia (runner, mock DB)

- C1 — mensaje normal: fila shadow con `core_action=accept`, `agreement=true`.
- C2 — escalación a humano: `agreement=false`, `disagreement_reason=eva_escalated_core_accept`
  (divergencia **esperada**: el juez skeleton aún no modela escalación por intent — insumo para 9C).
- C3 — flag off: cero filas.
- C4 — SHADOW-1: respuesta de Eva byte-idéntica con shadow on/off.
- Regresión: runners fase 1 items 0–6 + eng-0b en verde.
  (`eng-0c-classify-intent-replay` falla PREEXISTENTE, también en árbol limpio — fuera del alcance 9B.)
- Bundle: 401.6 KB (378.6 + juez vendorizado y módulo shadow).

## Criterio de salida hacia 9C

Con `FF_CORE_SHADOW=true` en producción, acumular ventana de tráfico y
generar reporte de paridad desde `wa_core_shadow_log`:

```sql
SELECT agreement, disagreement_reason, COUNT(*)
FROM wa_core_shadow_log
GROUP BY 1, 2 ORDER BY 3 DESC;
```

Las divergencias sistemáticas (p. ej. `eva_escalated_core_accept`) definen
qué debe generalizar el FSM/matriz de core en 9C antes de que el juez
tome el mando y `fsm-lite`/guardrails puedan retirarse.
