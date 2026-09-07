import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ownerAction,
  parsePrice,
  serviceLink,
  statusLabels,
  type ServiceOrder,
} from "@/lib/serviceOrders";
import OrderHistory from "./OrderHistory";
export default function OrderWorkspace({
  order,
  onChange,
}: {
  order: ServiceOrder;
  onChange: (order: ServiceOrder) => void;
}) {
  const [description, setDescription] = useState(""),
    [price, setPrice] = useState(""),
    [note, setNote] = useState(""),
    [base, setBase] = useState(order.revision);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [link, setLink] = useState(""),
    [copied, setCopied] = useState(false);
  const lock = useRef(false),
    pendingToken = useRef<string | null>(null);
  const closed = ["collected", "cancelled"].includes(order.status),
    changed = order.revision !== base;
  const action = async (
    kind: string,
    data: Record<string, unknown> = {},
    draft = false,
  ) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const updated = await ownerAction(
        kind,
        order.id,
        draft ? base : order.revision,
        data,
      );
      onChange(updated);
      if (kind === "quote") {
        setDescription("");
        setPrice("");
      }
      if (kind === "note") setNote("");
      if (kind === "link") {
        setLink(serviceLink(String(data.token)));
        pendingToken.current = null;
        setCopied(false);
      }
      if (kind === "revoke") {
        setLink("");
        pendingToken.current = null;
      }
      // A successful action never silently rebases another unsaved form.
      if (draft || (!description && !price && !note)) setBase(updated.revision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const next =
    order.status === "approved"
      ? "in_progress"
      : order.status === "in_progress"
        ? "ready"
        : order.status === "ready"
          ? "collected"
          : null;
  return (
    <article
      className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6"
      data-private="true"
    >
      <header>
        <h2 className="text-xl font-semibold">
          {order.bike} · {order.customer?.name}
        </h2>
        <p className="text-sm mt-1">{statusLabels[order.status]}</p>
        <p className="text-sm text-muted-foreground">
          {[order.customer?.email, order.customer?.phone]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {order.frame_number && (
          <p className="text-sm">Ramnummer: {order.frame_number}</p>
        )}
        <p className="whitespace-pre-wrap text-sm mt-3">{order.description}</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {next && (
          <Button
            disabled={busy}
            onClick={() => void action("status", { status: next })}
          >
            {statusLabels[next]}
          </Button>
        )}
        {!closed && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm("Avbryta arbetsordern? Historiken finns kvar.")
              )
                void action("status", { status: "cancelled" });
            }}
          >
            Avbryt order
          </Button>
        )}
      </div>
      <section className="rounded-xl bg-muted/50 p-4 space-y-3">
        <h3 className="font-semibold">Kundens status- och godkännandelänk</h3>
        <p className="text-sm text-muted-foreground">
          Dela länken med kunden själv. Den ger åtkomst till denna arbetsorder i
          90 dagar. En ny länk ersätter den gamla.
        </p>
        <div className="flex flex-wrap gap-2">
          {!closed && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                pendingToken.current ??= crypto.randomUUID();
                void action("link", { token: pendingToken.current });
              }}
            >
              Skapa ny kundlänk
            </Button>
          )}
          {order.token_expires_at && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void action("revoke")}
            >
              Återkalla länk
            </Button>
          )}
        </div>
        {link && (
          <div className="space-y-2">
            <Input
              aria-label="Kundlänk"
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setError("Markera och kopiera länken i fältet.");
                }
              }}
            >
              {copied ? "Kopierad" : "Kopiera länk"}
            </Button>
          </div>
        )}
      </section>
      {!closed && (
        <fieldset disabled={busy} className="space-y-5">
          {changed && (description || price || note) && (
            <div role="alert" className="rounded-lg border p-3 text-sm">
              Arbetsordern har ändrats. Läs senaste priset och historiken innan
              du sparar ditt utkast.
              <Button
                className="mt-2"
                variant="outline"
                size="sm"
                onClick={() => setBase(order.revision)}
              >
                Jag har jämfört med senaste versionen
              </Button>
            </div>
          )}
          {["intake", "awaiting_approval", "approved", "in_progress"].includes(
            order.status,
          ) && (
            <section className="space-y-3">
              <h3 className="font-semibold">Nytt totalpris att godkänna</h3>
              <p className="text-sm text-muted-foreground">
                Ange hela arbetets nya fasta totalpris inklusive moms och
                eventuellt tidigare arbete. Kunden behöver godkänna den senaste
                versionen innan arbetet fortsätter.
              </p>
              <label className="block text-sm">
                Arbete och delar som ingår
                <Textarea
                  maxLength={5000}
                  value={description}
                  onChange={(e) => {
                    if (!description && !price && !note)
                      setBase(order.revision);
                    setDescription(e.target.value);
                  }}
                />
              </label>
              <label className="block text-sm">
                Totalpris inkl. moms, kr
                <Input
                  inputMode="decimal"
                  placeholder="1250,00"
                  value={price}
                  onChange={(e) => {
                    if (!description && !price && !note)
                      setBase(order.revision);
                    setPrice(e.target.value);
                  }}
                />
              </label>
              <Button
                disabled={
                  !description.trim() || parsePrice(price) === null || changed
                }
                onClick={() =>
                  void action(
                    "quote",
                    { description, price_ore: parsePrice(price) },
                    true,
                  )
                }
              >
                Spara prisförslag
              </Button>
            </section>
          )}
          <section className="space-y-3">
            <h3 className="font-semibold">Lägg till utförd service</h3>
            <p className="text-sm text-muted-foreground">
              Anteckningen visas även för kunden och finns kvar i historiken.
            </p>
            <Textarea
              aria-label="Utförd service"
              maxLength={3000}
              value={note}
              onChange={(e) => {
                if (!description && !price && !note) setBase(order.revision);
                setNote(e.target.value);
              }}
            />
            <Button
              variant="outline"
              disabled={!note.trim() || changed}
              onClick={() => void action("note", { note }, true)}
            >
              Spara serviceanteckning
            </Button>
          </section>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <OrderHistory order={order} />
    </article>
  );
}
