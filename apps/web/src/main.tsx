import { Capacitor } from "@capacitor/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";

import App from "@/App";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/index.css";
import { applyTheme, getStoredTheme } from "@/lib/theme";

const el = document.getElementById("root");
if (!el) throw new Error("Root element missing");

const useHashRouter = Capacitor.isNativePlatform();

applyTheme(getStoredTheme());

createRoot(el).render(
  <StrictMode>
    <ThemeProvider>
      {useHashRouter ? (
        <HashRouter>
          <App />
        </HashRouter>
      ) : (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )}
    </ThemeProvider>
  </StrictMode>,
);
