# Phase 8B.1 — Knowledge Onboarding + CAG Scaffold (Eva WA Unilatino)

**Estado:** PASS (scaffold local)  
**Fecha:** 2026-06-27  
**Repo:** `wa-agent-unilatino`  
**Rama:** `main` @ `7a98949`

---

## 2.1 Definición

- **RAG + CAG** es capability **transversal de plataforma** (destino: `algorithmus-platform / Pekín`).
- **Eva WA Unilatino** es el **primer knowledge pack real** validado en producción piloto.
- **`whatsapp-saas`** será la futura UI / control plane para cargar, aprobar, versionar y operar conocimiento por tenant.
- **`algorithmus-platform`** será el destino final del knowledge engine (ingestion, CAG, RAG, router, cache, observability).

Este scaffold no integra runtime productivo; prepara estructura, metadata, cache y módulo local consumible en fases siguientes.

---

## 2.2 Separación arquitectónica

### 1. Platform Knowledge Engine

- Ingestion de documentos estáticos y dinámicos
- **CAG** (cache-as-context) — implementado en 8B.1 como scaffold local
- **RAG** futuro (embeddings + retrieval)
- Versioning (`knowledgeVersion`, `contentHash`)
- Retrieval router (`isQuerySuitableForCAG` → futuro RAG/CAG/NONE)
- Cache JSON versionado
- Observability (pendiente plataforma)

### 2. Vertical Knowledge Pack (Eva WA Unilatino)

Conocimiento específico Universidad Latino:

- Carreras y modalidades
- Costos validados
- Becas
- RVOE
- Admisiones (parcial; montos pendientes marcados)
- Políticas conversacionales
- FAQs autorizadas
- Respuestas oficiales (ubicación, revalidación general, etc.)

**Ubicación en repo:** `docs/knowledge/static/`, `docs/knowledge/metadata.json`

### 3. SaaS Control Plane (futuro — `whatsapp-saas`)

- Carga de documentos
- Aprobación de conocimiento por admisiones
- Tenants, inbox, usuarios, roles
- Analytics de uso de knowledge

**Fuera de alcance 8B.1.**

### 4. Runtime Agent Consumer (Eva WA actual)

- `ycloud-wa-inbound.js` — handler WhatsApp (sin integración CAG en 8B.1)
- YCloud WhatsApp, GHL sync, response builder, intent engine
- Academic engine (`source-of-truth.js`) — sigue siendo source operativo hoy

**Módulo nuevo (aislado):** `insforge/functions/lib/knowledge/getKnowledgeContext.js`

---

## 2.3 Reglas

| Regla | 8B.1 |
|-------|------|
| CAG primero | ✅ Cache estático local |
| RAG después | ✅ Desactivado explícitamente |
| LLM apagado | ✅ `llmAllowed: false`, sin cambios runtime |
| Deterministic-first | ✅ Solo markdown validado |
| Source-of-truth obligatorio | ✅ Datos de `source-of-truth.js` + hotfix 7G.7C.7 |
| No inventar | ✅ `PENDIENTE_VALIDACION_ADMISIONES` donde aplica |
| Cache versionado | ✅ `eva-unilatino-cag-v1` + SHA-256 |
| Invalidación explícita | ✅ Rebuild script |
| Respuestas con datos oficiales | ✅ Pack estático |
| Escalamiento humano si no hay dato | ✅ Router NONE para queries personalizadas |

---

## 2.4 Primer alcance (8B.1)

- Eva WA Unilatino static knowledge (`docs/knowledge/static/*.md`)
- CAG cache local JSON (`docs/knowledge/cache/eva-cache-v1.json`)
- Metadata versionada (`docs/knowledge/metadata.json`)
- Script build cache (`scripts/build-eva-cag-cache.mjs`)
- Módulo `getKnowledgeContext` + router `isQuerySuitableForCAG`
- Tests mock/locales
- **Sin** integración productiva con inbound handler

---

## 2.5 Fuera de alcance

- RAG productivo, pgvector, embeddings productivos
- Migraciones InsForge reales
- UI `whatsapp-saas`
- LLM rewrite
- Live pilot, deploy, cambio de flags/secrets
- Integración en `ycloud-wa-inbound.js`

---

## 18. Reporte final de fase

### Preflight (tarea 1)

| Check | Resultado |
|-------|-----------|
| Repo | `wa-agent-unilatino` |
| Rama | `main` |
| Sync `origin/main` | ✅ Sincronizado (`main...origin/main`) |
| Commits recientes | ✅ `7a98949`, `383a905`, `ad70bcb` presentes |
| Pendientes antiguos | Presentes (phase-7g3a, 7g6c-*, 7g7b1, runners viejos) — **no tocados** |

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `docs/phase-8b1-knowledge-onboarding-cag-scaffold.md` | Blueprint + reporte |
| `docs/knowledge/static/programas.md` | Catálogo, costos, medicina |
| `docs/knowledge/static/admisiones.md` | Proceso, docs, contacto |
| `docs/knowledge/static/becas.md` | Tabla becas + reglas |
| `docs/knowledge/static/rvoe.md` | RVOE + reglas |
| `docs/knowledge/static/ubicacion.md` | Campus + reglas (sin asesor) |
| `docs/knowledge/static/revalidacion.md` | Revalidación general |
| `docs/knowledge/static/preparatoria-posgrados.md` | Niveles no principales |
| `docs/knowledge/static/faqs.md` | FAQs conversacionales |
| `docs/knowledge/dynamic/README.md` | Placeholder dinámico |
| `docs/knowledge/cache/README.md` | Instrucciones cache |
| `docs/knowledge/metadata.json` | Metadata versionada |
| `docs/knowledge/cache/eva-cache-v1.json` | **Generado** — CAG cache v1 |
| `scripts/build-eva-cag-cache.mjs` | Build cache local |
| `insforge/functions/lib/knowledge/getKnowledgeContext.js` | Consumer CAG/NONE |
| `tests/run-phase8b1-cag-cache-build.mjs` | Tests build |
| `tests/run-phase8b1-knowledge-context.mjs` | Tests router + context |

