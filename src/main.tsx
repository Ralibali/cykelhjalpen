import './lib/initGa4';
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { initGoogleAds } from "./lib/googleAds";
import { loadMessagesForLocation } from "./lib/i18n";
import { isChunkLoadError, tryReload } from "./lib/chunkReload";
import "./index.css";

window.addEventListener("error", (e) => {
  if (e?.message && isChunkLoadError(e.message)) tryReload();
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = (e?.reason && (e.reason.message || String(e.reason))) || "";
  if (isChunkLoadError(msg)) tryReload();
});

initGoogleAds();

// English pages need their message catalogue before the first render; Swedish
// pages resolve immediately. A stale chunk after a redeploy triggers the reload
// above; any other failure still renders, with t() falling back to Swedish.
loadMessagesForLocation()
  .catch((error) => {
    const msg = (error && (error.message || String(error))) || "";
    if (isChunkLoadError(msg)) tryReload();
    console.error("Could not load translations", error);
  })
  .finally(() => {
    const rootEl = document.getElementById("root")!;
    rootEl.replaceChildren();
    createRoot(rootEl).render(
      <AppErrorBoundary>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </AppErrorBoundary>
    );
  });
