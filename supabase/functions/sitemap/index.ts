import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SITE_URL = "https://updro.se";
const today = () => new Date().toISOString().split("T")[0];

const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;
const headers = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
  "X-Robots-Tag": "noindex",
};

// ============ DATA ============

const staticPages = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/publicera", changefreq: "weekly", priority: "0.9" },
  { loc: "/byraer", changefreq: "weekly", priority: "0.8" },
  { loc: "/priser", changefreq: "weekly", priority: "0.8" },
  { loc: "/om-oss", changefreq: "monthly", priority: "0.6" },
  { loc: "/registrera/byra", changefreq: "monthly", priority: "0.7" },
  { loc: "/guider", changefreq: "weekly", priority: "0.7" },
  { loc: "/artiklar", changefreq: "weekly", priority: "0.8" },
  { loc: "/verktyg", changefreq: "weekly", priority: "0.8" },
  { loc: "/stader", changefreq: "weekly", priority: "0.8" },
  { loc: "/jamfor", changefreq: "weekly", priority: "0.8" },
  { loc: "/kunskapsbank", changefreq: "weekly", priority: "0.8" },
  { loc: "/integritetspolicy", changefreq: "monthly", priority: "0.3" },
  { loc: "/villkor", changefreq: "monthly", priority: "0.3" },
];

const pillars = [
  "webbutveckling", "ehandel", "digital-marknadsforing", "grafisk-design",
  "seo", "app-utveckling", "mjukvaruutveckling", "google-ads", "ux-ui-design", "ai-utveckling",
];

const subPages: Record<string, string[]> = {
  "webbutveckling": ["pris", "stockholm", "goteborg", "malmo", "uppsala", "byra", "startup", "react", "nextjs"],
  "ehandel": ["pris", "stockholm", "goteborg", "malmo", "byra"],
  "digital-marknadsforing": ["pris", "stockholm", "goteborg"],
  "grafisk-design": ["pris", "stockholm"],
  "seo": ["pris", "stockholm", "goteborg"],
  "app-utveckling": ["pris", "stockholm"],
};

const cities = [
  "stockholm", "goteborg", "malmo", "linkoping", "norrkoping", "orebro",
  "vasteras", "helsingborg", "jonkoping", "umea", "lund", "boras",
  "sundsvall", "gavle", "halmstad", "karlstad", "vaxjo", "kalmar",
  "skelleftea", "lulea", "pitea", "skovde", "angelholm", "falun",
];

const agencyCategories = [
  "digital-marknadsforing", "design", "grafisk-design", "seo", "reklam",
  "media", "kommunikation", "tryck", "fotografering", "e-handel", "pr", "webb",
];

const services = [
  "animering-animationer", "guerilla-marketing", "digital-marknadsforing",
  "seo-tjanster", "social-media-annonsering", "konverteringsoptimering",
  "affiliate-marknadsforing", "e-handel-marknadsforing", "data-migrering",
  "bokomslag-design", "albumomslag-design",
];

const knowledgeArticles = [
  "skapa-hemsida-med-egen-doman", "hjalp-med-hemsida", "konsult-marknadsforing",
  "hitta-grafisk-designer", "frilansa-som-designer", "kostnad-ny-hemsida",
];

const articles = ["vad-kostar-en-hemsida-2026", "basta-cms-2026", "wordpress-vs-webflow", "seo-guide-nyborjare"];
const tools = ["hemsida-pris-kalkylator", "kravspecifikation-mall"];
const comparisons = ["basta-seo-byran", "basta-webbyran", "basta-ehandel-byran", "basta-app-byran"];

// ============ HELPERS ============

const url = (loc: string, changefreq: string, priority: string) =>
  `  <url>\n    <loc>${SITE_URL}${loc}</loc>\n    <lastmod>${today()}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const wrapUrlset = (urls: string[]) =>
  `${xmlHeader}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

const wrapSitemapIndex = (sitemaps: string[]) => {
  const items = sitemaps.map((path) =>
    `  <sitemap>\n    <loc>${SITE_URL}${path}</loc>\n    <lastmod>${today()}</lastmod>\n  </sitemap>`
  );
  return `${xmlHeader}\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>`;
};

// ============ BUILDERS ============

const buildMain = () => {
  const urls: string[] = [];
  for (const p of staticPages) urls.push(url(p.loc, p.changefreq, p.priority));
  for (const slug of pillars) {
    urls.push(url(`/${slug}`, "weekly", "0.9"));
    const subs = subPages[slug];
    if (subs) for (const sub of subs) urls.push(url(`/${slug}/${sub}`, "monthly", "0.7"));
  }
  for (const slug of services) urls.push(url(`/leveranser/${slug}`, "monthly", "0.7"));
  for (const slug of comparisons) urls.push(url(`/${slug}`, "monthly", "0.8"));
  for (const slug of tools) urls.push(url(`/verktyg/${slug}`, "monthly", "0.7"));
  return wrapUrlset(urls);
};

const buildArticles = () => {
  const urls: string[] = [];
  for (const slug of articles) urls.push(url(`/artiklar/${slug}`, "monthly", "0.7"));
  for (const slug of knowledgeArticles) urls.push(url(`/kunskapsbank/${slug}`, "monthly", "0.7"));
  return wrapUrlset(urls);
};

const buildCities = () => {
  const urls: string[] = [];
  for (const city of cities) urls.push(url(`/stader/${city}`, "monthly", "0.7"));
  for (const city of cities) urls.push(url(`/byraer/${city}`, "weekly", "0.8"));
  for (const cat of agencyCategories) urls.push(url(`/byraer/kategori/${cat}`, "weekly", "0.8"));
  for (const city of cities) {
    for (const cat of agencyCategories) {
      urls.push(url(`/byraer/${city}/${cat}`, "monthly", "0.6"));
    }
  }
  return wrapUrlset(urls);
};

const buildIndex = () =>
  wrapSitemapIndex([
    "/sitemap-main.xml",
    "/sitemap-artiklar.xml",
    "/sitemap-stader.xml",
  ]);

// ============ ROUTER ============

serve(async (req) => {
  const path = new URL(req.url).pathname;

  if (path.endsWith("/sitemap-main.xml")) return new Response(buildMain(), { headers });
  if (path.endsWith("/sitemap-artiklar.xml")) return new Response(buildArticles(), { headers });
  if (path.endsWith("/sitemap-stader.xml")) return new Response(buildCities(), { headers });

  // Default: sitemap index
  return new Response(buildIndex(), { headers });
});
