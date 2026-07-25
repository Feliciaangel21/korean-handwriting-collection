import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page-content">
        <div className="card" style={{ textAlign: "center", gap: 24, display: "flex", flexDirection: "column" }}>
          <div className="mascot-dock">
            <span className="mascot-walk" aria-hidden="true" />
          </div>
          <h1>Korean Handwriting Data Collection Study</h1>
          <p className="text-muted">
            Thank you for considering participation in this research study. We are collecting online handwriting
            stroke data, including pen movements, pressure, and timing, to help build a future Korean handwriting
            recognition system.
          </p>
          <p className="text-muted">
            This is a data collection study only. No handwriting recognition or grading happens here. Your writing
            is simply recorded for research purposes.
          </p>
          <p className="text-muted">The session takes about 5–10 minutes and requires a stylus (pen input device).</p>
          <div>
            <button type="button" className="button" onClick={() => navigate("/consent")}>
              Begin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
