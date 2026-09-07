import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar';
import CykelFooter from '@/components/cykelhjalpen/CykelFooter';
import { EditorialBody } from '@/components/EditorialBody';
import articles from '@/content/editorial/articles.json';
import NotFound from '@/pages/NotFound';
export default function EditorialBlog() {
  const { slug } = useParams();
  const article = articles.find(a => a.slug === slug);
  if (slug && !article) return <NotFound />;
  const title = article?.title || 'Blogg för cyklister';
  const description = article?.metaDescription || 'Praktiska guider inför kontakten med cykelverkstaden.';
  const canonical = `https://cykelhjalpen.se/blogg${article ? `/${article.slug}` : ''}`;
  return <div className="min-h-screen flex flex-col bg-background"><Helmet>
    <title>{title} | Cykelhjälpen</title><meta name="description" content={description} /><meta name="robots" content="index,follow" /><link rel="canonical" href={canonical} />
    <meta property="og:title" content={title} /><meta property="og:description" content={description} /><meta property="og:url" content={canonical} /><meta property="og:type" content={article ? 'article' : 'website'} />
    {article && <script type="application/ld+json">{JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:article.title,datePublished:article.publishedDate,mainEntityOfPage:canonical,author:{'@type':'Organization',name:'Cykelhjälpen'}})}</script>}
  </Helmet><CykelNavbar /><main className="flex-1 mx-auto w-full max-w-3xl px-5 py-12">
    <nav className="mb-8 flex gap-5 underline"><Link to="/">Hem</Link>{article && <Link to="/blogg">Alla inlägg</Link>}</nav>
    <h1 className="font-display text-3xl sm:text-4xl leading-tight mb-6">{title}</h1>
    {article ? <article><p className="text-sm text-muted-foreground mb-6"><time dateTime={article.publishedDate}>{article.publishedDate}</time> · AI-assisterad guide</p><EditorialBody article={article} /><a href={article.ctaHref} className="inline-block mt-8 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold">{article.ctaLabel}</a></article>
      : <><p className="mb-10 text-lg">{description}</p><div className="space-y-8">{articles.map(a => <article key={a.slug} className="border rounded-2xl p-6"><time className="text-sm">{a.publishedDate}</time><h2 className="text-2xl mt-3 mb-4"><Link className="underline" to={`/blogg/${a.slug}`}>{a.title}</Link></h2><p className="leading-7">{a.intro}</p></article>)}</div></>}
  </main><CykelFooter /></div>;
}
