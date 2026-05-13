import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root")!;
rootEl.replaceChildren();
createRoot(rootEl).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
