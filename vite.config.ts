import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Plugin } from "vite";
import {
  generateSectionSitemapXml,
  generateSitemapIndexXml,
  generateSitemapXml,
  getAllStaticSeoRoutes,
  getIndexableSeoRoutes,
  getNoindexSeoRoutes,
  renderStaticHtml,
  SITEMAP_SECTIONS,
} from "./src/lib/seoStatic";

function seoBuildPlugin(host: 'cykelhjalpen' | 'updro'): Plugin {
  return {
    name: 'vite-plugin-updro-seo-build',
    configureServer(s) {
      s.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        const match = url.match(/^\/(sitemap(?:-[a-z]+)?|sitemap-index)\.xml(?:\?.*)?$/);
        if (!match) return next();
        try {
          const name = match[1];
          let xml: string | null = null;
          if (name === 'sitemap') xml = generateSitemapXml(host);
          else if (name === 'sitemap-index') xml = generateSitemapIndexXml(host);
          else xml = generateSectionSitemapXml(name.replace(/^sitemap-/, '') as any, host);
          if (!xml) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.end(xml);
        } catch (e) {
          console.error('Sitemap generation error:', e);
          next(e);
        }
      });
    },
    async closeBundle() {
      const fs = await import('node:fs/promises');
      const distDir = path.resolve(process.cwd(), 'dist');

      const flat = generateSitemapXml(host);
      await fs.writeFile(path.join(distDir, 'sitemap.xml'), flat, 'utf8');

      const indexXml = generateSitemapIndexXml(host);
      await fs.writeFile(path.join(distDir, 'sitemap-index.xml'), indexXml, 'utf8');

      let sectionUrlCount = 0;
      for (const section of SITEMAP_SECTIONS) {
        const xml = generateSectionSitemapXml(section, host);
        if (!xml) continue;
        await fs.writeFile(path.join(distDir, `sitemap-${section}.xml`), xml, 'utf8');
        sectionUrlCount += (xml.match(/<url>/g) || []).length;
      }

      const flatCount = (flat.match(/<url>/g) || []).length;
      const noindexCount = getNoindexSeoRoutes(host).length;
      const routeCount = getIndexableSeoRoutes(host).length + noindexCount;
      console.log(`✅ SEO build [host=${host}]: sitemap generated for ${flatCount} indexable URLs, ${sectionUrlCount} section URLs, ${noindexCount} noindex programmatic URLs, ${routeCount} registered routes`);

      const indexHtmlPath = path.join(distDir, 'index.html');
      const template = await fs.readFile(indexHtmlPath, 'utf8');
      let prerenderedCount = 0;
      for (const route of getAllStaticSeoRoutes(host)) {
        const html = renderStaticHtml(template, route, host);
        if (route.path === '/') {
          await fs.writeFile(indexHtmlPath, html, 'utf8');
        } else {
          const outDir = path.join(distDir, route.path.replace(/^\//, ''));
          await fs.mkdir(outDir, { recursive: true });
          await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
        }
        prerenderedCount++;
      }
      console.log(`✅ Prerendered ${prerenderedCount} routes`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteHost = (env.SITE_HOST === 'updro' ? 'updro' : 'cykelhjalpen') as 'cykelhjalpen' | 'updro';
  return {
    define: {
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
      __BUILD_REV__: JSON.stringify('react-chunk-fix-v2'),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://xmwsumzujqdttphhzxyq.supabase.co'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtd3N1bXp1anFkdHRwaGh6eHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTcwMjQsImV4cCI6MjA5NDI3MzAyNH0.wGMx4J4wOBmqZavjcWlXemanqQXALxxNdJSr_vc3lys'),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(env.VITE_SUPABASE_PROJECT_ID || 'xmwsumzujqdttphhzxyq'),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    build: {
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase': ['@supabase/supabase-js'],
            'motion': ['framer-motion'],
            'query': ['@tanstack/react-query'],
          },
        },
      },
    },
    plugins: [
      react(),
      seoBuildPlugin(siteHost),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
