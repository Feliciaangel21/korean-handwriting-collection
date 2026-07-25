import { useNavigate } from "react-router-dom";

export function ThankYouPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page-content">
        <div className="card" style={{ textAlign: "center", gap: 20, display: "flex", flexDirection: "column" }}>
          <h1>Thank You</h1>
          <p>
            Your handwriting samples have been submitted successfully. Thank you for contributing to this Korean
            handwriting recognition research study.
          </p>
          <p className="text-muted">You may now close this window, or write again below as a new participant.</p>
          <div>
            <button type="button" className="button" onClick={() => navigate("/")}>
              Write Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
