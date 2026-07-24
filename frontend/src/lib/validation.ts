import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FULL_HEIGHT_WARNING_RATIO,
  MIN_POINTS_PER_SAMPLE,
  MULTI_ROW_GAP_RATIO,
} from "./constants";
import type { BoundingBox, Stroke } from "./types";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function computeBoundingBox(strokes: Stroke[]): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

export function countPoints(strokes: Stroke[]): number {
  return strokes.reduce((sum, stroke) => sum + stroke.length, 0);
}

export function validateSample(
  strokes: Stroke[],
  canvasWidth: number = CANVAS_WIDTH,
  canvasHeight: number = CANVAS_HEIGHT,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const pointCount = countPoints(strokes);

  if (strokes.length === 0 || pointCount === 0) {
    errors.push("Canvas is empty. Please write the sentence before continuing.");
    return { errors, warnings };
  }

  if (pointCount < MIN_POINTS_PER_SAMPLE) {
    errors.push("Too few points were recorded. Please write more carefully with the stylus.");
  }

  const outOfBounds = strokes.some((stroke) =>
    stroke.some((point) => point.x < 0 || point.x > canvasWidth || point.y < 0 || point.y > canvasHeight),
  );
  if (outOfBounds) {
    errors.push("Some strokes were drawn outside the canvas area.");
  }

  if (errors.length > 0) {
    return { errors, warnings };
  }

  const bbox = computeBoundingBox(strokes);
  const heightUsed = bbox.maxY - bbox.minY;
  if (heightUsed >= canvasHeight * FULL_HEIGHT_WARNING_RATIO) {
    warnings.push("Your writing occupies nearly the entire canvas height. Please try to write on a single line.");
  }

  if (looksMultiRow(strokes, canvasHeight)) {
    warnings.push("Your writing may span multiple rows. Please make sure it's a single line.");
  }

  return { errors, warnings };
}

export function looksMultiRow(strokes: Stroke[], canvasHeight: number = CANVAS_HEIGHT): boolean {
  if (strokes.length < 2) return false;

  const centers = strokes
    .filter((stroke) => stroke.length > 0)
    .map((stroke) => stroke.reduce((sum, p) => sum + p.y, 0) / stroke.length)
    .sort((a, b) => a - b);

  if (centers.length < 2) return false;

  const gapThreshold = canvasHeight * MULTI_ROW_GAP_RATIO;
  for (let i = 1; i < centers.length; i += 1) {
    if (centers[i] - centers[i - 1] > gapThreshold) {
      return true;
    }
  }
  return false;
}
