import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n/I18n";
import { PlaceProvider } from "./lib/place";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/theme.css";
import "./styles/tsukuyomi.css";
import { installPunjabiDates } from "./lib/paDates";
installPunjabiDates();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider><PlaceProvider><App /></PlaceProvider></I18nProvider>
  </StrictMode>
);
