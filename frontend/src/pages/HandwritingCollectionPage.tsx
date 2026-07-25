import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { SingleLineCanvasHandle } from "../components/canvas/SingleLineCanvas";
import { SentenceBlock } from "../components/SentenceBlock";
import { ProgressStepper } from "../components/ProgressStepper";
import { useCollection } from "../state/CollectionContext";
import { SENTENCE_NUMBERS } from "../lib/constants";
import { validateSample } from "../lib/validation";
import { sampleKey } from "../lib/types";
import type { SampleDraft, SentenceNumber, WritingStyle } from "../lib/types";

const STYLES: WritingStyle[] = ["neat", "regular"];

function isStepComplete(samples: Record<string, SampleDraft>, sentenceNumber: SentenceNumber): boolean {
  return STYLES.every((style) => Boolean(samples[sampleKey(sentenceNumber, style)]?.pngDataUrl));
}

export function HandwritingCollectionPage() {
  const navigate = useNavigate();
  const { writerInfo, samples, setSampleDraft, isRecoveryLoading } = useCollection();
  const canvasRefs = useRef<Record<string, SingleLineCanvasHandle | null>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const hasResumedRef = useRef(false);

  const isProfileComplete =
    writerInfo.consent && writerInfo.koreanBackground !== null && writerInfo.proficiency !== null;

  // On refresh, resume at the first sentence that hasn't been confirmed yet
  // (rather than always restarting from sentence 1).
  useEffect(() => {
    if (isRecoveryLoading || hasResumedRef.current) return;
    hasResumedRef.current = true;
    const firstIncomplete = SENTENCE_NUMBERS.findIndex((n) => !isStepComplete(samples, n));
    setStepIndex(firstIncomplete === -1 ? SENTENCE_NUMBERS.length - 1 : firstIncomplete);
  }, [isRecoveryLoading, samples]);

  const registerHandle = useMemo(
    () =>
      (sentenceNumber: SentenceNumber) =>
      (writingStyle: WritingStyle, handle: SingleLineCanvasHandle | null) => {
        canvasRefs.current[sampleKey(sentenceNumber, writingStyle)] = handle;
      },
    [],
  );

  if (!isProfileComplete) {
    return <Navigate to="/participant-info" replace />;
  }

  const sentenceNumber = SENTENCE_NUMBERS[stepIndex];
  const isLastStep = stepIndex === SENTENCE_NUMBERS.length - 1;

  const handleNext = async () => {
    const stepErrors: string[] = [];
    for (const writingStyle of STYLES) {
      const draft = samples[sampleKey(sentenceNumber, writingStyle)];
      const { errors: sampleErrors } = validateSample(draft?.strokes ?? [], 1400, 160);
      for (const message of sampleErrors) {
        stepErrors.push(`${writingStyle === "neat" ? "Neatly written" : "Regular speed"}: ${message}`);
      }
    }

    setErrors(stepErrors);
    if (stepErrors.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsPreparing(true);
    try {
      for (const writingStyle of STYLES) {
        const key = sampleKey(sentenceNumber, writingStyle);
        const handle = canvasRefs.current[key];
        const draft = samples[key];
        if (!handle || !draft) continue;
        const pngDataUrl = await handle.exportPng();
        setSampleDraft(sentenceNumber, writingStyle, { ...draft, pngDataUrl });
      }

      if (isLastStep) {
        navigate("/upload");
      } else {
        setErrors([]);
        setStepIndex((i) => i + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setIsPreparing(false);
    }
  };

  const handleBack = () => {
    setErrors([]);
    setStepIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page">
      <div className="page-content page-content--wide">
        <h1>Handwriting Collection</h1>
        <ProgressStepper totalSteps={SENTENCE_NUMBERS.length} currentStep={stepIndex} />
        <p className="text-muted">
          Sentence {stepIndex + 1} of {SENTENCE_NUMBERS.length}. Please write it exactly as shown, once neatly and
          once at your regular writing speed, on a single line.
        </p>

        {errors.length > 0 && (
          <div className="banner banner--error" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
        )}

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <SentenceBlock
            key={sentenceNumber}
            sentenceNumber={sentenceNumber}
            registerHandle={registerHandle(sentenceNumber)}
          />
        </div>

        <div className="button-row">
          {stepIndex > 0 && (
            <button type="button" className="button button--secondary" onClick={handleBack} disabled={isPreparing}>
              Back
            </button>
          )}
          <button type="button" className="button" onClick={() => void handleNext()} disabled={isPreparing}>
            {isPreparing ? "Preparing…" : isLastStep ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
