# Academic Engine — InsForge / Eva WA

Motor académico **estático** que lee únicamente `source-of-truth.js` (generado desde CSV institucional).

## Módulos

| Archivo | Rol |
|---|---|
| `truth.js` | Acceso a `SOURCE_OF_TRUTH` |
| `normalizer.js` | Normalización de texto |
| `entityExtractor.js` | Entidades y flags de pregunta |
| `intentEngine.js` | Intents académicos |
| `responseBuilder.js` | Respuestas factuales |
| `stateManager.js` | Estado conversacional |
| `index.js` | `resolveAcademicMessage()` |
| `adapter.js` | `shouldEnrichAcademic` / `mergeAcademicIntoDecision` (no conectado a WA aún) |

## Uso

```javascript
import { resolveAcademicMessage } from "./index.js";

const result = resolveAcademicMessage("Quiero estudiar Psicología");
// { ok, academic_intent, entities, response, confidence, ... }
```

## Regenerar fuente

```bash
node scripts/build-source-of-truth.js
```

## Fase actual

7B.2 — sin conexión a `ycloud-wa-inbound.js`. Probar con:

```bash
node tests/run-phase7b-academic.mjs
```
