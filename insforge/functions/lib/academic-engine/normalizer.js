export const ONLINE_SYNONYMS = [
  "online", "on line", "en linea", "virtual", "virtuales",
  "remoto", "remota", "a distancia", "desde casa",
];

export const PRESENTIAL_SYNONYMS = [
  "presencial", "en campus", "en salon", "fisico", "fisica",
];

export const SATURDAY_SYNONYMS = [
  "sabatina", "sabados", "sabado", "fin de semana",
];

export function normalizeInput(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡]/g, "")
    .replace(/[.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function includesAny(normalized, words) {
  return words.some((w) => normalized.includes(normalizeInput(w)));
}
