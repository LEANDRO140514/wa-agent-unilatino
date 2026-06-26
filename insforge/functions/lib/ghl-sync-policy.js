/**
 * GHL sync policy resolution (7G.7C.1) — pure logic, no API/DB calls.
 */

export const HIGH_VALUE_ROUTING_REASONS = new Set([
  "high_value_intent_exception",
  "explicit_enrollment_intent",
  "vocational_test_lead",
  "orientation_lead",
  "documents_enrollment_signal",
  "cost_signal_requires_human_validation",
  "human_handoff",
  "explicit_human_handoff",
  "lead_score_threshold_met",
  "lead_score_high_with_task",
]);

export function normalizeGhlSyncPolicy(raw) {
  const policy = String(raw || "none")
    .toLowerCase()
    .trim();
  if (policy === "qualified_only" || policy === "all") return policy;
  return "none";
}

export function isHighValueRoutingReason(routingReason) {
  return HIGH_VALUE_ROUTING_REASONS.has(String(routingReason || ""));
}

export function isQualifiedForGhlSync(relevanceDecision = {}) {
  if (relevanceDecision.qualified_for_ghl === true) return true;
  return isHighValueRoutingReason(relevanceDecision.routing_reason);
}

export function resolveGhlSyncAuthorization({ config = {}, relevanceDecision = {}, allowlist = {} }) {
  const policy = normalizeGhlSyncPolicy(config.ghlSyncPolicy);
  const syncMode = String(config.ghlSyncMode || "dry_run").toLowerCase();

  if (policy === "none") {
    if (syncMode === "live") {
      return {
        shouldSync: false,
        governedByGate: true,
        blockReason: "policy_none",
        policy,
      };
    }
    return {
      shouldSync: true,
      governedByGate: false,
      blockReason: null,
      policy,
    };
  }

  if (policy === "all") {
    if (syncMode === "live" && allowlist.applies === true && allowlist.allowed !== true) {
      return {
        shouldSync: false,
        governedByGate: false,
        blockReason: allowlist.block_reason || "blocked_allowlist_phone",
        policy,
      };
    }
    return {
      shouldSync: true,
      governedByGate: false,
      blockReason: null,
      policy,
    };
  }

  if (relevanceDecision.ignored_for_ghl === true) {
    return {
      shouldSync: false,
      governedByGate: true,
      blockReason: relevanceDecision.routing_reason || "ignored_for_ghl",
      policy,
    };
  }

  if (relevanceDecision.would_sync_to_ghl !== true) {
    return {
      shouldSync: false,
      governedByGate: true,
      blockReason: relevanceDecision.routing_reason || "gate_no_sync",
      policy,
    };
  }

  if (!isQualifiedForGhlSync(relevanceDecision)) {
    return {
      shouldSync: false,
      governedByGate: true,
      blockReason: "not_qualified_for_ghl",
      policy,
    };
  }

  if (syncMode === "live" && allowlist.applies === true && allowlist.allowed !== true) {
    return {
      shouldSync: false,
      governedByGate: true,
      blockReason: allowlist.block_reason || "blocked_allowlist_phone",
      policy,
    };
  }

  return {
    shouldSync: true,
    governedByGate: true,
    blockReason: null,
    policy,
  };
}

export function enrichGhlSyncContext(baseContext = {}, relevanceDecision = {}, authDecision = {}) {
  if (!authDecision.governedByGate) {
    return { ...baseContext, ghlSyncGovernedByGate: false };
  }

  return {
    ...baseContext,
    ghlSyncGovernedByGate: true,
    ghlSyncPolicy: authDecision.policy,
    ghlWouldCreateContact: relevanceDecision.would_create_contact === true,
    ghlWouldCreateNote: relevanceDecision.would_create_note === true,
    ghlWouldCreateTask: relevanceDecision.would_create_task === true,
    ghlWouldUpdateCustomFields: relevanceDecision.would_update_custom_fields === true,
    ghlLeadScore: relevanceDecision.lead_score ?? null,
    ghlRoutingReason: relevanceDecision.routing_reason ?? null,
    ghlHumanHandoffReason: relevanceDecision.human_handoff_reason ?? null,
    ghlScoreBreakdown: relevanceDecision.score_breakdown || [],
    ghlQualifiedForGhl: relevanceDecision.qualified_for_ghl === true,
  };
}

export function formatScoreBreakdownSummary(scoreBreakdown = []) {
  if (!Array.isArray(scoreBreakdown) || scoreBreakdown.length === 0) return "—";
  return scoreBreakdown
    .map((entry) => `${entry.rule}: ${entry.points > 0 ? "+" : ""}${entry.points}`)
    .join("; ");
}
