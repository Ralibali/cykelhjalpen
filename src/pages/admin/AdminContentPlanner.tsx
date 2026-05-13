import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "./AdminDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Plus, Play, SkipForward, Rocket, Download } from "lucide-react";
import { exportCsv } from "@/lib/exportCsv";
import { setSEOMeta } from "@/lib/seoHelpers";
import { CITIES, SERVICE_CATEGORIES } from "@/lib/seoCities";
import { cn } from "@/lib/utils";
import { QueueDragList } from "@/components/admin/QueueDragList";
import { PublishCalendar } from "@/components/admin/PublishCalendar";

// Inline types until supabase types regenerate
interface QueueRow {
  id: string;
  topic: string;
  target_keyword: string;
  category: string;
  city: string | null;
  article_type: string;
  search_intent: string | null;
  estimated_difficulty: string | null;
  why_this_topic: string | null;
  suggested_length: number;
  status: string;
  priority: number;
  publish_at: string | null;
  retry_count: number;
  last_error: string | null;
  generated_article_id: string | null;
  created_at: string;
}

interface SuggestedTopic {
  topic: string;
  targetKeyword: string;
  category: string;
  city?: string;
  articleType: "guide" | "news" | "comparison" | "case-study";
  searchIntent: "informational" | "commercial" | "transactional" | "navigational";
  estimatedDifficulty: "låg" | "medel" | "hög";
  whyThisTopic: string;
  suggestedLength: number;
}

const FOCUS_OPTIONS = [
  { value: "all", label: "Alla – bred mix" },
  { value: "lokal-seo", label: "Lokal SEO (stad × tjänst)" },
  { value: "priser", label: "Priser & kostnader" },
  { value: "jämförelser", label: "Jämförelser" },
  { value: "guide", label: "Guider" },
  { value: "news", label: "Nyheter & trender" },
  { value: "ai-sok", label: "AI-sök (ChatGPT/Perplexity)" },
  { value: "e-handel", label: "E-handel" },
  { value: "startup", label: "Startups" },
  { value: "nybörjare", label: "Nybörjare" },
];

const STATUS_LABEL: Record<string, string> = {
  queued: "I kö",
  generating: "Genererar…",
  ready_for_review: "Klar för granskning",
  published: "Publicerad",
  skipped: "Skippad",
};

const STATUS_STYLE: Record<string, string> = {
  queued: "bg-muted text-foreground",
  generating: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ready_for_review: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  published: "bg-primary/15 text-primary",
  skipped: "bg-destructive/10 text-destructive",
};

const DIFFICULTY_STYLE: Record<string, string> = {
  "låg": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "medel": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "hög": "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const TYPE_LABEL: Record<string, string> = {
  guide: "Guide", news: "Nyhet", comparison: "Jämförelse", "case-study": "Case",
};

