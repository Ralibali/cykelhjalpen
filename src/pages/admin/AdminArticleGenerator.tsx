import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Eye, ChevronLeft, ExternalLink, AlertCircle, CheckCircle2, FileEdit } from "lucide-react";
import { setSEOMeta } from "@/lib/seoHelpers";
import { useT } from "@/lib/i18n";

interface Section { heading: string; content: string }
interface FaqItem { q: string; a: string }
interface RelLink { label: string; href: string }

interface GeneratedArticle {
  slug: string;
  metaTitle: string;
  metaDesc: string;
  h1: string;
  category: string;
  publishedDate?: string;
  updatedDate?: string;
  readTimeMinutes?: number;
  intro: string;
  sections: Section[];
  faq: FaqItem[];
  relatedLinks: RelLink[];
}

const CATEGORIES = [
  "Webbutveckling",
  "SEO",
  "E-handel",
  "Apputveckling",
  "Digital marknadsföring",
  "Grafisk design",
  "Google Ads",
  "E-post",
];

const ARTICLE_TYPES: { value: string; label: string }[] = [
  { value: "guide", label: "Guide" },
  { value: "news", label: "Nyhet" },
  { value: "comparison", label: "Jämförelse" },
  { value: "case-study", label: "Case study" },
];

const AdminArticleGenerator = () => {
  const t = useT();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const [topic, setTopic] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [category, setCategory] = useState("Webbutveckling");
  const [city, setCity] = useState("");
  const [articleType, setArticleType] = useState("guide");
  const [minLength, setMinLength] = useState(5000);

  const [generating, setGenerating] = useState(false);
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ attempts?: number; issues?: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    setSEOMeta({
      title: "Artikelgenerator – Admin | Updro",
      description: "Generera artiklar med AI",
      noindex: true,
    });
  }, []);

  // Ladda existerande artikel om ?id= finns (från Granska-knapp i kön)
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("id", editId)
          .maybeSingle();
        if (error) throw error;
        if (!data || cancelled) return;
        setArticle({
          slug: data.slug,
          metaTitle: data.meta_title,
          metaDesc: data.meta_desc,
          h1: data.h1,
          category: data.category,
          publishedDate: data.published_date,
          updatedDate: data.updated_date,
          readTimeMinutes: data.read_time_minutes ?? undefined,
          intro: data.intro,
          sections: (data.sections as any) || [],
          faq: (data.faq as any) || [],
          relatedLinks: (data.related_links as any) || [],
        });
        setEditingId(data.id);
        setCategory(data.category);
        setCity(data.city || "");
        setArticleType(data.article_type);
        setTargetKeyword(data.target_keyword || "");
        setTopic(data.h1);
        toast({ title: t("Artikel laddad"), description: t("Granska och publicera när du är klar") });
      } catch (e: any) {
        toast({ title: t("Kunde inte ladda artikel"), description: e.message, variant: "destructive" });
      } finally {
        setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  const { data: history } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, slug, h1, category, status, published_date, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: t("Ämne saknas"), description: t("Fyll i ett ämne först"), variant: "destructive" });
      return;
    }
    setGenerating(true);
    setArticle(null);
    setMeta(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-article", {
        body: {
          topic,
          targetKeyword: targetKeyword || topic,
          category,
          city: city || undefined,
          articleType,
          minLength,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setArticle(data.article);
      setMeta({ attempts: data.attempts, issues: data.issues });
      toast({ title: t("Artikel genererad"), description: t("{n} AI-anrop", { n: data.attempts }) });
    } catch (e: any) {
      toast({ title: t("Fel"), description: e.message || t("Kunde inte generera"), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateField = <K extends keyof GeneratedArticle>(key: K, value: GeneratedArticle[K]) => {
    if (!article) return;
    setArticle({ ...article, [key]: value });
  };

  const updateSection = (i: number, key: keyof Section, value: string) => {
    if (!article) return;
    const next = [...article.sections];
    next[i] = { ...next[i], [key]: value };
    setArticle({ ...article, sections: next });
  };

  const updateFaq = (i: number, key: keyof FaqItem, value: string) => {
    if (!article) return;
    const next = [...article.faq];
    next[i] = { ...next[i], [key]: value };
    setArticle({ ...article, faq: next });
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!article) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        slug: article.slug,
        meta_title: article.metaTitle,
        meta_desc: article.metaDesc,
        h1: article.h1,
        category: article.category,
        article_type: articleType,
        city: city || null,
        target_keyword: targetKeyword || topic,
        published_date: article.publishedDate || today,
        updated_date: today,
        read_time_minutes: article.readTimeMinutes || null,
        intro: article.intro,
        sections: article.sections as any,
        faq: article.faq as any,
        related_links: article.relatedLinks as any,
        status,
        generated_by: "gemini-2.5-pro",
      };
      // Om vi redigerar befintlig artikel: uppdatera, annars upsert
      if (editingId) {
        const { error } = await supabase.from("articles").update(payload).eq("id", editingId);
        if (error) throw error;
        // Markera kö-raden som publicerad
        if (status === "published") {
          await (supabase as any)
            .from("article_queue")
            .update({ status: "published" })
            .eq("generated_article_id", editingId);
        }
      } else {
        const { error } = await supabase.from("articles").upsert([payload], { onConflict: "slug" });
        if (error) throw error;
      }
      toast({
        title: status === "published" ? t("Publicerad") : t("Sparad som utkast"),
        description: `/artiklar/${article.slug}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-queue"] });
    } catch (e: any) {
      toast({ title: t("Sparfel"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ChevronLeft className="h-4 w-4 mr-1" /> {t("Admin")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          {editingId ? <FileEdit className="h-7 w-7 text-primary" /> : <Sparkles className="h-7 w-7 text-accent" />}
          <div>
            <h1 className="font-display text-3xl">{editingId ? t("Granska artikel") : t("Artikelgenerator")}</h1>
            <p className="text-sm text-muted-foreground">
              {editingId ? t("Redigera AI-utkast – publicera när du är nöjd") : t("Gemini 2.5 Pro – anti-AI röstregler aktiva")}
            </p>
          </div>
          {editingId && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => {
              setEditingId(null);
              setArticle(null);
              setSearchParams({});
            }}>
              {t("Avbryt granskning")}
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Generera ny artikel")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="topic">{t("Ämne")}</Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t("Vad kostar SEO 2026")} />
              </div>
              <div>
                <Label htmlFor="kw">{t("Målkeyword")}</Label>
                <Input id="kw" value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} placeholder={t("seo pris 2026")} />
              </div>
              <div>
                <Label>{t("Kategori")}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("Artikeltyp")}</Label>
                <Select value={articleType} onValueChange={setArticleType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARTICLE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city">{t("Stad (valfritt)")}</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Linköping" />
              </div>
              <div>
                <Label htmlFor="min">{t("Minsta längd (tecken)")}</Label>
                <Input id="min" type="number" value={minLength} onChange={(e) => setMinLength(Number(e.target.value) || 5000)} />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("Genererar…")}</> : <><Sparkles className="h-4 w-4 mr-2" /> {t("Generera")}</>}
              </Button>
              <p className="text-xs text-muted-foreground">{t("Tar ofta 30–90 sek. Vid förbjudna fraser regenereras automatiskt (max 3 försök).")}</p>
            </CardContent>
          </Card>

          {/* Preview / history */}
          <div className="space-y-6">
            {loadingExisting && (
              <Card><CardContent className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("Laddar artikel…")}
              </CardContent></Card>
            )}
            {meta && (
              <Card>
                <CardContent className="py-3 flex items-center gap-3 text-sm">
                  {meta.issues && meta.issues.length > 0 ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  )}
                  <span>{t("{n} AI-anrop", { n: meta.attempts })}</span>
                  {meta.issues && meta.issues.length > 0 && (
                    <span className="text-muted-foreground truncate">· {meta.issues.join(" | ")}</span>
                  )}
                </CardContent>
              </Card>
            )}

            {article ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" /> {t("Förhandsgranska & redigera")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t("Slug")}</Label>
                      <Input value={article.slug} onChange={(e) => updateField("slug", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">{t("Kategori")}</Label>
                      <Input value={article.category} onChange={(e) => updateField("category", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t("Meta title ({n}/60)", { n: article.metaTitle.length })}</Label>
                    <Input value={article.metaTitle} onChange={(e) => updateField("metaTitle", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("Meta description ({n}/160)", { n: article.metaDesc.length })}</Label>
                    <Textarea value={article.metaDesc} onChange={(e) => updateField("metaDesc", e.target.value)} rows={2} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("H1")}</Label>
                    <Input value={article.h1} onChange={(e) => updateField("h1", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("Intro")}</Label>
                    <Textarea value={article.intro} onChange={(e) => updateField("intro", e.target.value)} rows={4} />
                  </div>

                  <div>
                    <Label className="text-xs">{t("Sections ({n})", { n: article.sections.length })}</Label>
                    <div className="space-y-3 mt-2">
                      {article.sections.map((s, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-muted/30">
                          <Input className="font-semibold mb-2" value={s.heading} onChange={(e) => updateSection(i, "heading", e.target.value)} />
                          <Textarea value={s.content} onChange={(e) => updateSection(i, "content", e.target.value)} rows={6} className="font-mono text-xs" />
                          <p className="text-xs text-muted-foreground mt-1">{t("{n} tecken", { n: s.content.length })}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">{t("FAQ ({n})", { n: article.faq.length })}</Label>
                    <div className="space-y-2 mt-2">
                      {article.faq.map((f, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-muted/30">
                          <Input className="font-semibold mb-2" value={f.q} onChange={(e) => updateFaq(i, "q", e.target.value)} />
                          <Textarea value={f.a} onChange={(e) => updateFaq(i, "a", e.target.value)} rows={3} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => handleSave("published")} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      {t("Publicera")}
                    </Button>
                    <Button onClick={() => handleSave("draft")} variant="outline" disabled={saving}>
                      {t("Spara utkast")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              !generating && (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    {t('Fyll i formuläret och tryck "Generera" för att skapa en artikel.')}
                  </CardContent>
                </Card>
              )
            )}

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Historik")}</CardTitle>
              </CardHeader>
              <CardContent>
                {!history || history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("Inga sparade artiklar än.")}</p>
                ) : (
                  <div className="divide-y">
                    {history.map((a: any) => (
                      <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{a.h1}</div>
                          <div className="text-xs text-muted-foreground">{a.category} · {new Date(a.created_at).toLocaleDateString("sv-SE")}</div>
                        </div>
                        <Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status}</Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/artiklar/${a.slug}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" /></Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminArticleGenerator;
