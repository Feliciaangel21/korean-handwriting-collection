import { describe, expect, it } from "vitest";
import { computeBoundingBox, countPoints, looksMultiRow, validateSample } from "./validation";
import type { Stroke, StrokePoint } from "./types";

function makePoint(x: number, y: number, overrides: Partial<StrokePoint> = {}): StrokePoint {
  return {
    x,
    y,
    timestamp: 0,
    relative_time: 0,
    pressure: 0.5,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: "pen",
    stroke_id: 0,
    event: "move",
    ...overrides,
  };
}

describe("computeBoundingBox", () => {
  it("returns a zeroed box for no strokes", () => {
    expect(computeBoundingBox([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });

  it("computes the bounding box across strokes", () => {
    const strokes: Stroke[] = [
      [makePoint(10, 20), makePoint(30, 5)],
      [makePoint(40, 50)],
    ];
    expect(computeBoundingBox(strokes)).toEqual({ minX: 10, minY: 5, maxX: 40, maxY: 50 });
  });
});

describe("countPoints", () => {
  it("sums points across all strokes", () => {
    const strokes: Stroke[] = [[makePoint(0, 0), makePoint(1, 1)], [makePoint(2, 2)]];
    expect(countPoints(strokes)).toBe(3);
  });
});

describe("validateSample", () => {
  it("rejects an empty canvas", () => {
    const { errors } = validateSample([]);
    expect(errors).toContain("Canvas is empty. Please write the sentence before continuing.");
  });

  it("rejects too few points", () => {
    const strokes: Stroke[] = [[makePoint(10, 10), makePoint(11, 11)]];
    const { errors } = validateSample(strokes);
    expect(errors.some((e) => e.includes("Too few points"))).toBe(true);
  });

  it("rejects points outside canvas bounds", () => {
    const strokes: Stroke[] = [[makePoint(10, 10), makePoint(20, 20), makePoint(2000, 20), makePoint(40, 20), makePoint(50, 20)]];
    const { errors } = validateSample(strokes, 1400, 160);
    expect(errors.some((e) => e.includes("outside the canvas"))).toBe(true);
  });

  it("accepts a valid single-line stroke with no warnings", () => {
    const strokes: Stroke[] = [[makePoint(10, 80), makePoint(50, 82), makePoint(100, 81), makePoint(150, 80), makePoint(200, 80)]];
    const { errors, warnings } = validateSample(strokes, 1400, 160);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("warns when writing occupies nearly the full canvas height", () => {
    const strokes: Stroke[] = [[makePoint(10, 5), makePoint(20, 155), makePoint(30, 80), makePoint(40, 10), makePoint(50, 150)]];
    const { warnings } = validateSample(strokes, 1400, 160);
    expect(warnings.some((w) => w.includes("entire canvas height"))).toBe(true);
  });
});

describe("looksMultiRow", () => {
  it("detects two vertically separated bands of strokes", () => {
    const topRow: Stroke = [makePoint(10, 20), makePoint(20, 20), makePoint(30, 20)];
    const bottomRow: Stroke = [makePoint(10, 140), makePoint(20, 140), makePoint(30, 140)];
    expect(looksMultiRow([topRow, bottomRow], 160)).toBe(true);
  });

  it("does not flag strokes within a single row", () => {
    const rowA: Stroke = [makePoint(10, 75), makePoint(20, 75)];
    const rowB: Stroke = [makePoint(30, 85), makePoint(40, 85)];
    expect(looksMultiRow([rowA, rowB], 160)).toBe(false);
  });
});
