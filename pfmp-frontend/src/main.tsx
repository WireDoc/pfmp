import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// Wave 25 Phase D — load authToken first so its window.fetch monkey-patch
// installs before any module-scope fetch call could fire. The patch injects
// Authorization: Bearer for any request targeting our own API origin (no-op
// for external hosts like Microsoft Graph or RSS feeds).
import "./services/authToken";
import { AppRouter } from "./AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { OnboardingProvider } from "./onboarding/OnboardingContext";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { pfmpTheme } from "./theme/pfmpTheme";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={pfmpTheme}>
      <CssBaseline />
      <AuthProvider>
        <OnboardingProvider>
          <AppRouter />
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
