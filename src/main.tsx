import './lib/initGa4';
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { initGoogleAds } from "./lib/googleAds";
import { loadMessagesForLocation } from "./lib/i18n";
import "./index.css";

// Auto-recover from stale chunk hashes after a redeploy.
// When a dynamic import() fails because the hashed asset no longer exists,
// reload once to fetch the new index.html + chunk graph.
const isChunkLoadError = (msg: string) =>
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError/i.test(msg);

const tryReload = () => {
  try {
    const key = "__chunk_reload_at";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
};

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
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
  });
