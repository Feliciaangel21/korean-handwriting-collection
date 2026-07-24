export type KoreanBackground = "native" | "learner";

export type LearningDuration =
  | "lt_3_months"
  | "3_6_months"
  | "6_12_months"
  | "1_2_years"
  | "2_3_years"
  | "3_5_years"
  | "gt_5_years";

export type Proficiency = "beginner" | "intermediate" | "advanced" | "native";

export type WritingStyle = "neat" | "regular";

export type SentenceNumber = 1 | 2 | 3;

export type PointerEventKind = "down" | "move" | "up";

export interface StrokePoint {
  x: number;
  y: number;
  timestamp: number;
  relative_time: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  pointerType: string;
  stroke_id: number;
  event: PointerEventKind;
}

export type Stroke = StrokePoint[];

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SampleDraft {
  sentenceNumber: SentenceNumber;
  writingStyle: WritingStyle;
  strokes: Stroke[];
  canvasWidth: number;
  canvasHeight: number;
  strokeCount: number;
  pointCount: number;
  durationMs: number;
  boundingBox: BoundingBox;
  pngDataUrl?: string;
}

export interface WriterInfo {
  id: string; // UUID — the Postgres primary key, generated client-side
  anonymousCode: string; // short display label derived from `id`
  koreanBackground: KoreanBackground | null;
  learningDuration: LearningDuration | null;
  proficiency: Proficiency | null;
  consent: boolean;
}

export interface CollectionSession {
  writer: WriterInfo;
  samples: Record<string, SampleDraft>; // key: `${sentenceNumber}_${writingStyle}`
  updatedAt: number;
}

export function sampleKey(sentenceNumber: SentenceNumber, writingStyle: WritingStyle): string {
  return `${sentenceNumber}_${writingStyle}`;
}
