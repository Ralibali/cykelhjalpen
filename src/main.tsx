import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root")!;

// The build writes SEO fallback HTML into #root for crawlers.
// It is not a React-rendered tree, so hydrating it can leave visitors stuck on the fallback.
// Always clear the fallback and mount the real app for users.
rootEl.replaceChildren();
createRoot(rootEl).render(<App />);
