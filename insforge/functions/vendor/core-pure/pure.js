"use strict";
// ── @curdeeclau/algorithmus-core-engine/pure — Zero-dependency surface ──
//
// FASE 9A (Costura 1: core → wa-agent-unilatino).
// Este barrel exporta ÚNICAMENTE módulos sin imports externos (ni pino,
// ni pg, ni redis, ni providers). Es apto para bundlearse dentro de
// runtimes restringidos (edge functions InsForge) vía vendorización.
//
// Invariante de este archivo (verificada por tests/unit/pure-surface.spec.ts):
//   Ningún export de este barrel puede arrastrar un import de node_modules
//   ni de src/infra/. Si un módulo necesita I/O o un logger, NO va aquí:
//   va en index.ts y el consumidor lo inyecta por puerto.
//
// Excluidos deliberadamente (dependen de pino u orquestan infra):
//   Orchestrator, ProductionAIValidator, LLMGateway, RAGService,
//   LeadCaptureService, repositorios de infra/.
//
// Autoridad: docs/agent-rules/00_validation-invariants.md (INV-1..5)
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFactsBlock = exports.isWorthExtracting = exports.parseExtractedFacts = exports.LEAD_FACT_TYPES = exports.NoopValidationMetricsPort = exports.BasicHardGate = exports.BasicDecisionMatrix = exports.BasicAIValidator = exports.getAllowedActionsForState = exports.FSMTransitionChecker = exports.FSMEngine = void 0;
// ── FSM ───────────────────────────────────────────────────
var FSMEngine_1 = require("./core/fsm/FSMEngine");
Object.defineProperty(exports, "FSMEngine", { enumerable: true, get: function () { return FSMEngine_1.FSMEngine; } });
var FSMTransitionChecker_1 = require("./core/fsm/FSMTransitionChecker");
Object.defineProperty(exports, "FSMTransitionChecker", { enumerable: true, get: function () { return FSMTransitionChecker_1.FSMTransitionChecker; } });
var fsm_types_1 = require("./core/fsm/fsm.types");
Object.defineProperty(exports, "getAllowedActionsForState", { enumerable: true, get: function () { return fsm_types_1.getAllowedActionsForState; } });
// ── Validation (el "juez": Validator → DecisionMatrix → HardGate) ──
var AIValidatorImpl_1 = require("./core/validation/AIValidatorImpl");
Object.defineProperty(exports, "BasicAIValidator", { enumerable: true, get: function () { return AIValidatorImpl_1.BasicAIValidator; } });
var DecisionMatrixImpl_1 = require("./core/validation/DecisionMatrixImpl");
Object.defineProperty(exports, "BasicDecisionMatrix", { enumerable: true, get: function () { return DecisionMatrixImpl_1.BasicDecisionMatrix; } });
var HardGateImpl_1 = require("./core/validation/HardGateImpl");
Object.defineProperty(exports, "BasicHardGate", { enumerable: true, get: function () { return HardGateImpl_1.BasicHardGate; } });
var NoopMetricsPort_1 = require("./core/validation/NoopMetricsPort");
Object.defineProperty(exports, "NoopValidationMetricsPort", { enumerable: true, get: function () { return NoopMetricsPort_1.NoopValidationMetricsPort; } });
// ── Memoria del lead (extracción pura de hechos) ──────────
var factExtraction_1 = require("./core/memory/factExtraction");
Object.defineProperty(exports, "LEAD_FACT_TYPES", { enumerable: true, get: function () { return factExtraction_1.LEAD_FACT_TYPES; } });
Object.defineProperty(exports, "parseExtractedFacts", { enumerable: true, get: function () { return factExtraction_1.parseExtractedFacts; } });
Object.defineProperty(exports, "isWorthExtracting", { enumerable: true, get: function () { return factExtraction_1.isWorthExtracting; } });
Object.defineProperty(exports, "formatFactsBlock", { enumerable: true, get: function () { return factExtraction_1.formatFactsBlock; } });
