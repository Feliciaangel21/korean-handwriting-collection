import { useCallback, useRef, useState } from "react";
import type { Stroke, StrokePoint } from "../lib/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface UseStrokeRecorderOptions {
  width: number;
  height: number;
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
 * Records raw pointer events into StrokePoint sequences. Only pointerType
 * "pen" ever creates or extends a stroke — touch and mouse input are
 * ignored entirely, per the stylus-only data collection requirement.
 */
export function useStrokeRecorder({ width, height, onStrokeStart }: UseStrokeRecorderOptions): StrokeRecorder {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [hasPenInput, setHasPenInput] = useState(false);
  const nextStrokeIdRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const firstEventTimestampRef = useRef<number | null>(null);
  const lastEventTimestampRef = useRef<number | null>(null);

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
      if (event.pointerType !== "pen") return;

      event.currentTarget.setPointerCapture(event.pointerId);
      activePointerIdRef.current = event.pointerId;
      setHasPenInput(true);
      onStrokeStart?.();

      const strokeId = nextStrokeIdRef.current;
      nextStrokeIdRef.current += 1;
      const point = toLocalPoint(event, strokeId, "down");
      setStrokes((prev) => [...prev, [point]]);
    },
    [onStrokeStart, toLocalPoint],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType !== "pen") return;
      if (activePointerIdRef.current !== event.pointerId) return;

      const strokeId = nextStrokeIdRef.current - 1;
      const point = toLocalPoint(event, strokeId, "move");

      setStrokes((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.slice(0, -1);
        next.push([...prev[prev.length - 1], point]);
        return next;
      });
    },
    [toLocalPoint],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType !== "pen") return;
      if (activePointerIdRef.current !== event.pointerId) return;

      const strokeId = nextStrokeIdRef.current - 1;
      const point = toLocalPoint(event, strokeId, "up");
      setStrokes((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.slice(0, -1);
        next.push([...prev[prev.length - 1], point]);
        return next;
      });

      event.currentTarget.releasePointerCapture(event.pointerId);
      activePointerIdRef.current = null;
    },
    [toLocalPoint],
  );

  const undoLastStroke = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setStrokes([]);
    nextStrokeIdRef.current = 0;
    activePointerIdRef.current = null;
    firstEventTimestampRef.current = null;
    lastEventTimestampRef.current = null;
  }, []);

  const restoreStrokes = useCallback((restored: Stroke[]) => {
    setStrokes(restored);
    setHasPenInput(restored.length > 0);
    activePointerIdRef.current = null;

    const allPoints = restored.flat();
    if (allPoints.length === 0) {
      nextStrokeIdRef.current = 0;
      firstEventTimestampRef.current = null;
      lastEventTimestampRef.current = null;
      return;
    }

    nextStrokeIdRef.current = Math.max(...allPoints.map((p) => p.stroke_id)) + 1;
    firstEventTimestampRef.current = Math.min(...allPoints.map((p) => p.timestamp - p.relative_time));
    lastEventTimestampRef.current = Math.max(...allPoints.map((p) => p.timestamp));
  }, []);

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
