import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = path => readFileSync(path, 'utf8');
const articles = JSON.parse(read('src/content/editorial/articles.json'));
const site = JSON.parse(read('content/editorial/site.json'));
const index = read('dist/blogg/index.html');
const sitemap = read('dist/sitemap.xml');
for (const article of articles) {
  const path = `/blogg/${article.slug}`;
  const html = read(`dist${path}/index.html`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert(html.includes(article.sections.at(-1).heading), 'Missing final article section');
  assert(html.includes(`<link rel="canonical" href="${site.origin}${path}">`));
  assert(!/<meta[^>]*name="robots"[^>]*noindex/.test(html));
  assert(html.includes(`href="${article.ctaHref}"`));
  assert(index.includes(`href="${path}"`));
  assert(sitemap.includes(`<loc>${site.origin}${path}</loc>`));
}
assert(sitemap.includes(`<loc>${site.origin}/</loc>`), 'Existing sitemap entry lost');
console.log(`Verified ${articles.length} complete, indexable blog posts, list and sitemap.`);
