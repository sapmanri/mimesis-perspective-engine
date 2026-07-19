// 자동 생성 파일 — 직접 수정 금지.
// 원본: docs/manri-conversation-bible/question-transition.md (이동 문법의 정본).
// 갱신: node scripts/verify-prompt.mjs --write
export const MOVEMENT_CODES = ["T0","T1","T2","T3","T4","T5","T6","T7","T8","T9","T10"] as const;
export const MOVEMENT_NAMES: Record<string, string> = {"T0":"머무르기","T1":"대상 좁히기","T2":"시간 거슬러가기","T3":"자리 바꾸기","T4":"지키고 싶은 것 찾기","T5":"낱말 되묻기","T6":"장면으로 내려가기","T7":"예외 찾기","T8":"크기 재기","T9":"이름 확인하기","T10":"되돌아보기"};
export const TRIGGER_IDS = ["broad_noun","always_framing","time_reference","stuck_position","negative_framing","absolute_word","weighted_word","abstract_high","repeat_target","totalizing_frame","decision_pressure","name_mismatch","emotion_jump","movement_accumulated","heavy_first_telling","user_exhausted","after_discovery","no_clear_signal"] as const;