const AdminContentPlanner = () => {
  const queryClient = useQueryClient();
  const [count, setCount] = useState(10);
  const [focus, setFocus] = useState("all");
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<SuggestedTopic[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setSEOMeta({ title: "Innehållsplanering – Admin | Updro", description: "Planera och bulk-generera artiklar", noindex: true });
  }, []);

  // Existing articles (for dedupe + calendar)
  const { data: existingArticles } = useQuery({
    queryKey: ["all-article-slugs"],
    queryFn: async () => {
      const { data } = await supabase.from("articles").select("id, slug, h1, category, city, published_date").eq("status", "published");
      return data || [];
    },
  });

  // Queue
  const { data: queue = [] } = useQuery<QueueRow[]>({
    queryKey: ["article-queue"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("article_queue")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as QueueRow[];
    },
  });

  const queuedSlugs = useMemo(() => {
    const s = new Set<string>();
    (existingArticles || []).forEach((a: any) => s.add(a.slug));
    queue.forEach((q) => s.add(q.target_keyword.replace(/\s+/g, "-").toLowerCase()));
    return Array.from(s);
  }, [existingArticles, queue]);

  const handleSuggest = async () => {
    setSuggesting(true);
    setSuggested([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-article-topics", {
        body: { count, focus: focus === "all" ? undefined : focus, excludeSlugs: queuedSlugs },
      });
      if (error) throw error;
      const topics = (data?.topics || []) as SuggestedTopic[];
      if (topics.length === 0) {
        toast({ title: "Inga topics returnerades", description: "Försök igen eller byt fokus.", variant: "destructive" });
      } else {
        setSuggested(topics);
        toast({ title: `${topics.length} topics genererade` });
      }
    } catch (e: any) {
      toast({ title: "Kunde inte generera topics", description: e?.message || "Okänt fel", variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  const saveToQueue = async (t: SuggestedTopic, priority = 0) => {
    const { error } = await (supabase as any).from("article_queue").insert({
      topic: t.topic,
      target_keyword: t.targetKeyword,
      category: t.category,
      city: t.city || null,
      article_type: t.articleType,
      search_intent: t.searchIntent,
      estimated_difficulty: t.estimatedDifficulty,
      why_this_topic: t.whyThisTopic,
      suggested_length: t.suggestedLength,
      priority,
    });
    if (error) {
      toast({ title: "Kunde inte spara", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveOne = async (t: SuggestedTopic, idx: number) => {
    const ok = await saveToQueue(t);
    if (ok) {
      setSuggested((prev) => prev.filter((_, i) => i !== idx));
      queryClient.invalidateQueries({ queryKey: ["article-queue"] });
      toast({ title: "Sparad i kön" });
    }
  };

  const handleSkip = (idx: number) => setSuggested((prev) => prev.filter((_, i) => i !== idx));

  const handleGenerateNow = async (t: SuggestedTopic, idx: number) => {
    const tmpId = `tmp-${idx}`;
    setGeneratingIds((s) => new Set(s).add(tmpId));
    try {
      // Save to queue with high priority and process immediately
      const ok = await saveToQueue(t, 100);
      if (!ok) return;
      setSuggested((prev) => prev.filter((_, i) => i !== idx));
      queryClient.invalidateQueries({ queryKey: ["article-queue"] });
      toast({ title: "Sparad – startar generering" });
      await runQueueProcessor();
    } finally {
      setGeneratingIds((s) => { const n = new Set(s); n.delete(tmpId); return n; });
    }
  };

  const runQueueProcessor = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-article-queue", { body: {} });
      if (error) throw error;
      toast({ title: `Bearbetade ${data?.processed ?? 0} artiklar` });
      queryClient.invalidateQueries({ queryKey: ["article-queue"] });
      queryClient.invalidateQueries({ queryKey: ["all-article-slugs"] });
    } catch (e: any) {
      toast({ title: "Fel vid bearbetning", description: e?.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const filteredSuggestions = useMemo(() => {
    return suggested.filter((t) => {
      if (filterDifficulty !== "all" && t.estimatedDifficulty !== filterDifficulty) return false;
      if (filterType !== "all" && t.articleType !== filterType) return false;
      return true;
    });
  }, [suggested, filterDifficulty, filterType]);

  const exportQueue = () => {
    const rows = queue.map((q) => ({
      topic: q.topic, target_keyword: q.target_keyword, category: q.category, city: q.city || "",
      article_type: q.article_type, status: q.status, priority: q.priority,
      publish_at: q.publish_at || "", created_at: q.created_at,
    }));
    exportCsv(rows, "article-queue");
  };

  // Coverage stats for autopilot focus
  const coverage = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    (existingArticles || []).forEach((a: any) => {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      if (a.city) byCity[a.city] = (byCity[a.city] || 0) + 1;
    });
    const weakCategories = SERVICE_CATEGORIES.filter((c) => (byCategory[c.name] || 0) < 3).map((c) => c.name);
    const weakCities = CITIES.filter((c) => (byCity[c.name] || 0) < 1).map((c) => c.name);
    return { byCategory, byCity, weakCategories, weakCities, total: existingArticles?.length || 0 };
  }, [existingArticles]);

  return (
    <AdminLayout>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Innehållsplanering</h1>
          <p className="text-sm text-muted-foreground mt-1">Planera och bulk-generera artiklar</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runQueueProcessor} disabled={processing} variant="outline">
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Bearbeta kö nu
          </Button>
          <Button onClick={() => setAutopilotOpen(true)}>
            <Rocket className="h-4 w-4 mr-2" /> Starta autopilot
          </Button>
        </div>
      </div>

      <Tabs defaultValue="suggest">
        <TabsList>
          <TabsTrigger value="suggest">Föreslå topics</TabsTrigger>
          <TabsTrigger value="queue">Artikelkö ({queue.filter((q) => q.status !== "published").length})</TabsTrigger>
          <TabsTrigger value="schedule">Publiceringsschema</TabsTrigger>
        </TabsList>

        {/* TAB 1: SUGGEST */}
        <TabsContent value="suggest" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Generera topic-förslag</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <Label>Antal topics: {count}</Label>
                  <Slider value={[count]} onValueChange={(v) => setCount(v[0])} min={5} max={20} step={1} className="mt-3" />
                </div>
                <div>
                  <Label>Fokus</Label>
                  <Select value={focus} onValueChange={setFocus}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{FOCUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSuggest} disabled={suggesting} size="lg" className="w-full md:w-auto">
                {suggesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generera förslag
              </Button>
            </CardContent>
          </Card>

          {suggested.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">Filter:</span>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Svårighet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla svårigheter</SelectItem>
                    <SelectItem value="låg">Låg</SelectItem>
                    <SelectItem value="medel">Medel</SelectItem>
                    <SelectItem value="hög">Hög</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Typ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla typer</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="news">Nyhet</SelectItem>
                    <SelectItem value="comparison">Jämförelse</SelectItem>
                    <SelectItem value="case-study">Case</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground ml-auto">{filteredSuggestions.length} av {suggested.length}</span>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {filteredSuggestions.map((t, idx) => {
                  const realIdx = suggested.indexOf(t);
                  return (
                    <Card key={`${t.topic}-${idx}`} className="overflow-hidden">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display font-semibold leading-snug">{t.topic}</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{TYPE_LABEL[t.articleType]}</Badge>
                          <Badge variant="outline">{t.searchIntent}</Badge>
                          <Badge className={cn("border-0", DIFFICULTY_STYLE[t.estimatedDifficulty])}>{t.estimatedDifficulty}</Badge>
                          <Badge variant="outline">{t.category}</Badge>
                          {t.city && <Badge variant="outline">{t.city}</Badge>}
                        </div>
                        <code className="block text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">{t.targetKeyword}</code>
                        {t.whyThisTopic && <p className="text-sm text-muted-foreground leading-relaxed">{t.whyThisTopic}</p>}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button size="sm" onClick={() => handleGenerateNow(t, realIdx)}>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generera nu
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleSaveOne(t, realIdx)}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Spara till kö
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleSkip(realIdx)}>
                            <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Hoppa över
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB 2: QUEUE */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">
              {queue.filter((q) => q.status === "queued").length} i kö ·{" "}
              {queue.filter((q) => q.status === "ready_for_review").length} klara för granskning
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportQueue}><Download className="h-4 w-4 mr-2" />Exportera CSV</Button>
              <Button size="sm" onClick={runQueueProcessor} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Generera alla queued
              </Button>
            </div>
          </div>

          {queue.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Kön är tom. Generera förslag och spara dem hit.</CardContent></Card>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Dra och släpp för att ändra prioritet (högst överst körs först).</p>
              <QueueDragList
                rows={queue as any}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ["article-queue"] })}
              />
            </>
          )}
        </TabsContent>

        {/* TAB 3: SCHEDULE */}
        <TabsContent value="schedule" className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox label="Totalt publicerade" value={coverage.total} />
            <StatBox label="Klara för granskning" value={queue.filter((q) => q.status === "ready_for_review").length} />
            <StatBox label="I kö" value={queue.filter((q) => q.status === "queued").length} />
            <StatBox label="Schemalagda" value={queue.filter((q) => q.publish_at).length} />
          </div>

          <PublishCalendar
            queueItems={queue.map((q) => ({
              id: q.id, topic: q.topic, category: q.category, city: q.city,
              status: q.status, publish_at: q.publish_at,
            }))}
            publishedItems={(existingArticles || []).map((a: any) => ({
              id: a.id || a.slug,
              h1: a.h1 || a.slug,
              category: a.category,
              published_date: a.published_date || new Date().toISOString().slice(0, 10),
              slug: a.slug,
            }))}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ["article-queue"] })}
          />

          <Card>
            <CardHeader><CardTitle className="text-base">Täckning per kategori</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-2 text-sm">
              {SERVICE_CATEGORIES.map((c) => {
                const n = coverage.byCategory[c.name] || 0;
                const weak = n < 3;
                return (
                  <div key={c.slug} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                    <span>{c.name}</span>
                    <span className={cn("text-xs font-medium", weak ? "text-destructive" : "text-primary")}>{n} artikl{n === 1 ? "el" : "ar"}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Städer utan artiklar ({coverage.weakCities.length}/{CITIES.length})</CardTitle></CardHeader>
            <CardContent>
              {coverage.weakCities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Alla städer har minst en artikel.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {coverage.weakCities.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AutopilotDialog
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
        existingSlugs={queuedSlugs}
        weakCategories={coverage.weakCategories}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["article-queue"] });
          setAutopilotOpen(false);
        }}
      />
    </AdminLayout>
  );
};

