export const EMPTY_ACADEMIC_STATE = {
  current_intent: null,
  current_career: null,
  current_area: null,
  current_modality: null,
  last_career: null,
  last_question: null,
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
