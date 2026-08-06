import { lazy, Suspense, useEffect } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import { COMPARISON_PAGES } from "./lib/seoComparisons";
import { getNoindexSeoRoutes } from "./lib/seoStatic";
import { getRobotsDirectiveForPath } from "./lib/seoRobots";
import { getCurrentHost } from "./lib/hostConfig";
import { EN_PREFIX, LanguageProvider, getRouterBasename, useLanguage } from "@/lib/i18n";
import { toSwedishPath, toEnglishPath } from "@/i18n/routes";

import SupplierLayout from "@/components/SupplierLayout";
import BuyerLayout from "@/components/BuyerLayout";


// Eager: Cykelhjälpen landing page for fastest FCP
import Index from "./pages/cykelhjalpen/CykelhjalpenIndex";
const UpdroIndex = lazy(() => import("./pages/Index"));

// Cykelhjälpen pages
const BikeRequestWizard = lazy(() => import("./pages/cykelhjalpen/BikeRequestWizard"));
const CustomerResponses = lazy(() => import("./pages/cykelhjalpen/CustomerResponses"));
const RegisterWorkshopPage = lazy(() => import("./pages/cykelhjalpen/RegisterWorkshopPage"));
const ForVerkstaderPage = lazy(() => import("./pages/cykelhjalpen/ForVerkstaderPage"));
const WorkshopLayout = lazy(() => import("./components/cykelhjalpen/WorkshopLayout"));
const WorkshopDashboard = lazy(() => import("./pages/cykelhjalpen/workshop/WorkshopDashboard"));
const WorkshopRequests = lazy(() => import("./pages/cykelhjalpen/workshop/WorkshopRequests"));
const WorkshopBilling = lazy(() => import("./pages/cykelhjalpen/workshop/WorkshopBilling"));
const WorkshopSettings = lazy(() => import("./pages/cykelhjalpen/workshop/WorkshopSettings"));
const CykelSeoPage = lazy(() => import("./pages/cykelhjalpen/CykelSeoPage"));
const CykelCityLandingPage = lazy(() => import("./pages/cykelhjalpen/CykelCityLandingPage"));
const WorkshopAdCityPage = lazy(() => import("./pages/cykelhjalpen/WorkshopAdCityPage"));
const UnsubscribePage = lazy(() => import("./pages/cykelhjalpen/UnsubscribePage"));

import { CYKEL_SEO_PAGES } from "./lib/cykelSeoPages";
import { CYKEL_CITIES, cityLandingPath } from "./lib/cykelCities";
const AdminBikeRequests = lazy(() => import("./pages/admin/AdminBikeRequests"));
const AdminWorkshops = lazy(() => import("./pages/admin/AdminWorkshops"));
const AdminBikePayments = lazy(() => import("./pages/admin/AdminBikePayments"));

