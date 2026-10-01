import type { Plugin } from "vite";
import { COMPARISON_PAGES } from "./src/lib/seoComparisons";
import { getNoindexSeoRoutes } from "./src/lib/seoStatic";

const VIRTUAL_ID = "virtual:seo-route-manifest";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/**
 * Exposes the few route lists the client needs (noindex paths, comparison
 * slugs) as a build-time virtual module, so the full SEO page data — and the
 * English locale it pulls in — stays out of the browser's entry bundle.
 */
export function seoRouteManifestPlugin(): Plugin {
  return {
    name: "seo-route-manifest",
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const manifest = {
        noindexPaths: {
          cykelhjalpen: getNoindexSeoRoutes("cykelhjalpen").map((route) => route.path),
          updro: getNoindexSeoRoutes("updro").map((route) => route.path),
        },
        comparisonSlugs: COMPARISON_PAGES.map((page) => page.slug),
      };
      return `export default ${JSON.stringify(manifest)};`;
    },
  };
}
