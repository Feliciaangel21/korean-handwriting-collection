import type { LearningDuration, Proficiency, SentenceNumber } from "./types";

/**
 * The three fixed handwriting sentences. These are hardcoded on purpose:
 * the dataset must be identical across every participant, so prompts are
 * never randomized, fetched from a backend, or editable.
 */
export const SENTENCES: Record<SentenceNumber, string> = {
  1: "젊은 학생은 값싼 종이에 “꽃잎은 꽤 짙다”라고 적었다.",
  2: "맑은 봄날, 아이가 밭둑 옆에서 쪽지를 접었다.",
  3: "형은 찻잔을 닦고 책을 책꽂이에 꽂았다.",
};

export const SENTENCE_NUMBERS: SentenceNumber[] = [1, 2, 3];

export const CANVAS_WIDTH = 1400;
export const CANVAS_HEIGHT = 160;

export const MIN_POINTS_PER_SAMPLE = 5;
export const MULTI_ROW_GAP_RATIO = 0.35;
export const FULL_HEIGHT_WARNING_RATIO = 0.85;

export const LEARNING_DURATION_LABELS: Record<LearningDuration, string> = {
  lt_3_months: "Less than 3 months",
  "3_6_months": "3–6 months",
  "6_12_months": "6 months–1 year",
  "1_2_years": "1–2 years",
  "2_3_years": "2–3 years",
  "3_5_years": "3–5 years",
  gt_5_years: "More than 5 years",
};

export const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  native: "Native",
};

export const WRITER_ID_STORAGE_KEY = "handwriting_writer_id";
