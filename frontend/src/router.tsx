import { createBrowserRouter } from "react-router-dom";
import { ConsentPage } from "./pages/ConsentPage";
import { HandwritingCollectionPage } from "./pages/HandwritingCollectionPage";
import { LandingPage } from "./pages/LandingPage";
import { ParticipantInfoPage } from "./pages/ParticipantInfoPage";
import { ThankYouPage } from "./pages/ThankYouPage";
import { UploadPage } from "./pages/UploadPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/consent", element: <ConsentPage /> },
  { path: "/participant-info", element: <ParticipantInfoPage /> },
  { path: "/collect", element: <HandwritingCollectionPage /> },
  { path: "/upload", element: <UploadPage /> },
  { path: "/thank-you", element: <ThankYouPage /> },
]);