// Lazy-loaded pages
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const RegisterSupplierPage = lazy(() => import("./pages/RegisterSupplierPage"));
const ProjectWizard = lazy(() => import("./pages/ProjectWizard"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const BrowseAgenciesPage = lazy(() => import("./pages/BrowseAgenciesPage"));
const AgencyProfilePage = lazy(() => import("./pages/AgencyProfilePage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SitemapPage = lazy(() => import("./pages/SitemapPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const SupplierLandingPage = lazy(() => import("./pages/SupplierLandingPage"));
const EditorialPolicyPage = lazy(() => import("./pages/EditorialPolicyPage"));
const MetodPage = lazy(() => import("./pages/MetodPage"));
const AdminContentPlanner = lazy(() => import("./pages/admin/AdminContentPlanner"));

// Redirect helper for legacy /guider/:slug and /kunskapsbank/:slug -> /artiklar/:slug
const RedirectToArtikel = () => {
  const params = useParams();
  const slug = params.slug || params.artikel;
  return <Navigate to={slug ? `/artiklar/${slug}` : '/artiklar'} replace />;
};

// Redirect som behåller querysträngen (t.ex. utm-parametrar från mejlutskick)
const RedirectKeepSearch = ({ to }: { to: string }) => {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
};

/** Gamla verkstads-URL:er -> rätt sida i aktuellt språk (canonical sätts i prerender-headen). */
const LegacyWorkshopRedirect = () => {
  const { lang } = useLanguage();
  return <RedirectKeepSearch to={lang === "en" ? "/for-bike-shops" : "/for-cykelverkstader"} />;
};

/** /for-cykelverkstader under /en är en dubblett av /en/for-bike-shops. */
const WorkshopPageOrEnRedirect = () => {
  const { lang } = useLanguage();
  if (lang === "en") return <RedirectKeepSearch to="/for-bike-shops" />;
  return <ForVerkstaderPage />;
};

// SEO pages
const PillarPage = lazy(() => import("./components/seo/PillarPage"));
const SubPage = lazy(() => import("./components/seo/SubPage"));
const CityHubPage = lazy(() => import("./components/seo/CityHubPage"));
const CitiesIndex = lazy(() => import("./components/seo/CitiesIndex"));
const ComparisonPage = lazy(() => import("./components/seo/ComparisonPage"));
const ComparisonsIndex = lazy(() => import("./components/seo/ComparisonsIndex"));
const ArticlePage = lazy(() => import("./components/seo/ArticlePage"));
const ArticlesIndex = lazy(() => import("./components/seo/ArticlesIndex"));
const ToolPage = lazy(() => import("./components/seo/ToolPage"));
const ToolsIndex = lazy(() => import("./components/seo/ToolsIndex"));

// Agency SEO pages
const AgencyCityPage = lazy(() => import("./pages/seo/AgencyCityPage"));
const AgencyCityCategoryPage = lazy(() => import("./pages/seo/AgencyCityCategoryPage"));
const AgencyCategoryPage = lazy(() => import("./pages/seo/AgencyCategoryPage"));
const ServicePage = lazy(() => import("./pages/seo/ServicePage"));
const KnowledgeArticlePage = lazy(() => import("./pages/seo/KnowledgeArticlePage"));
const KnowledgeBankIndex = lazy(() => import("./pages/seo/KnowledgeBankIndex"));
const HittaWebbbyraPage = lazy(() => import("./pages/seo/SEOLandingPages").then(m => ({ default: m.HittaWebbbyraPage })));
const HittaSeoByraPage = lazy(() => import("./pages/seo/SEOLandingPages").then(m => ({ default: m.HittaSeoByraPage })));
const HittaDigitalByraPage = lazy(() => import("./pages/seo/SEOLandingPages").then(m => ({ default: m.HittaDigitalByraPage })));
const PartnaAlternativPage = lazy(() => import("./pages/seo/PartnaAlternativPage"));

const BuyerDashboard = lazy(() => import("./pages/buyer/BuyerDashboard"));
const BuyerProjects = lazy(() => import("./pages/buyer/BuyerProjects"));
const ProjectDetail = lazy(() => import("./pages/buyer/ProjectDetail"));

// Supplier pages
const SupplierDashboard = lazy(() => import("./pages/supplier/SupplierDashboard"));
const BrowseProjects = lazy(() => import("./pages/supplier/BrowseProjects"));
const ProjectUnlock = lazy(() => import("./pages/supplier/ProjectUnlock"));
const SupplierOffers = lazy(() => import("./pages/supplier/SupplierOffers"));
const BillingPage = lazy(() => import("./pages/supplier/BillingPage"));
const ReferralPage = lazy(() => import("./pages/supplier/ReferralPage"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/CykelAdminHub"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
const AdminSuppliers = lazy(() => import("./pages/admin/AdminSuppliers"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminNotificationEvents = lazy(() => import("./pages/admin/AdminNotificationEvents"));
const AdminProspects = lazy(() => import("./pages/admin/AdminProspects"));
const AdminInbox = lazy(() => import("./pages/admin/AdminInbox"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminGuides = lazy(() => import("./pages/admin/AdminGuides"));
const AdminArticleGenerator = lazy(() => import("./pages/admin/AdminArticleGenerator"));
const AdminStripeLog = lazy(() => import("./pages/admin/AdminStripeLog"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminVisitors = lazy(() => import("./pages/admin/AdminVisitors"));
const AdminMarketplaceHealth = lazy(() => import("./pages/admin/AdminMarketplaceHealth"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);


const PageTracker = () => { usePageTracking(); return null; };

const NoindexGuard = ({ host }: { host: 'cykelhjalpen' | 'updro' }) => {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const noindexPaths = getNoindexSeoRoutes(host).map((route) => route.path);
    const directive = getRobotsDirectiveForPath(location.pathname, noindexPaths);

    const applyDirective = () => {
      let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = directive;
    };

    applyDirective();
    const timeoutId = window.setTimeout(applyDirective, 0);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, host]);

  return null;
};

/** Adds self-referencing canonical + hreflang alternates for the sv/en versions of the current URL. */
const HreflangTags = () => {
  const location = useLocation();
  const { lang } = useLanguage();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Helmet flushes its head tags asynchronously, so run a few passes: the last
    // one wins and removes whatever duplicate Helmet re-added in between.
    const apply = () => {
    const origin = window.location.origin;

    const routerPath = location.pathname || '/';

    // Swedish path is canonical; English pages use their own translated slug.
    const svPath = lang === 'en' ? toSwedishPath(routerPath) : routerPath;
    const enPath = lang === 'en'
      ? (routerPath === '/' ? EN_PREFIX : `${EN_PREFIX}${routerPath}`)
      : (() => {
          const mapped = toEnglishPath(routerPath);
          if (!mapped) return null;
          return mapped === '/' ? EN_PREFIX : `${EN_PREFIX}${mapped}`;
        })();

    const selfUrl = lang === 'en'
      ? `${origin}${routerPath === '/' ? EN_PREFIX : `${EN_PREFIX}${routerPath}`}`
      : `${origin}${routerPath}`;

    // Pages that render their own canonical/hreflang through Helmet (data-rh) own
    // those tags. We only strip the static prerendered duplicates in that case,
    // otherwise Helmet keeps re-adding its tag and the page ships two canonicals.
    const helmetCanonical = document.querySelector('link[rel="canonical"][data-rh]') as HTMLLinkElement | null;
    const helmetAlternate = document.querySelector('link[rel="alternate"][data-rh]');

    const alternates: Array<[string, string]> = [];
    if (svPath && enPath) {
      alternates.push(['sv', `${origin}${svPath}`]);
      alternates.push(['en', `${origin}${enPath}`]);
      alternates.push(['x-default', `${origin}${svPath}`]);
    }

    document.querySelectorAll('link[rel="alternate"][data-i18n]').forEach((el) => el.remove());
    if (helmetAlternate) {
      document
        .querySelectorAll('link[rel="alternate"]:not([data-rh])')
        .forEach((el) => el.remove());
    } else {
      for (const [hreflang, href] of alternates) {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        link.href = href;
        link.setAttribute('data-i18n', 'true');
        document.head.appendChild(link);
      }
    }

    if (helmetCanonical) {
      document
        .querySelectorAll('link[rel="canonical"]:not([data-rh])')
        .forEach((el) => el.remove());
    } else {
      const canonicals = Array.from(
        document.querySelectorAll('link[rel="canonical"]'),
      ) as HTMLLinkElement[];
      let canonical = canonicals.shift();
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonicals.forEach((el) => el.remove());
      canonical.href = selfUrl;
    }

    // og:locale per language version. Helmet may already render these per page,
    // so reuse whatever tag exists and keep exactly one of each.
    const setOg = (property: string, content: string) => {
      const tags = Array.from(
        document.querySelectorAll(`meta[property="${property}"]`),
      ) as HTMLMetaElement[];
      // Prefer Helmet's tag when it exists so it is not fought over on re-render.
      const preferred = tags.find((el) => el.hasAttribute('data-rh')) ?? tags[0];
      tags.filter((el) => el !== preferred).forEach((el) => el.remove());
      let tag = preferred;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        tag.setAttribute('data-i18n', 'true');
        document.head.appendChild(tag);
      }
      if (!tag.hasAttribute('data-rh')) tag.content = content;
    };
    setOg('og:locale', lang === 'en' ? 'en_US' : 'sv_SE');
    setOg('og:locale:alternate', lang === 'en' ? 'sv_SE' : 'en_US');


    const ogUrls = Array.from(
      document.querySelectorAll('meta[property="og:url"]'),
    ) as HTMLMetaElement[];
    const helmetOgUrl = ogUrls.find((el) => el.hasAttribute('data-rh'));
    let ogUrl = helmetOgUrl ?? ogUrls[0];
    ogUrls.filter((el) => el !== ogUrl).forEach((el) => el.remove());
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    if (!helmetOgUrl) ogUrl.content = selfUrl;

    };
    const timers = [0, 200, 800].map((delay) => window.setTimeout(apply, delay));
    return () => timers.forEach((id) => window.clearTimeout(id));

  }, [location.pathname, lang]);

  return null;
};


const AppRoutes = () => {
  const host = getCurrentHost();

  return (
    <>
      <PageTracker />
      <NoindexGuard host={host} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Root: differs by host */}
          <Route path="/" element={host === 'updro' ? <UpdroIndex /> : <Index />} />




          {/* ============ Cykelhjälpen-only routes ============ */}
          {host === 'cykelhjalpen' && (
            <>
              <Route path="/skicka-arende" element={<BikeRequestWizard />} />
              <Route path="/mitt-arende/:token" element={<CustomerResponses />} />
              <Route path="/registrera/verkstad" element={<RegisterWorkshopPage />} />
              <Route path="/for-cykelverkstader" element={<WorkshopPageOrEnRedirect />} />
              {/* Gammal länk från rekryteringsmejl – behåll query (utm) vid redirect */}
              <Route path="/for-verkstader" element={<LegacyWorkshopRedirect />} />

              {/* English routes (served under /en/ via router basename) */}
              <Route path="/submit-request" element={<BikeRequestWizard />} />
              <Route path="/for-bike-shops" element={<ForVerkstaderPage />} />

              {/* /en/bike-repair-<stad> är stadshubben och ägs av CYKEL_SEO_PAGES nedan,
                  precis som /cykelverkstad-<stad> gör på svenska. */}

              {/* Google Ads: rekryteringssida per stad för verkstäder (noindex) */}
              <Route path="/annons/verkstad/:citySlug" element={<WorkshopAdCityPage />} />
              <Route path="/avregistrera/:token" element={<UnsubscribePage />} />


              {/* Workshop dashboard — now protected */}
              <Route
                path="/dashboard/verkstad"
                element={
                  <ProtectedRoute role="workshop">
                    <WorkshopLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<WorkshopDashboard />} />
                <Route path="arenden" element={<WorkshopRequests />} />
                <Route path="betalningar" element={<WorkshopBilling />} />
                <Route path="installningar" element={<WorkshopSettings />} />
              </Route>

              {/* Cykelhjälpen admin */}
              <Route path="/admin/cykelarenden" element={<ProtectedRoute role="admin"><AdminBikeRequests /></ProtectedRoute>} />
              <Route path="/admin/verkstader" element={<ProtectedRoute role="admin"><AdminWorkshops /></ProtectedRoute>} />
              <Route path="/admin/cykelbetalningar" element={<ProtectedRoute role="admin"><AdminBikePayments /></ProtectedRoute>} />

              {/* Local SEO — dynamiska routes från CYKEL_SEO_PAGES (sv + en) */}
              {CYKEL_SEO_PAGES.map((p) => (
                <Route key={p.slug} path={`/${p.slug}`} element={<CykelSeoPage />} />
              ))}
              {CYKEL_SEO_PAGES.map((p) => (
                <Route key={`en-${p.enSlug}`} path={`/${p.enSlug}`} element={<CykelSeoPage />} />
              ))}


              {/* City landing pages — skip Linköping (owned by CYKEL_SEO_PAGES 'cykelverkstad-linkoping') */}
              {CYKEL_CITIES
                .filter((c) => !CYKEL_SEO_PAGES.some((p) => `/${p.slug}` === cityLandingPath(c.name)))
                .map((c) => (
                  <Route key={c.name} path={cityLandingPath(c.name)} element={<CykelCityLandingPage city={c.name} />} />
                ))}
            </>
          )}

          {/* Shared legal pages — rendered on both hosts (Cykelhjälpen footer + Updro footer both link here) */}
          <Route path="/integritetspolicy" element={<PrivacyPolicyPage />} />
          <Route path="/villkor" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />

          {/* Shared auth + admin entry — rendered on both hosts */}
          <Route path="/logga-in" element={<LoginPage />} />
          <Route path="/registrera" element={<RegisterPage />} />
          <Route path="/aterstall-losenord" element={<PlaceholderPage title="Återställ lösenord" />} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          {/* Shared admin sub-pages — available on both hosts */}
          <Route path="/admin/anvandare" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/anvandare/:id" element={<ProtectedRoute role="admin"><AdminUserDetail /></ProtectedRoute>} />
          <Route path="/admin/besokare" element={<ProtectedRoute role="admin"><AdminVisitors /></ProtectedRoute>} />
          <Route path="/admin/statistik" element={<ProtectedRoute role="admin"><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/guider" element={<ProtectedRoute role="admin"><AdminGuides /></ProtectedRoute>} />
          <Route path="/admin/artikelgenerator" element={<ProtectedRoute role="admin"><AdminArticleGenerator /></ProtectedRoute>} />
          <Route path="/admin/stripe" element={<ProtectedRoute role="admin"><AdminStripeLog /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute role="admin"><AdminAuditLog /></ProtectedRoute>} />
          <Route path="/admin/installningar" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/notifikationer" element={<ProtectedRoute role="admin"><AdminNotifications /></ProtectedRoute>} />
          <Route path="/admin/notifieringar-logg" element={<ProtectedRoute role="admin"><AdminNotificationEvents /></ProtectedRoute>} />
          <Route path="/admin/prospekt" element={<ProtectedRoute role="admin"><AdminProspects /></ProtectedRoute>} />
          <Route path="/admin/mejl" element={<ProtectedRoute role="admin"><AdminInbox /></ProtectedRoute>} />

          {/* ============ Updro-only routes ============ */}
          {host === 'updro' && (
            <>
              <Route path="/publicera" element={<ProjectWizard />} />
              <Route path="/byraer" element={<BrowseAgenciesPage />} />
              <Route path="/byraer/:slug" element={<AgencyProfilePage />} />
              <Route path="/priser" element={<PricingPage />} />
              <Route path="/om-oss" element={<AboutPage />} />
              <Route path="/support" element={<PlaceholderPage title="Support" />} />
              <Route path="/registrera/byra" element={<RegisterSupplierPage />} />
              <Route path="/sitemap" element={<SitemapPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/landing/byra" element={<SupplierLandingPage />} />

              {/* Legacy redirects */}
              <Route path="/guider" element={<Navigate to="/artiklar" replace />} />
              <Route path="/guider/:slug" element={<RedirectToArtikel />} />
              <Route path="/kunskapsbank" element={<Navigate to="/artiklar" replace />} />
              <Route path="/kunskapsbank/:artikel" element={<RedirectToArtikel />} />

              {/* E-E-A-T */}
              <Route path="/redaktionell-policy" element={<EditorialPolicyPage />} />
              <Route path="/metod" element={<MetodPage />} />

              {/* SEO landing pages */}
              <Route path="/hitta-webbyra" element={<HittaWebbbyraPage />} />
              <Route path="/hitta-seo-byra" element={<HittaSeoByraPage />} />
              <Route path="/hitta-digital-byra" element={<HittaDigitalByraPage />} />
              <Route path="/partna-alternativ" element={<PartnaAlternativPage />} />
              <Route path="/updro-vs-partna" element={<Navigate to="/partna-alternativ" replace />} />
              <Route path="/jamfor-partna" element={<Navigate to="/partna-alternativ" replace />} />
              <Route path="/alternativ-till-partna" element={<Navigate to="/partna-alternativ" replace />} />

              {/* Content hubs */}
              <Route path="/artiklar" element={<ArticlesIndex />} />
              <Route path="/artiklar/:slug" element={<ArticlePage />} />
              <Route path="/verktyg" element={<ToolsIndex />} />
              <Route path="/verktyg/:slug" element={<ToolPage />} />
              <Route path="/stader" element={<CitiesIndex />} />
              <Route path="/stader/:city" element={<CityHubPage />} />
              <Route path="/jamfor" element={<ComparisonsIndex />} />

              {/* Agency SEO */}
              <Route path="/byraer/kategori/:kategori" element={<AgencyCategoryPage />} />
              <Route path="/byraer/:stad/:kategori" element={<AgencyCityCategoryPage />} />
              <Route path="/byraer/:stad" element={<AgencyCityPage />} />

              {/* Service pages */}
              <Route path="/leveranser/:tjanst" element={<ServicePage />} />

              {/* Admin: content planner */}
              <Route path="/admin/innehallsplan" element={<ProtectedRoute role="admin"><AdminContentPlanner /></ProtectedRoute>} />

              {/* Comparison pages */}
              {COMPARISON_PAGES.map(p => (
                <Route key={p.slug} path={`/${p.slug}`} element={<ComparisonPage />} />
              ))}

              {/* Buyer dashboard */}
              <Route path="/dashboard/buyer" element={<ProtectedRoute role="buyer"><BuyerLayout /></ProtectedRoute>}>
                <Route index element={<BuyerDashboard />} />
                <Route path="uppdrag" element={<BuyerProjects />} />
                <Route path="uppdrag/:id" element={<ProjectDetail />} />
                <Route path="chatt" element={<ChatPage />} />
                <Route path="profil" element={<ProfilePage />} />
              </Route>

              {/* Supplier dashboard */}
              <Route path="/dashboard/supplier" element={<ProtectedRoute role="supplier"><SupplierLayout /></ProtectedRoute>}>
                <Route index element={<SupplierDashboard />} />
                <Route path="uppdrag" element={<BrowseProjects />} />
                <Route path="uppdrag/:id" element={<ProjectUnlock />} />
                <Route path="offerter" element={<SupplierOffers />} />
                <Route path="chatt" element={<ChatPage />} />
                <Route path="profil" element={<ProfilePage />} />
                <Route path="fakturering" element={<BillingPage />} />
                <Route path="bjud-in" element={<ReferralPage />} />
              </Route>

              {/* Admin (Updro surface) */}
              <Route path="/admin/byraer" element={<ProtectedRoute role="admin"><AdminSuppliers /></ProtectedRoute>} />
              <Route path="/admin/uppdrag" element={<ProtectedRoute role="admin"><AdminProjects /></ProtectedRoute>} />
              <Route path="/admin/offerter" element={<ProtectedRoute role="admin"><AdminOffers /></ProtectedRoute>} />
              <Route path="/admin/marketplace-health" element={<ProtectedRoute role="admin"><AdminMarketplaceHealth /></ProtectedRoute>} />
            </>
          )}

          {/* 404 fallback for both hosts */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={getRouterBasename()}>
        <LanguageProvider>
          <AuthProvider>
            <HreflangTags />
            <AppRoutes />
            <CookieConsent />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);


export default App;