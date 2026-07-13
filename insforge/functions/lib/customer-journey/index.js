/**
 * EVA-CJ-1 — index: orquestador del journey dirigido.
 * UNA función para el handler: resolveGuidedJourneyTurn(). Devuelve
 * { handled:false } → el handler sigue su flujo normal (classifyIntent /
 * academic-engine, lenguaje libre siempre disponible §14.6-7), o
 * { handled:true, ... } con la navegación resuelta determinísticamente.
 *
 * Nunca toca red ni DB: recibe contexto, devuelve decisión + patches.
 */

import { buildMenuStatePatch, deriveAttributionPatch, isMenuStateValid, mergeJourneyState } from "./journeyMerge.js";
import { getMenu } from "./menuRegistry.js";
import { routeMenuInput } from "./menuRouter.js";
import { detectSourceFromMessage } from "./sourceDetector.js";
import { sanitizeJourneyFields } from "./schemas.js";
import { TEST_VOCACIONAL_URL } from "./constants.js";

export { mergeJourneyState } from "./journeyMerge.js";
export { buildJourneyFieldsPreview, GHL_EVA_JOURNEY_FIELD_MAP_PROPOSAL } from "./ghlJourneyPreview.js";
export { detectSourceFromMessage } from "./sourceDetector.js";

function journeyPatchFromOption(option, journeyContext, nowIso) {
  const { nextState: merged, warnings } = mergeJourneyState(journeyContext, {
    fields: {
      eva_tema_atencion: option.tema,
      eva_estado_journey: option.journey,
      eva_siguiente_accion: option.next,
      eva_ultimo_touch: "whatsapp",
    },
  });
  const { clean } = sanitizeJourneyFields({
    eva_tema_atencion: merged.eva_tema_atencion,
    eva_estado_journey: merged.eva_estado_journey,
    eva_siguiente_accion: merged.eva_siguiente_accion,
    eva_ultimo_touch: "whatsapp",
  });
  return { patch: clean, warnings };
}

/**
 * @param {object} p
 * @param {string} p.rawText — mensaje del usuario
 * @param {object} p.journeyContext — columnas journey/menu de wa_contacts_state (o {})
 * @param {boolean} p.isFirstContact — sin contacto previo
 * @param {string} p.nowIso
 * @returns {{handled:false}} | {{handled:true, mode, replyText?, intent?,
 *   statePatch, attributionPatch?, journeyWarnings?}}
 */
export function resolveGuidedJourneyTurn({ rawText, journeyContext = {}, isFirstContact = false, nowIso }) {
  const now = nowIso || new Date().toISOString();

  // ── 1. Primer contacto: detección de origen + menú contextual (§10-12) ──
  if (isFirstContact) {
    const detection = detectSourceFromMessage(rawText);
    const attributionPatch = deriveAttributionPatch(journeyContext, detection, now);
    const menuKey = detection?.menu || "root";
    const menu = getMenu(menuKey);
    const { patch } = journeyPatchFromOption(
      { tema: journeyContext.eva_tema_atencion, journey: "menu_mostrado", next: "ninguna" },
      journeyContext,
      now,
    );
    return {
      handled: true,
      mode: detection ? "contextual_menu" : "root_menu",
      detection: detection || null,
      replyText: menu.text,
      intent: "menu_journey",
      createTask: false, // §8/§10: no crear task por mostrar menús
      statePatch: {
        ...patch,
        ...buildMenuStatePatch(menuKey, "show_menu", now),
        eva_estado_journey: patch.eva_estado_journey ?? "menu_mostrado",
      },
      attributionPatch,
    };
  }

  // ── 2. Navegación: números, comandos globales y permanentes (§14) ──
  const stateValid = isMenuStateValid(journeyContext);
  const route = routeMenuInput(rawText, journeyContext.menu_state, stateValid);
  if (!route) return { handled: false }; // texto libre → classifyIntent (§14.6)

  if (route.kind === "global_root") {
    const menu = getMenu("root");
    return {
      handled: true,
      mode: "global_root",
      replyText: menu.text,
      intent: "menu_journey",
      createTask: false,
      statePatch: buildMenuStatePatch("root", "global_root", now),
    };
  }

  if (route.kind === "permanent" || route.kind === "legacy") {
    // Delegar al intent operativo existente; el menú solo registra el touch.
    return {
      handled: true,
      mode: route.kind,
      delegateIntent: route.intent === "__inscripcion__" ? "humano" : route.intent,
      inscripcionFlow: route.intent === "__inscripcion__",
      statePatch: buildMenuStatePatch(
        stateValid ? journeyContext.menu_state : "root",
        `${route.kind}:${route.intent}`,
        now,
      ),
    };
  }

  if (route.kind === "invalid_option") {
    const menu = getMenu(route.menuState) || getMenu("root");
    return {
      handled: true,
      mode: "invalid_option",
      replyText: `Esa opción no está en el menú. 😊\n\n${menu.text}`,
      intent: "menu_journey",
      createTask: false,
      statePatch: buildMenuStatePatch(route.menuState, "invalid_option", now),
    };
  }

  // route.kind === "option" — opción numérica del menú activo
  const option = route.option;
  const { patch, warnings } = journeyPatchFromOption(option, journeyContext, now);
  const statePatch = {
    ...patch,
    ...buildMenuStatePatch(option.nextState, `option:${route.optionValue}@${route.menuState}`, now),
  };

  // Submenú anidado (root opción 4 → info_catalog)
  if (typeof option.reply === "string" && option.reply.startsWith("__MENU__")) {
    const subKey = option.reply.replace("__MENU__", "");
    const sub = getMenu(subKey);
    return {
      handled: true,
      mode: "submenu",
      replyText: sub.text,
      intent: "menu_journey",
      createTask: false,
      statePatch: { ...statePatch, ...buildMenuStatePatch(subKey, "show_submenu", now) },
      journeyWarnings: warnings,
    };
  }

  if (option.intent) {
    // Delegar al intent operativo (respuesta factual de academic-engine /
    // canónicas); política de task del intent se conserva (createTask:null).
    return {
      handled: true,
      mode: "delegate",
      delegateIntent: option.intent,
      appendUrl: option.appendUrl || (option.intent === "no_se_que_estudiar" ? `Aquí tienes el enlace del test: ${TEST_VOCACIONAL_URL}` : null),
      createTaskOverride: option.createTask, // null = conservar política vigente
      statePatch,
      journeyWarnings: warnings,
    };
  }

  return {
    handled: true,
    mode: "navigation_reply",
    replyText: option.reply,
    intent: "menu_journey",
    createTask: option.createTask === true,
    statePatch,
    journeyWarnings: warnings,
  };
}
