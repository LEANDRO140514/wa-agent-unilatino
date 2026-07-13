/**
 * EVA-CJ-1 — menuRouter (§14): resolver opción según menu_state, comandos
 * globales, comandos permanentes, compatibilidad legacy y fallback a
 * lenguaje libre (retorna null → classifyIntent + academic-engine).
 */

import { getMenu, PASSTHROUGH_STATES } from "./menuRegistry.js";
import { normalizeText } from "./sourceDetector.js";

const GLOBAL_MENU_COMMANDS = new Set(["0", "menu", "menú", "inicio", "volver"]);

/** Comandos permanentes → intent operativo existente (§14.4). */
const PERMANENT_COMMANDS = Object.freeze({
  asesor: "humano",
  humano: "humano",
  carreras: "carreras_disponibles",
  beca: "beca",
  becas: "beca",
  test: "no_se_que_estudiar",
  inscripcion: "__inscripcion__",
  requisitos: "requisitos",
  ubicacion: "ubicacion",
});

/** Compatibilidad legacy (§14.2): números sin menu_state válido. */
const LEGACY_NUMBER_MAP = Object.freeze({
  "1": "carreras_disponibles",
  "2": "beca",
  "3": "no_se_que_estudiar",
  "4": "humano",
});

/**
 * @returns {null | {kind: 'global_root'} | {kind: 'permanent', intent}
 *   | {kind: 'legacy', intent} | {kind: 'option', option, menuState}}
 * null = no es navegación de menú → texto libre.
 */
export function routeMenuInput(rawText, menuState, menuStateValid) {
  const normalized = normalizeText(rawText);
  if (!normalized) return null;

  if (GLOBAL_MENU_COMMANDS.has(normalized)) {
    return { kind: "global_root" };
  }

  if (PERMANENT_COMMANDS[normalized]) {
    return { kind: "permanent", intent: PERMANENT_COMMANDS[normalized], command: normalized };
  }

  const isBareNumber = /^\d$/.test(normalized);
  if (!isBareNumber) return null;

  if (menuStateValid && menuState) {
    const menu = getMenu(menuState);
    if (menu?.options?.[normalized]) {
      return { kind: "option", option: menu.options[normalized], optionValue: normalized, menuState };
    }
    if (menu || PASSTHROUGH_STATES.includes(menuState)) {
      // Número fuera de rango dentro de un menú conocido → re-mostrar
      return { kind: "invalid_option", menuState };
    }
  }

  // Sin menu_state válido → compatibilidad legacy (§14.2)
  if (LEGACY_NUMBER_MAP[normalized]) {
    return { kind: "legacy", intent: LEGACY_NUMBER_MAP[normalized] };
  }
  return null;
}
