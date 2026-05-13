import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface QueueRow {
  id: string;
  topic: string;
  target_keyword: string;
  category: string;
  city: string | null;
  article_type: string;
  status: string;
  priority: number;
  publish_at: string | null;
  generated_article_id: string | null;
  last_error: string | null;
}

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
const TYPE_LABEL: Record<string, string> = {
  guide: "Guide", news: "Nyhet", comparison: "Jämförelse", "case-study": "Case",
};

const SortableItem = ({ row, onChanged }: { row: QueueRow; onChanged: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const remove = async () => {
    if (!confirm("Ta bort detta köelement?")) return;
    const { error } = await (supabase as any).from("article_queue").delete().eq("id", row.id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else onChanged();
  };

  const setStatus = async (status: string) => {
    const { error } = await (supabase as any).from("article_queue").update({ status }).eq("id", row.id);
    if (error) toast({ title: "Fel", description: error.message, variant: "destructive" });
    else onChanged();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card rounded-xl border p-4 flex items-start gap-3",
        isDragging && "shadow-lg ring-2 ring-primary/30",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 -ml-1 mt-1 rounded hover:bg-muted text-muted-foreground cursor-grab active:cursor-grabbing"
        aria-label="Dra för att ändra prioritet"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("border-0", STATUS_STYLE[row.status])}>{STATUS_LABEL[row.status] || row.status}</Badge>
          <Badge variant="outline">{TYPE_LABEL[row.article_type] || row.article_type}</Badge>
          <Badge variant="outline">{row.category}</Badge>
          {row.city && <Badge variant="outline">{row.city}</Badge>}
          <Badge variant="secondary">Prio {row.priority}</Badge>
        </div>
        <h4 className="font-medium mt-2 truncate">{row.topic}</h4>
        <code className="text-xs text-muted-foreground font-mono">{row.target_keyword}</code>
        {row.last_error && <p className="text-xs text-destructive mt-1">Fel: {row.last_error}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        {row.status === "ready_for_review" && row.generated_article_id && (
          <Button size="sm" variant="outline" asChild>
            <a href={`/admin/artikelgenerator?id=${row.generated_article_id}`}>Granska</a>
          </Button>
        )}
        {(row.status === "skipped" || row.status === "ready_for_review") && (
          <Button size="sm" variant="ghost" onClick={() => setStatus("queued")}>Återställ</Button>
        )}
        <Button size="icon" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

export const QueueDragList = ({
  rows,
  onChanged,
}: {
  rows: QueueRow[];
  onChanged: () => void;
}) => {
  // Lokal state för optimistisk drag-omsortering
  const [items, setItems] = useState<QueueRow[]>(rows);
  useEffect(() => setItems(rows), [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    // Räkna om priority: högst överst (descending). Topp = items.length, botten = 1
    const withPriority = next.map((row, idx) => ({ ...row, priority: next.length - idx }));
    setItems(withPriority);

    // Uppdatera priority i databasen
    try {
      const updates = withPriority.map((row) =>
        (supabase as any).from("article_queue").update({ priority: row.priority }).eq("id", row.id),
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      onChanged();
    } catch (e: any) {
      toast({ title: "Kunde inte spara prioritet", description: e?.message, variant: "destructive" });
      onChanged(); // återställ från server
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((row) => (
            <SortableItem key={row.id} row={row} onChanged={onChanged} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
