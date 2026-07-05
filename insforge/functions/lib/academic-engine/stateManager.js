export const EMPTY_ACADEMIC_STATE = {
  current_intent: null,
  current_career: null,
  current_area: null,
  current_modality: null,
  last_career: null,
  last_question: null,
  pending_attribute: null,
  last_objection: null,
  last_fallback_level: null,
  last_user_inbound_normalized: null,
  user_inbound_repeat_count: 0,
  last_outbound_text: null,
  fallback_count: 0,
};

export function updateAcademicState(prev, intent, entities, normalizedInput) {
  return {
    current_intent: intent,
    current_career: entities.careerName ?? prev.current_career,
    current_area: entities.area ?? prev.current_area,
    current_modality: entities.modality ?? prev.current_modality,
    last_career: entities.careerName ?? prev.last_career,
    last_question: normalizedInput ?? prev.last_question,
  };
}
