import { SOURCE_OF_TRUTH, SOURCE_TRUTH_VERSION } from "./source-of-truth.js";

export { SOURCE_OF_TRUTH, SOURCE_TRUTH_VERSION };

export function getActiveCareers() {
  return SOURCE_OF_TRUTH.careers.filter((c) => c.active !== false);
}

export function getScholarships() {
  return SOURCE_OF_TRUTH.scholarships;
}

export function getPolicies() {
  return SOURCE_OF_TRUTH.policies;
}

export function getModalities() {
  return SOURCE_OF_TRUTH.modalities;
}

export function getDocuments() {
  return SOURCE_OF_TRUTH.documents;
}

export function getAdmissionProcess() {
  return SOURCE_OF_TRUTH.admissionProcess;
}

export function getPaymentMethods() {
  return SOURCE_OF_TRUTH.paymentMethods;
}

export function getAdditionalCosts() {
  return SOURCE_OF_TRUTH.additionalCosts;
}

export function getContact() {
  return SOURCE_OF_TRUTH.contact;
}

export function getCatalogMeta() {
  return SOURCE_OF_TRUTH.catalogMeta;
}

export function getSafeRequirementsResponse() {
  return getPolicies().respuesta_requisitos_especificos_ss_practicas;
}

export function findScholarshipTier(promedio) {
  if (promedio === null || promedio === undefined || Number.isNaN(promedio)) return null;
  return getScholarships().find(
    (t) => promedio >= t.promedio_min && promedio <= t.promedio_max,
  ) || null;
}
