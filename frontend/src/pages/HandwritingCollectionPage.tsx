import { useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { SingleLineCanvasHandle } from "../components/canvas/SingleLineCanvas";
import { SentenceBlock } from "../components/SentenceBlock";
import { useCollection } from "../state/CollectionContext";
import { SENTENCE_NUMBERS } from "../lib/constants";
import { validateSample } from "../lib/validation";
import { sampleKey } from "../lib/types";
import type { WritingStyle } from "../lib/types";

export function HandwritingCollectionPage() {
  const navigate = useNavigate();
  const { writerInfo, samples, setSampleDraft } = useCollection();
  const canvasRefs = useRef<Record<string, SingleLineCanvasHandle | null>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);

  const isProfileComplete =
    writerInfo.consent && writerInfo.koreanBackground !== null && writerInfo.proficiency !== null;

  const registerHandle = useMemo(
    () =>
      (sentenceNumber: 1 | 2 | 3) =>
      (writingStyle: WritingStyle, handle: SingleLineCanvasHandle | null) => {
        canvasRefs.current[sampleKey(sentenceNumber, writingStyle)] = handle;
      },
    [],
  );

  if (!isProfileComplete) {
    return <Navigate to="/participant-info" replace />;
  }

  const handleSubmit = async () => {
    const collectedErrors: string[] = [];

    for (const sentenceNumber of SENTENCE_NUMBERS) {
      for (const writingStyle of ["neat", "regular"] as WritingStyle[]) {
        const draft = samples[sampleKey(sentenceNumber, writingStyle)];
        const { errors: sampleErrors } = validateSample(draft?.strokes ?? [], 1400, 160);
        for (const message of sampleErrors) {
          collectedErrors.push(`Sentence ${sentenceNumber} (${writingStyle === "neat" ? "neat" : "regular speed"}): ${message}`);
        }
      }
    }

    setErrors(collectedErrors);
    if (collectedErrors.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsPreparing(true);
    try {
      for (const sentenceNumber of SENTENCE_NUMBERS) {
        for (const writingStyle of ["neat", "regular"] as WritingStyle[]) {
          const key = sampleKey(sentenceNumber, writingStyle);
          const handle = canvasRefs.current[key];
          const draft = samples[key];
          if (!handle || !draft) continue;
          const pngDataUrl = await handle.exportPng();
          setSampleDraft(sentenceNumber, writingStyle, { ...draft, pngDataUrl });
        }
      }
      navigate("/upload");
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="page">
      <div className="page-content page-content--wide">
        <h1>Handwriting Collection</h1>
        <p className="text-muted">
          Please write each sentence exactly as shown, once neatly and once at your regular writing speed. Write on a
          single line, using the faint guideline as a reference.
        </p>

        {errors.length > 0 && (
          <div className="banner banner--error" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
        )}

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {SENTENCE_NUMBERS.map((sentenceNumber) => (
            <SentenceBlock key={sentenceNumber} sentenceNumber={sentenceNumber} registerHandle={registerHandle(sentenceNumber)} />
          ))}
        </div>

        <div>
          <button type="button" className="button" onClick={handleSubmit} disabled={isPreparing}>
            {isPreparing ? "Preparing…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
