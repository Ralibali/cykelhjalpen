import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sv } from "date-fns/locale";
import { format, isSameDay } from "date-fns";
import { CalendarDays, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QueueItem {
  id: string;
  topic: string;
  category: string;
  city: string | null;
  status: string;
  publish_at: string | null;
}
interface PublishedItem {
  id: string;
  h1: string;
  category: string;
  published_date: string;
  slug: string;
}

export const PublishCalendar = ({
  queueItems,
  publishedItems,
  onChanged,
}: {
  queueItems: QueueItem[];
  publishedItems: PublishedItem[];
  onChanged: () => void;
}) => {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  // Map: ISO date -> { scheduled, published }
  const dateMap = useMemo(() => {
    const m = new Map<string, { scheduled: QueueItem[]; published: PublishedItem[] }>();
    queueItems.forEach((q) => {
      if (!q.publish_at) return;
      const key = q.publish_at.slice(0, 10);
      if (!m.has(key)) m.set(key, { scheduled: [], published: [] });
      m.get(key)!.scheduled.push(q);
    });
    publishedItems.forEach((p) => {
      const key = p.published_date.slice(0, 10);
      if (!m.has(key)) m.set(key, { scheduled: [], published: [] });
      m.get(key)!.published.push(p);
    });
    return m;
  }, [queueItems, publishedItems]);

  const scheduledDays = useMemo(
    () => queueItems.filter((q) => q.publish_at).map((q) => new Date(q.publish_at!)),
    [queueItems],
  );
  const publishedDays = useMemo(
    () => publishedItems.map((p) => new Date(p.published_date)),
    [publishedItems],
  );

  const selectedKey = selected ? format(selected, "yyyy-MM-dd") : null;
  const dayContent = selectedKey ? dateMap.get(selectedKey) : undefined;
  const unscheduled = useMemo(
    () => queueItems.filter((q) => !q.publish_at && (q.status === "queued" || q.status === "ready_for_review")),
    [queueItems],
  );

  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Publiceringskalender
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            locale={sv}
            selected={selected}
            onSelect={setSelected}
            modifiers={{
              scheduled: scheduledDays,
              published: publishedDays,
            }}
            modifiersClassNames={{
              scheduled: "bg-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold rounded-md",
              published: "bg-primary/15 text-primary font-semibold rounded-md",
            }}
            className="rounded-md"
          />
          <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/20" /> Schemalagd
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary/15" /> Publicerad
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? format(selected, "d MMMM yyyy", { locale: sv }) : "Välj ett datum"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!dayContent || (dayContent.scheduled.length === 0 && dayContent.published.length === 0) ? (
              <p className="text-sm text-muted-foreground">Inget schemalagt eller publicerat denna dag.</p>
            ) : (
              <>
                {dayContent.published.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Publicerade</p>
                    <div className="space-y-1.5">
                      {dayContent.published.map((p) => (
                        <a
                          key={p.id}
                          href={`/artiklar/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2 rounded-md bg-primary/5 hover:bg-primary/10 text-sm"
                        >
                          <span className="truncate flex-1">{p.h1}</span>
                          <Badge variant="outline" className="ml-2">{p.category}</Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {dayContent.scheduled.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Schemalagda</p>
                    <div className="space-y-1.5">
                      {dayContent.scheduled.map((q) => (
                        <ScheduledRow key={q.id} item={q} onChanged={onChanged} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {selected && unscheduled.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schemalägg från kön</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {unscheduled.length} oplanerade i kön. Klicka för att schemalägga till {format(selected, "d MMMM", { locale: sv })}.
              </p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {unscheduled.map((q) => (
                  <UnscheduledRow key={q.id} item={q} date={selected} onChanged={onChanged} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const ScheduledRow = ({ item, onChanged }: { item: QueueItem; onChanged: () => void }) => {
  const unschedule = async () => {
    const { error } = await (supabase as any)
      .from("article_queue")
      .update({ publish_at: null })
      .eq("id", item.id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else { toast({ title: "Avschemalagd" }); onChanged(); }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-amber-500/5 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate">{item.topic}</div>
        <div className="text-xs text-muted-foreground">{item.category}{item.city ? ` · ${item.city}` : ""}</div>
      </div>
      <Button size="icon" variant="ghost" onClick={unschedule} aria-label="Avschemalägg">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const UnscheduledRow = ({ item, date, onChanged }: { item: QueueItem; date: Date; onChanged: () => void }) => {
  const schedule = async () => {
    const iso = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0).toISOString();
    const { error } = await (supabase as any)
      .from("article_queue")
      .update({ publish_at: iso })
      .eq("id", item.id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else { toast({ title: "Schemalagd" }); onChanged(); }
  };

  return (
    <button
      onClick={schedule}
      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted text-left text-sm transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate">{item.topic}</div>
        <div className="text-xs text-muted-foreground">{item.category}{item.city ? ` · ${item.city}` : ""}</div>
      </div>
      <Save className="h-4 w-4 text-muted-foreground" />
    </button>
  );
};
