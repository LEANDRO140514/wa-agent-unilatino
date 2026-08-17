/**
 * Eva semantic turn — cerebro compartido (sin side effects).
 *
 * Orquesta opt-out, journey, not-offered, context memory, classifyIntent,
 * fallbacks, Academic Engine / LLM y FSM en memoria.
 * No envía WhatsApp, no escribe GHL, no persiste contacto/FSM/outbound.
 * applyAcademicAndLlmEnrichment puede hacer egress LLM semántico si está enabled.
 */

export async function runEvaSemanticTurn(input = {}, brain = {}) {
  const rawText = input.rawText;
  const config = input.config;
  let academicState = input.academicState || {};
  let contactContext = input.contactContext || {};
  const prevContact = input.prevContact || null;
  const catalogSot = input.catalogSot || null;
  const nowIso = input.nowIso || new Date().toISOString();
  const fsmLazyResetApplied = input.fsmLazyResetApplied === true;
  const loadJourneyContext = input.loadJourneyContext || (async () => ({}));

  let fallbackCount = Number(input.fallbackCount) || 0;
  let decision = null;
  let ghlSuppressSideEffects = false;

  if (config.ffNoContact !== false) {
    const optOut = await brain.loadOptOutHandlerModule();
    const optTurn = optOut.resolveOptOutTurn({
      rawText,
      contactContext,
      academicState,
    });
    academicState = optOut.mergeAcademicStatePatch(academicState, optTurn.academicStatePatch);

    if (optTurn.action === "execute_opt_out") {
      decision = brain.enrichDecisionWithOperational(
        optOut.buildOptOutDecision(rawText),
      );
    } else if (optTurn.action === "ask_confirmation") {
      decision = brain.enrichDecisionWithOperational(optTurn.decision);
      ghlSuppressSideEffects = true;
    } else if (optTurn.action === "re_opt_in") {
      decision = brain.enrichDecisionWithOperational(optTurn.decision);
    } else if (optTurn.ghlSuppress === true) {
      ghlSuppressSideEffects = true;
    }
  }

  if (!decision && config.evaGuidedJourneyEnabled) {
    try {
      const cj = await brain.loadCustomerJourneyModule();
      const journeyContext = await loadJourneyContext();
      const cjTurn = cj.resolveGuidedJourneyTurn({
        rawText,
        journeyContext,
        isFirstContact: !prevContact,
        nowIso,
      });
      if (cjTurn?.handled) {
        if (cjTurn.delegateIntent) {
          decision = brain.returnIntent(
            cjTurn.delegateIntent,
            config,
            null,
            contactContext,
            catalogSot,
          );
          if (cjTurn.appendUrl && decision?.responseText) {
            decision.responseText = `${decision.responseText}\n\n${cjTurn.appendUrl}`;
          }
          if (cjTurn.createTaskOverride === false) decision.createTask = false;
          if (cjTurn.inscripcionFlow) decision.cj_inscripcion = true;
        } else {
          decision = {
            intent: cjTurn.intent || "menu_journey",
            responseText: cjTurn.replyText,
            needsHuman: false,
            createTask: cjTurn.createTask === true,
            waStage: contactContext.wa_stage || "inicio",
            menu_option_detected: cjTurn.mode !== "root_menu" && cjTurn.mode !== "contextual_menu",
            menu_option_value: null,
          };
        }
        decision.cj_state_patch = {
          ...(cjTurn.statePatch || {}),
          ...(config.evaLeadAttributionEnabled ? cjTurn.attributionPatch || {} : {}),
        };
        decision.cj_mode = cjTurn.mode;
      }
    } catch (cjErr) {
      console.warn("[eva_cj1_error]", String(cjErr?.message || "cj_failed").slice(0, 200));
    }
  }

  if (!decision && config.ffNotOffered !== false) {
    const notOffered = await brain.loadNotOfferedResolverModule();
    const notOfferedTurn = notOffered.resolveNotOfferedTurn({
      rawText,
      academicState,
      config,
    });
    academicState = notOffered.mergeAcademicStatePatch(
      academicState,
      notOfferedTurn.academicStatePatch,
    );

    if (notOfferedTurn.action === "decision" && notOfferedTurn.decision) {
      decision = brain.enrichDecisionWithOperational(notOfferedTurn.decision);
    }
    if (notOfferedTurn.ghlSuppress === true) {
      ghlSuppressSideEffects = true;
    }
  }

  if (!decision && config.ffFallbacks !== false) {
    const ctxMem = await brain.loadContextMemoryModule();
    const ctxTurn = ctxMem.resolveContextMemoryTurn({
      rawText,
      academicState,
      catalogSot,
      config,
    });
    academicState = ctxMem.mergeAcademicStatePatch(academicState, ctxTurn.academicStatePatch);

    if (ctxTurn.action === "decision" && ctxTurn.decision) {
      decision = brain.enrichDecisionWithOperational(ctxTurn.decision);
    }
  }

  if (!decision) {
    decision = brain.classifyIntent(rawText, config, contactContext, catalogSot, {
      skipNotOfferedPipeline: config.ffNotOffered !== false,
    });
  }

  if (config.evaGuidedJourneyEnabled && config.evaLeadAttributionEnabled && !prevContact && decision) {
    try {
      const cjA = await brain.loadCustomerJourneyModule();
      const det = cjA.detectSourceFromMessage(rawText);
      const { deriveAttributionPatch } = await import("../customer-journey/journeyMerge.js");
      const attr = deriveAttributionPatch({}, det, nowIso);
      decision.cj_state_patch = { ...(attr || {}), ...(decision.cj_state_patch || {}) };
    } catch (attrErr) {
      console.warn("[eva_cj1_attr_error]", String(attrErr?.message || "attr_failed").slice(0, 120));
    }
  }

  if (config.ffFallbacks !== false) {
    const fallbacks = await brain.loadFallbacksLiteModule();
    const lastOutboundText =
      academicState?.last_outbound_text ||
      prevContact?.wa_last_outbound_text ||
      "";
    const fbTurn = fallbacks.resolveFallbackTurn({
      rawText,
      decision,
      fallbackCount,
      academicState,
      contactContext,
      lastOutboundText,
      config,
    });
    decision = brain.enrichDecisionWithOperational(fbTurn.decision);
    fallbackCount = fbTurn.fallbackCount;
    academicState = fallbacks.mergeAcademicStatePatch(academicState, fbTurn.academicStatePatch);
    decision.fallback_count = fallbackCount;
  }

  if (decision.ghlSuppress === true) {
    ghlSuppressSideEffects = true;
  }

  const enrichResult = await brain.applyAcademicAndLlmEnrichment(
    decision,
    rawText,
    config,
    academicState,
  );
  let enrichedDecision = enrichResult.decision;

  if (config.ffFsm !== false) {
    const fsm = await brain.loadFsmLiteModule();
    enrichedDecision = fsm.applyHumanoBehaviorGate(enrichedDecision, contactContext, config);
    const fsmPatch = fsm.computeFsmTransition({
      contactContext,
      decision: enrichedDecision,
      isNewContact: !prevContact,
      lazyResetApplied: fsmLazyResetApplied,
      config,
    });
    enrichedDecision = fsm.mergeFsmPatchIntoDecision(enrichedDecision, fsmPatch);
  }

  return {
    decision: enrichedDecision,
    academicState: enrichResult.academicState,
    academicMeta: enrichResult.academicMeta,
    ghlSuppressSideEffects,
    fallbackCount,
  };
}
