import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { useStrokeRecorder } from "../../hooks/useStrokeRecorder";
import { canvasToPngDataUrl } from "../../hooks/usePngExporter";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../lib/constants";
import { computeBoundingBox, countPoints } from "../../lib/validation";
import type { Stroke } from "../../lib/types";

export interface SingleLineCanvasSnapshot {
  strokes: Stroke[];
  pointCount: number;
  strokeCount: number;
  boundingBox: ReturnType<typeof computeBoundingBox>;
  durationMs: number;
}

export interface SingleLineCanvasHandle {
  undoLastStroke: () => void;
  clear: () => void;
  getSnapshot: () => SingleLineCanvasSnapshot;
  exportPng: () => Promise<string>;
  loadStrokes: (strokes: Stroke[]) => void;
}

interface SingleLineCanvasProps {
  width?: number;
  height?: number;
  showGuideline?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onStrokesChange?: (snapshot: SingleLineCanvasSnapshot) => void;
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#000000";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i += 1) {
      const prev = stroke[i - 1];
      const curr = stroke[i];
      const pressure = curr.pressure > 0 ? curr.pressure : 0.5;
      ctx.lineWidth = Math.min(4.5, Math.max(1.2, pressure * 3.2));
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    if (stroke.length === 1) {
      // A single tap-and-release: render a dot so it isn't invisible.
      const point = stroke[0];
      ctx.beginPath();
      ctx.fillStyle = "#000000";
      ctx.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export const SingleLineCanvas = forwardRef<SingleLineCanvasHandle, SingleLineCanvasProps>(
  function SingleLineCanvas(
    { width = CANVAS_WIDTH, height = CANVAS_HEIGHT, showGuideline = true, disabled = false, ariaLabel, onStrokesChange },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const recorder = useStrokeRecorder({ width, height });

    // Set up the backing bitmap once per logical size (accounts for device
    // pixel ratio so ink renders crisply); the guideline is a separate DOM
    // overlay and never touches this bitmap, so PNG export stays clean.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        drawStrokes(ctx, recorder.strokes, width, height);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;
      drawStrokes(ctx, recorder.strokes, width, height);
    }, [recorder.strokes, width, height]);

    useEffect(() => {
      const boundingBox = computeBoundingBox(recorder.strokes);
      const pointCount = countPoints(recorder.strokes);
      const durationMs =
        recorder.firstEventTimestamp !== null && recorder.lastEventTimestamp !== null
          ? Math.round(recorder.lastEventTimestamp - recorder.firstEventTimestamp)
          : 0;
      onStrokesChange?.({
        strokes: recorder.strokes,
        pointCount,
        strokeCount: recorder.strokes.length,
        boundingBox,
        durationMs,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recorder.strokes]);

    useImperativeHandle(
      ref,
      () => ({
        undoLastStroke: recorder.undoLastStroke,
        clear: recorder.clear,
        getSnapshot: () => {
          const boundingBox = computeBoundingBox(recorder.strokes);
          const durationMs =
            recorder.firstEventTimestamp !== null && recorder.lastEventTimestamp !== null
              ? Math.round(recorder.lastEventTimestamp - recorder.firstEventTimestamp)
              : 0;
          return {
            strokes: recorder.strokes,
            pointCount: countPoints(recorder.strokes),
            strokeCount: recorder.strokes.length,
            boundingBox,
            durationMs,
          };
        },
        exportPng: async () => {
          const canvas = canvasRef.current;
          if (!canvas) throw new Error("Canvas is not mounted.");
          return canvasToPngDataUrl(canvas);
        },
        loadStrokes: recorder.restoreStrokes,
      }),
      [recorder],
    );

    const wrapForPen = useCallback(
      <E,>(handler: (event: E) => void) =>
        (event: E) => {
          if (disabled) return;
          handler(event);
        },
      [disabled],
    );

    return (
      <div className="canvas-scroll-wrapper">
        <div className="canvas-stage" style={{ width, height }}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={ariaLabel}
            onPointerDown={wrapForPen(recorder.handlePointerDown)}
            onPointerMove={wrapForPen(recorder.handlePointerMove)}
            onPointerUp={wrapForPen(recorder.handlePointerUp)}
            onPointerCancel={wrapForPen(recorder.handlePointerUp)}
          />
          {showGuideline && <div className="canvas-guideline" aria-hidden="true" />}
        </div>
      </div>
    );
  },
);
