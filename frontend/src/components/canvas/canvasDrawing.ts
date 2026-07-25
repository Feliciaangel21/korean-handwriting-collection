import type { Stroke, StrokePoint } from "../../lib/types";

const PEN_COLOR = "#000000";
const MIN_WIDTH = 1.2;
const MAX_WIDTH = 4.5;
const PRESSURE_SCALE = 3.2;
const DOT_RADIUS = 1.4;

function lineWidthForPressure(pressure: number, pointerType: string): number {
  // Genuine pen pressure is trusted as-is, including near zero — that's
  // what lets a stroke taper thin as the pencil lifts off, rather than
  // holding a constant mid-width right up to the round cap at the end
  // (which read as a bold "dot" stamped at every stroke's finish).
  // Non-pen input (mouse, or touch without real pressure) doesn't report
  // a meaningful pressure at all, so it falls back to a fixed mid-width.
  const effective = pointerType === "pen" ? pressure : pressure > 0 ? pressure : 0.5;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, effective * PRESSURE_SCALE));
}

export function paintWhiteBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
}

export function drawDot(ctx: CanvasRenderingContext2D, point: StrokePoint): void {
  ctx.beginPath();
  ctx.fillStyle = PEN_COLOR;
  ctx.arc(point.x, point.y, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSegment(ctx: CanvasRenderingContext2D, prev: StrokePoint, curr: StrokePoint): void {
  ctx.strokeStyle = PEN_COLOR;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lineWidthForPressure(curr.pressure, curr.pointerType);
  ctx.beginPath();
  ctx.moveTo(prev.x, prev.y);
  ctx.lineTo(curr.x, curr.y);
  ctx.stroke();
}

/** Full from-scratch repaint — only for clear/undo/recovery, never per-point. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], width: number, height: number): void {
  paintWhiteBackground(ctx, width, height);
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i += 1) {
      drawSegment(ctx, stroke[i - 1], stroke[i]);
    }
    if (stroke.length === 1) {
      drawDot(ctx, stroke[0]);
    }
  }
}
