import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { renderEditorialArticle } from './editorial-html.mjs';
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const config = JSON.parse(await readFile('content/editorial/site.json','utf8'));
const articles = JSON.parse(await readFile('src/content/editorial/articles.json','utf8'));
const template = await readFile(`dist/${config.template || 'index.html'}`,'utf8');
function page(path,title,description,body,schema) {
  const canonical = config.origin + path;
  return template.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta[^>]+(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,'').replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi,'').replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'').replace(/<noscript>[\s\S]*?<\/noscript>/gi,'').replace(/<div id="root">[\s\S]*?<\/div>/,`<div id="root">${body}</div>`).replace('</head>',`<title>${esc(title)} | ${esc(config.name)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>`:''}</head>`);
}
const entries=[];
for (const article of articles) {
 const path=`/blogg/${article.slug}`;
 const schema={'@context':'https://schema.org','@type':'BlogPosting',headline:article.title,datePublished:article.publishedDate,mainEntityOfPage:config.origin+path,author:{'@type':'Organization',name:config.name}};
 const out=`dist${path}`;await mkdir(out,{recursive:true});await writeFile(`${out}/index.html`,page(path,article.title,article.metaDescription,renderEditorialArticle(article),schema));
 entries.push({slug:article.slug,title:article.title,date:article.publishedDate,intro:article.intro});
}
if (config.legacySource) {
 const legacy=await readFile(config.legacySource,'utf8');
 for (const match of legacy.matchAll(/slug:\s*"([^"]+)",[\s\S]*?title:\s*"([^"]+)"/g)) if(!entries.some(e=>e.slug===match[1])) entries.push({slug:match[1],title:match[2],date:null,intro:''});
}
const body=`<main style="max-width:70ch;margin:3rem auto;padding:1.5rem;font-family:system-ui;line-height:1.7"><a href="/">Hem</a><h1>${esc(config.blogTitle)}</h1><p>${esc(config.blogDescription)}</p>${entries.map(a=>`<article><h2><a href="/blogg/${esc(a.slug)}">${esc(a.title)}</a></h2>${a.date?`<time datetime="${a.date}">${a.date}</time>`:''}<p>${esc(a.intro)}</p></article>`).join('')}</main>`;
await mkdir('dist/blogg',{recursive:true});await writeFile('dist/blogg/index.html',page('/blogg',config.blogTitle,config.blogDescription,body));
const urls=[{path:'/blogg',date:articles[0]?.publishedDate},...articles.map(a=>({path:`/blogg/${a.slug}`,date:a.publishedDate}))];
for (const file of ['dist/sitemap.xml', ...(config.sectionSitemap ? ['dist/sitemap-main.xml'] : [])]) {
 let xml=await readFile(file,'utf8');
 for (const item of urls) if(!xml.includes(`<loc>${config.origin}${item.path}</loc>`)) xml=xml.replace('</urlset>',`  <url><loc>${config.origin}${item.path}</loc><lastmod>${item.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>`);
 await writeFile(file,xml);
}
console.log(`Editorial output: ${articles.length} full articles, blog index and sitemap.`);
