import { useCallback, useRef, useState } from "react";
import { drawSegment, drawStrokes, paintWhiteBackground } from "../components/canvas/canvasDrawing";
import { useInputMode } from "./useInputMode";
import type { Stroke, StrokePoint } from "../lib/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isAcceptedPointerType(pointerType: string, acceptAnyInput: boolean): boolean {
  return pointerType === "pen" || acceptAnyInput;
}

interface UseStrokeRecorderOptions {
  width: number;
  height: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStrokeStart?: () => void;
}

export interface StrokeRecorder {
  strokes: Stroke[];
  hasPenInput: boolean;
  firstEventTimestamp: number | null;
  lastEventTimestamp: number | null;
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  undoLastStroke: () => void;
  clear: () => void;
  restoreStrokes: (strokes: Stroke[]) => void;
}

/**
 * Records raw pointer events into StrokePoint sequences. By default, only
 * pointerType "pen" creates or extends a stroke, since this app collects
 * genuine online handwriting stroke data — touch and mouse are ignored.
 * The input-mode preference (lib/inputPreferences.ts, toggleable via the
 * on-screen checkbox) can widen this to accept any pointer type; every
 * point still records its own true `pointerType`, so nothing is ever
 * mislabeled regardless of which mode is active.
 *
 * Ink is painted synchronously inside these handlers (not via a React
 * effect reacting to state) so there's zero round-trip through React's
 * render cycle between the physical pen moving and the ink appearing.
 * High-frequency input (Apple Pencil on a ProMotion iPad can report well
 * over 100 events/sec) made a state-driven full-canvas redraw per point
 * visibly laggy; a `strokes` ref mirrors the state for this synchronous
 * path, while the state itself still drives everything else (React
 * consumers, validation, IndexedDB persistence).
 */
