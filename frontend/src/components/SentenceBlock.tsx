import { useEffect, useRef, useState } from "react";
import { CanvasControls } from "./canvas/CanvasControls";
import { SingleLineCanvas, type SingleLineCanvasHandle, type SingleLineCanvasSnapshot } from "./canvas/SingleLineCanvas";
import { useCollection } from "../state/CollectionContext";
import { SENTENCES } from "../lib/constants";
import { validateSample } from "../lib/validation";
import type { SampleDraft, SentenceNumber, WritingStyle } from "../lib/types";
import { sampleKey } from "../lib/types";

export interface SentenceBlockHandles {
  neat: SingleLineCanvasHandle | null;
  regular: SingleLineCanvasHandle | null;
}

interface SentenceBlockProps {
  sentenceNumber: SentenceNumber;
  registerHandle: (writingStyle: WritingStyle, handle: SingleLineCanvasHandle | null) => void;
}

function slotLabel(writingStyle: WritingStyle): string {
  return writingStyle === "neat" ? "Neatly written" : "Your regular writing speed";
}

function CanvasSlot({
  sentenceNumber,
  writingStyle,
  registerHandle,
}: {
  sentenceNumber: SentenceNumber;
  writingStyle: WritingStyle;
  registerHandle: (handle: SingleLineCanvasHandle | null) => void;
}) {
  const { samples, setSampleDraft } = useCollection();
  const handleRef = useRef<SingleLineCanvasHandle | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const hasLoadedDraftRef = useRef(false);

  const key = sampleKey(sentenceNumber, writingStyle);
  const existingDraft = samples[key];

  useEffect(() => {
    if (hasLoadedDraftRef.current) return;
    if (existingDraft && existingDraft.strokes.length > 0 && handleRef.current) {
      handleRef.current.loadStrokes(existingDraft.strokes);
      hasLoadedDraftRef.current = true;
    }
  }, [existingDraft]);

  const handleStrokesChange = (snapshot: SingleLineCanvasSnapshot) => {
    const draft: SampleDraft = {
      sentenceNumber,
      writingStyle,
      strokes: snapshot.strokes,
      canvasWidth: 1400,
      canvasHeight: 160,
      strokeCount: snapshot.strokeCount,
      pointCount: snapshot.pointCount,
      durationMs: snapshot.durationMs,
      boundingBox: snapshot.boundingBox,
    };
    setSampleDraft(sentenceNumber, writingStyle, draft);

    if (snapshot.strokeCount === 0) {
      setWarnings([]);
      return;
    }
    const { warnings: nextWarnings } = validateSample(snapshot.strokes, draft.canvasWidth, draft.canvasHeight);
    setWarnings(nextWarnings);
  };

  return (
    <div className="canvas-slot">
      <span className="canvas-slot-label">{slotLabel(writingStyle)}</span>
      <SingleLineCanvas
        ref={(handle) => {
          handleRef.current = handle;
          registerHandle(handle);
        }}
        ariaLabel={`${slotLabel(writingStyle)} handwriting canvas for sentence ${sentenceNumber}`}
        onStrokesChange={handleStrokesChange}
      />
      <CanvasControls
        onUndo={() => handleRef.current?.undoLastStroke()}
        onClear={() => {
          handleRef.current?.clear();
          setWarnings([]);
        }}
      />
      {warnings.map((warning) => (
        <div key={warning} className="banner banner--warning">
          {warning}
        </div>
      ))}
    </div>
  );
}

export function SentenceBlock({ sentenceNumber, registerHandle }: SentenceBlockProps) {
  return (
    <div className="sentence-block">
      <p className="sentence-text">{SENTENCES[sentenceNumber]}</p>
      <CanvasSlot
        sentenceNumber={sentenceNumber}
        writingStyle="neat"
        registerHandle={(handle) => registerHandle("neat", handle)}
      />
      <CanvasSlot
        sentenceNumber={sentenceNumber}
        writingStyle="regular"
        registerHandle={(handle) => registerHandle("regular", handle)}
      />
    </div>
  );
}
