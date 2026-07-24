import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollection } from "../state/CollectionContext";

export function ConsentPage() {
  const navigate = useNavigate();
  const { setWriterInfo } = useCollection();
  const [agreed, setAgreed] = useState(false);

  const handleContinue = () => {
    setWriterInfo({ consent: true });
    navigate("/participant-info");
  };

  return (
    <div className="page">
      <div className="page-content">
        <h1>Consent to Participate</h1>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p>Before continuing, please review what this study collects and how your data will be used.</p>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>This research collects handwriting data written with a stylus.</li>
            <li>
              We record stroke coordinates, timestamps, pen pressure, and images of your handwriting.
            </li>
            <li>
              We do <strong>not</strong> collect any personal identifiers such as your name, email address, phone
              number, or student ID. You will be identified only by an anonymous, randomly generated writer code.
            </li>
            <li>Your data will be used only for research purposes related to handwriting recognition.</li>
            <li>Participation is voluntary and you may stop at any time before final submission.</li>
          </ul>
          <label className="radio-option">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>I have read the information above and I agree to participate in this study.</span>
          </label>
          <div>
            <button type="button" className="button" disabled={!agreed} onClick={handleContinue}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