export function useStrokeRecorder({ width, height, canvasRef, onStrokeStart }: UseStrokeRecorderOptions): StrokeRecorder {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [hasPenInput, setHasPenInput] = useState(false);
  const [acceptAnyInput] = useInputMode();
  const strokesRef = useRef<Stroke[]>([]);
  const lastPointRef = useRef<StrokePoint | null>(null);
  const nextStrokeIdRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const firstEventTimestampRef = useRef<number | null>(null);
  const lastEventTimestampRef = useRef<number | null>(null);

  const getContext = useCallback((): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext("2d") ?? null;
  }, [canvasRef]);

  const toLocalPoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>, strokeId: number, kind: StrokePoint["event"]): StrokePoint => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left, 0, width);
      const y = clamp(event.clientY - rect.top, 0, height);

      if (firstEventTimestampRef.current === null) {
        firstEventTimestampRef.current = event.timeStamp;
      }
      lastEventTimestampRef.current = event.timeStamp;

      return {
        x,
        y,
        timestamp: event.timeStamp,
        relative_time: event.timeStamp - firstEventTimestampRef.current,
        pressure: event.pressure,
        tiltX: event.tiltX ?? 0,
        tiltY: event.tiltY ?? 0,
        twist: event.twist ?? 0,
        pointerType: event.pointerType,
        stroke_id: strokeId,
        event: kind,
      };
    },
    [width, height],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isAcceptedPointerType(event.pointerType, acceptAnyInput)) return;
      event.preventDefault();

      event.currentTarget.setPointerCapture(event.pointerId);
      activePointerIdRef.current = event.pointerId;
      setHasPenInput(true);
      onStrokeStart?.();

      const strokeId = nextStrokeIdRef.current;
      nextStrokeIdRef.current += 1;
      const point = toLocalPoint(event, strokeId, "down");

      const next = [...strokesRef.current, [point]];
      strokesRef.current = next;
      setStrokes(next);
      lastPointRef.current = point;
      // No dot drawn here on purpose: the first line segment (drawn on the
      // next move/up) starts from this exact point with a round cap, which
      // already renders as a dot for a stationary tap. Drawing a separate
      // dot here on top of that cap doubled up as a visibly bolder blob at
      // the start of every single stroke.
    },
    [onStrokeStart, toLocalPoint, acceptAnyInput],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isAcceptedPointerType(event.pointerType, acceptAnyInput)) return;
      if (activePointerIdRef.current !== event.pointerId) return;
      event.preventDefault();

      const current = strokesRef.current;
      if (current.length === 0) return;

      const strokeId = nextStrokeIdRef.current - 1;
      const point = toLocalPoint(event, strokeId, "move");
      const lastStroke = current[current.length - 1];
      const next = [...current.slice(0, -1), [...lastStroke, point]];
      strokesRef.current = next;
      setStrokes(next);

      const ctx = getContext();
      if (ctx && lastPointRef.current) drawSegment(ctx, lastPointRef.current, point);
      lastPointRef.current = point;
    },
    [toLocalPoint, getContext, acceptAnyInput],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isAcceptedPointerType(event.pointerType, acceptAnyInput)) return;
      if (activePointerIdRef.current !== event.pointerId) return;
      event.preventDefault();

      // Release capture immediately, before any other bookkeeping, so the
      // browser is free to start dispatching the *next* pointerdown (e.g.
      // the following stroke) as soon as possible. On iOS, an Apple Pencil
      // lift-then-touch-down-again was showing a noticeable delay before
      // the new stroke was recognized — releasing capture late was one
      // plausible source of that, so this is now the very first thing we do.
      event.currentTarget.releasePointerCapture(event.pointerId);
      activePointerIdRef.current = null;

      const current = strokesRef.current;
      if (current.length > 0) {
        const strokeId = nextStrokeIdRef.current - 1;
        const point = toLocalPoint(event, strokeId, "up");
        const lastStroke = current[current.length - 1];
        const next = [...current.slice(0, -1), [...lastStroke, point]];
        strokesRef.current = next;
        setStrokes(next);

        const ctx = getContext();
        if (ctx && lastPointRef.current) drawSegment(ctx, lastPointRef.current, point);
      }

      lastPointRef.current = null;
    },
    [toLocalPoint, getContext, acceptAnyInput],
  );

  const undoLastStroke = useCallback(() => {
    const next = strokesRef.current.slice(0, -1);
    strokesRef.current = next;
    setStrokes(next);
    lastPointRef.current = null;

    const ctx = getContext();
    if (ctx) drawStrokes(ctx, next, width, height);
  }, [getContext, width, height]);

  const clear = useCallback(() => {
    strokesRef.current = [];
    setStrokes([]);
    nextStrokeIdRef.current = 0;
    activePointerIdRef.current = null;
    firstEventTimestampRef.current = null;
    lastEventTimestampRef.current = null;
    lastPointRef.current = null;

    const ctx = getContext();
    if (ctx) paintWhiteBackground(ctx, width, height);
  }, [getContext, width, height]);

  const restoreStrokes = useCallback(
    (restored: Stroke[]) => {
      strokesRef.current = restored;
      setStrokes(restored);
      setHasPenInput(restored.length > 0);
      activePointerIdRef.current = null;
      lastPointRef.current = null;

      const allPoints = restored.flat();
      if (allPoints.length === 0) {
        nextStrokeIdRef.current = 0;
        firstEventTimestampRef.current = null;
        lastEventTimestampRef.current = null;
      } else {
        nextStrokeIdRef.current = Math.max(...allPoints.map((p) => p.stroke_id)) + 1;
        firstEventTimestampRef.current = Math.min(...allPoints.map((p) => p.timestamp - p.relative_time));
        lastEventTimestampRef.current = Math.max(...allPoints.map((p) => p.timestamp));
      }

      const ctx = getContext();
      if (ctx) drawStrokes(ctx, restored, width, height);
    },
    [getContext, width, height],
  );

  return {
    strokes,
    hasPenInput,
    firstEventTimestamp: firstEventTimestampRef.current,
    lastEventTimestamp: lastEventTimestampRef.current,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    undoLastStroke,
    clear,
    restoreStrokes,
  };
}
