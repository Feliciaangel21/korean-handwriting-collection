import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCollection } from "../state/CollectionContext";
import { SENTENCE_NUMBERS } from "../lib/constants";
import { sampleKey } from "../lib/types";
import type { WritingStyle } from "../lib/types";
import { submitToSupabase, UploadError } from "../lib/supabaseUpload";

type Status = "uploading" | "error" | "success";

export function UploadPage() {
  const navigate = useNavigate();
  const { writerInfo, samples, resetAfterSubmit } = useCollection();
  const [status, setStatus] = useState<Status>("uploading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  const allSamplesReady = SENTENCE_NUMBERS.every((sentenceNumber) =>
    (["neat", "regular"] as WritingStyle[]).every((style) => {
      const draft = samples[sampleKey(sentenceNumber, style)];
      return draft && draft.pngDataUrl;
    }),
  );

  const runUpload = useCallback(async () => {
    setStatus("uploading");
    setErrorMessage(null);
    try {
      await submitToSupabase(writerInfo, samples);
      setStatus("success");
      await resetAfterSubmit();
      navigate("/thank-you", { replace: true });
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof UploadError ? error.message : "Upload failed. Please check your connection and try again.",
      );
    }
  }, [writerInfo, samples, navigate, resetAfterSubmit]);

  useEffect(() => {
    if (hasStartedRef.current || !allSamplesReady) return;
    hasStartedRef.current = true;
    void runUpload();
  }, [allSamplesReady, runUpload]);

  if (!allSamplesReady) {
    return <Navigate to="/collect" replace />;
  }

  return (
    <div className="page">
      <div className="page-content">
        <h1>Uploading Your Handwriting Samples</h1>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {status === "uploading" && <p>Uploading your 6 handwriting samples. Please don't close this page…</p>}

          {status === "success" && <div className="banner banner--success">Upload complete. Redirecting…</div>}

          {status === "error" && (
            <>
              <div className="banner banner--error">
                {errorMessage} Your handwriting has not been lost — you can safely retry.
              </div>
              <div>
                <button type="button" className="button" onClick={() => void runUpload()}>
                  Retry Upload
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
