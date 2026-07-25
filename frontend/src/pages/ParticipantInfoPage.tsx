import { useNavigate } from "react-router-dom";
import { useCollection } from "../state/CollectionContext";
import { LEARNING_DURATION_LABELS, PROFICIENCY_LABELS } from "../lib/constants";
import type { KoreanBackground, LearningDuration, Proficiency } from "../lib/types";

const KOREAN_BACKGROUND_OPTIONS: Array<{ value: KoreanBackground; label: string }> = [
  { value: "native", label: "Native Korean speaker" },
  { value: "learner", label: "Learning Korean as a foreign language" },
];

const LEARNING_DURATION_OPTIONS = Object.entries(LEARNING_DURATION_LABELS) as Array<[LearningDuration, string]>;
const PROFICIENCY_OPTIONS = Object.entries(PROFICIENCY_LABELS) as Array<[Proficiency, string]>;

export function ParticipantInfoPage() {
  const navigate = useNavigate();
  const { writerId, writerInfo, setWriterInfo } = useCollection();

  const needsLearningDuration = writerInfo.koreanBackground === "learner";
  const needsProficiency = writerInfo.koreanBackground === "learner";
  const canContinue =
    writerInfo.koreanBackground !== null &&
    writerInfo.proficiency !== null &&
    (!needsLearningDuration || writerInfo.learningDuration !== null);

  return (
    <div className="page">
      <div className="page-content">
        <h1>Participant Information</h1>
        <p className="text-muted">
          Your anonymous writer ID: <strong className="selectable">{writerId}</strong>. No name, email, or other identifying information is
          collected.
        </p>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="field-label">Korean language background</span>
            <div className="radio-group">
              {KOREAN_BACKGROUND_OPTIONS.map((option) => (
                <label className="radio-option" key={option.value}>
                  <input
                    type="radio"
                    name="korean-background"
                    checked={writerInfo.koreanBackground === option.value}
                    onChange={() =>
                      setWriterInfo({
                        koreanBackground: option.value,
                        learningDuration: option.value === "learner" ? writerInfo.learningDuration : null,
                        proficiency: option.value === "native" ? "native" : null,
                      })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {needsLearningDuration && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="field-label">How long have you studied Korean?</span>
              <div className="radio-group">
                {LEARNING_DURATION_OPTIONS.map(([value, label]) => (
                  <label className="radio-option" key={value}>
                    <input
                      type="radio"
                      name="learning-duration"
                      checked={writerInfo.learningDuration === value}
                      onChange={() => setWriterInfo({ learningDuration: value })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {needsProficiency && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="field-label">Current Korean proficiency</span>
              <div className="radio-group">
                {PROFICIENCY_OPTIONS.map(([value, label]) => (
                  <label className="radio-option" key={value}>
                    <input
                      type="radio"
                      name="proficiency"
                      checked={writerInfo.proficiency === value}
                      onChange={() => setWriterInfo({ proficiency: value })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              className="button"
              disabled={!canContinue}
              onClick={() => navigate("/collect")}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