const StatBox = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-card rounded-xl border p-5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-3xl font-bold font-display mt-1">{value}</p>
  </div>
);

const AutopilotDialog = ({
  open, onOpenChange, existingSlugs, weakCategories, onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingSlugs: string[];
  weakCategories: string[];
  onComplete: () => void;
}) => {
  const [target, setTarget] = useState(25);
  const [autopilotFocus, setAutopilotFocus] = useState("all");
  const [running, setRunning] = useState(false);

  const start = async () => {
    setRunning(true);
    try {
      // 1. Suggest topics in batches of max 20 to fit token limits
      const remaining = Math.min(100, target);
      const batches = Math.ceil(remaining / 20);
      let totalAdded = 0;
      const usedSlugs = [...existingSlugs];

      for (let b = 0; b < batches; b++) {
        const batchCount = Math.min(20, remaining - totalAdded);
        if (batchCount <= 0) break;
        const focusToUse = autopilotFocus === "all"
          ? (weakCategories.length > 0 ? `lokal-seo + kategorier: ${weakCategories.slice(0, 3).join(", ")}` : undefined)
          : autopilotFocus;

        const { data, error } = await supabase.functions.invoke("suggest-article-topics", {
          body: { count: batchCount, focus: focusToUse, excludeSlugs: usedSlugs },
        });
        if (error) throw error;
        const topics = (data?.topics || []) as SuggestedTopic[];
        if (topics.length === 0) break;

        const rows = topics.map((t) => ({
          topic: t.topic,
          target_keyword: t.targetKeyword,
          category: t.category,
          city: t.city || null,
          article_type: t.articleType,
          search_intent: t.searchIntent,
          estimated_difficulty: t.estimatedDifficulty,
          why_this_topic: t.whyThisTopic,
          suggested_length: t.suggestedLength,
        }));
        const { error: insertErr } = await (supabase as any).from("article_queue").insert(rows);
        if (insertErr) throw insertErr;
        totalAdded += topics.length;
        topics.forEach((t) => usedSlugs.push(t.targetKeyword.replace(/\s+/g, "-").toLowerCase()));
      }

      toast({
        title: `Autopilot startad`,
        description: `${totalAdded} topics i kön. Klicka "Bearbeta kö nu" eller vänta på cron-jobbet.`,
      });
      onComplete();
    } catch (e: any) {
      toast({ title: "Autopilot misslyckades", description: e?.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Starta autopilot</DialogTitle>
          <DialogDescription>
            Fyller kön med Gemini-föreslagna topics. Alla artiklar kräver manuell granskning före publicering.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <Label>Antal artiklar att planera: {target}</Label>
            <Slider value={[target]} onValueChange={(v) => setTarget(v[0])} min={10} max={100} step={5} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">Max 100 per körning. Genereringen körs sedan i bakgrunden (5 åt gången, var 6:e timme).</p>
          </div>
          <div>
            <Label>Fokus</Label>
            <Select value={autopilotFocus} onValueChange={setAutopilotFocus}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{FOCUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            {autopilotFocus === "all" && weakCategories.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">Auto-väger mot svaga kategorier: {weakCategories.slice(0, 3).join(", ")}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={start} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
            Starta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminContentPlanner;