### Decisiones tomadas

1. **Coexistencia con knowledge legacy:** `docs/knowledge/official/` y CSVs existentes no se modificaron; 8B.1 añade `static/`, `dynamic/`, `cache/` como capa CAG.
2. **Orden de documentos en cache:** según `metadata.json.staticDocuments` (programas → admisiones → becas → …).
3. **Router conservador:** queries personalizadas (revalidar N materias, promoción de hoy, cupo, beca exacta) → `NONE` aunque el tema sea parcialmente estático.
4. **Módulo aislado:** no import en `ycloud-wa-inbound.js` — integración en 8B.2.
5. **Admisiones:** montos de pago anual/semestral marcados `PENDIENTE_VALIDACION_ADMISIONES`.

### Qué vive dónde

| Capa | Contenido 8B.1 |
|------|----------------|
| **Plataforma (futuro)** | Engine CAG/RAG, router unificado, observability, invalidación distribuida |
| **Vertical (Eva WA)** | `docs/knowledge/static/*`, metadata tenant, cache v1 |
| **whatsapp-saas (futuro)** | UI carga/aprobación, tenants, roles |
| **Runtime (hoy)** | Intent engine + academic-engine; CAG module listo pero no cableado |

### Resultado build cache

```
node scripts/build-eva-cag-cache.mjs
```

| Campo | Valor |
|-------|-------|
| `knowledgeVersion` | `eva-unilatino-cag-v1` |
| `contentHash` | `bd550d5f4e5175c21909488c439ca6d57a965dde105f63aca665eca37785ef39` |
| `tokenEstimate` | 1978 |
| `sourceFiles` | 8 documentos estáticos |

### Resultado tests

| Suite | Resultado |
|-------|-----------|
| `run-phase8b1-cag-cache-build.mjs` | **22/22 PASS** |
| `run-phase8b1-knowledge-context.mjs` | **52/52 PASS** |
| `run-phase7g7c7a-pilot-conversation-hotfix.mjs` | **13/13 PASS** (regresión) |
| `run-phase7g7c7b-pilot-conversation-replay.mjs` | **15/15 PASS** (regresión) |

### Confirmaciones de restricciones

| Restricción | Estado |
|-------------|--------|
| LLM off (`EVA_LLM_ENABLED=false`, `LLM_MODE=off`) | ✅ Sin cambios |
| RAG productivo off | ✅ `ragEnabled: false` en metadata; comentario en módulo |
| InsForge writes | ✅ Ninguno |
| Deploy | ✅ Ninguno |
| Live / WA / GHL live | ✅ Sin cambios |
| Secrets | ✅ No tocados; cache sin patrones de secret |
| `ycloud-wa-inbound.js` | ✅ **No modificado** |
| Commit | ✅ **No realizado** (por instrucción) |

### InsForge MCP (read-only)

En esta sesión el scaffold es **100% local**; no se requirieron writes ni lecturas adicionales.

En preflight de la fase se confirmó read-only vía MCP:

- Función `ycloud-wa-inbound` activa (`updatedAt=2026-06-27T06:12:04.813Z`, commit 7G.7C.7-C)
- Flags runtime siguen en modo seguro (mock / dry_run / LLM off)
- No se requieren migraciones InsForge para 8B.1

### Riesgos

1. **Doble source-of-truth:** respuestas runtime siguen en código + academic-engine; el pack CAG puede divergir si no se sincroniza en 8B.2+.
2. **Router por keywords:** falsos positivos/negativos posibles; requiere refinamiento con replay en 8B.2.
3. **Admisiones parcial:** montos anual/semestral pendientes de validación admisiones.
4. **Cache path relativo:** módulo asume repo layout local; deploy InsForge necesitará empaquetar cache o path configurable.

### Recomendación siguiente

**8B.2 — CAG integration mock with Eva WA replay**

- Import opcional de `getKnowledgeContext` en handler (mock/shadow)
- Comparar contexto CAG vs respuesta determinística actual
- Extender replay para validar que CAG no contradice intents
- Sin activar LLM ni RAG

---

## Criterios de éxito (checklist)

- [x] Blueprint 8B.1
- [x] `docs/knowledge` con static/dynamic/cache
- [x] `metadata.json` válido
- [x] Script genera `eva-cache-v1.json`
- [x] Cache solo conocimiento validado o marcado pendiente
- [x] `getKnowledgeContext` CAG/NONE
- [x] RAG explícitamente desactivado
- [x] LLM no activado
- [x] Live no tocado
- [x] InsForge sin writes
- [x] Tests 8B.1 pasan
- [x] Pendientes antiguos fuera del scope

**Fase 8B.1: PASS**
