const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const inline = value => escape(value).replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/(?!\/))[^\s)]+)\)/g, '<a href="$2">$1</a>');
const paragraphs = text => text.split('\n\n').map(block => block.startsWith('- ')
  ? `<ul>${block.split('\n').map(line => `<li>${inline(line.replace(/^- /, ''))}</li>`).join('')}</ul>`
  : `<p>${inline(block)}</p>`).join('');
export function renderEditorialArticle(article) {
  const links = article.links || (article.ctaHref ? [{ href: article.ctaHref, label: article.ctaLabel }] : []);
  return `<main style="max-width:70ch;margin:3rem auto;padding:1.5rem;font-family:system-ui;line-height:1.7"><nav><a href="/">Hem</a> · <a href="/blogg">Blogg</a></nav><article><h1>${escape(article.title)}</h1><p>${escape(article.publishDate || article.publishedDate)} · AI-assisterad originalguide</p><p>${escape(article.intro)}</p>${article.sections.map(section => `<section><h2>${escape(section.heading)}</h2>${paragraphs(section.content)}</section>`).join('')}</article><nav aria-label="Nästa steg">${links.map(link => `<p><a href="${escape(link.href)}">${escape(link.label)}</a></p>`).join('')}</nav></main>`;
}
