// Give browsers the same visible hero before loading React. Head metadata stays intact.
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const cycle = true;
const server = await createServer({ configFile: false, appType: 'custom', server: { middlewareMode: true }, esbuild: { jsx: 'transform' }, optimizeDeps: { noDiscovery: true, entries: [] } });
try {
  const { HomeHero } = await server.ssrLoadModule('/src/components/HomeHero.tsx');
  for (const [lang, file] of [['sv', 'dist/index.html'], ['en', 'dist/en/index.html']]) {
    let html;
    try { html = await readFile(file, 'utf8'); } catch { continue; }
    const name = cycle ? 'Cykelhjälpen' : 'Aurora Transport';
    const hero = renderToStaticMarkup(React.createElement(HomeHero, { lang }));
    const header = `<header class="home-header" style="height:73px"><div class="home-container home-header-row"><a class="home-brand" href="${lang === 'en' ? '/en' : '/'}">${name}</a></div></header>`;
    const next = cycle
      ? `<section class="home-section"><div class="home-container"><h2 class="home-section-heading">${lang === 'en' ? 'How it works' : 'Så går det till'}</h2><div class="home-grid home-steps"><div class="home-step"><span class="home-number">1</span><h3>${lang === 'en' ? 'Tell us what is wrong' : 'Berätta vad som är fel'}</h3></div></div></div></section>`
      : `<div class="home-container home-stats"><div class="home-stat"><strong>${lang === 'en' ? 'SEK 449/month' : '449 kr/mån'}</strong><span>${lang === 'en' ? 'Excl. VAT · Same price, any number of drivers' : 'Exkl. moms · Samma pris oavsett antal förare'}</span></div><div class="home-stat"><strong>${lang === 'en' ? 'Unlimited' : 'Obegränsat'}</strong><span>${lang === 'en' ? 'Number of drivers' : 'Antal förare'}</span></div><div class="home-stat"><strong>${lang === 'en' ? 'No lock-in' : 'Ingen bindningstid'}</strong><span>${lang === 'en' ? 'Cancel whenever you want' : 'Sluta när du vill'}</span></div></div>`;
    // Retain the existing crawlable below-fold content, links and metadata.
    const oldBody = html.match(/<div id="root">([\s\S]*?)<\/div>\s*(?=<noscript|<\/body)/)?.[1] ?? '';
    const retained = oldBody.replace(/<h1[\s\S]*?<\/h1>/, '').replace(/<main\b/g, '<div').replace(/<\/main>/g, '</div>');
    const body = `<div class="home-page ${cycle ? 'home-cycle' : 'home-transport'}">${header}<main id="home-main">${hero}${next}<div class="home-container" style="font-family:Geist,sans-serif">${retained}</div></main></div>`;
    const result = html.replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<noscript|<\/body)/, `<div id="root">${body}</div>\n`);
    if (result === html) throw new Error(`Homepage root not found: ${file}`);
    if (result.match(/<head>[\s\S]*?<\/head>/)?.[0] !== html.match(/<head>[\s\S]*?<\/head>/)?.[0]) throw new Error('Homepage head changed during visual prerender');
    const criticalCss = await readFile('src/home-design.css', 'utf8');
    // Only this homepage defers app-wide CSS. Its exact visual CSS is already inline.
    const firstPaint = result.replace(/<link\b([^>]*rel="stylesheet"[^>]*)>/g, '<link $1 media="print" onload="this.media=\'all\'">')
      .replace('</head>', `<style data-home-critical>${criticalCss}</style></head>`);
    await writeFile(file, firstPaint);
  }
  console.log('Homepage hero: server HTML matches the React component; SEO head preserved.');
} finally { await server.close(); }
