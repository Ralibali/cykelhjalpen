import { useRef, useState } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkshopContext } from "@/components/cykelhjalpen/WorkshopLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  listOrders,
  ownerAction,
  statusLabels,
  type ServiceOrder,
} from "@/lib/serviceOrders";
import OrderWorkspace from "@/components/service-orders/OrderWorkspace";
const empty = {
  name: "",
  email: "",
  phone: "",
  bike: "",
  frame_number: "",
  description: "",
};
export default function WorkshopServiceOrders() {
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>();
  const cache = useQueryClient();
  const location = useLocation();
  const initialOrder =
    (location.state as { orderId?: string } | null)?.orderId || null;
  const [opened, setOpened] = useState<string[]>(
    initialOrder ? [initialOrder] : [],
  );
  const [form, setForm] = useState(empty),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(initialOrder);
  const [id, setId] = useState(() => crypto.randomUUID());
  const lock = useRef(false);
  const {
    data: orders = [],
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["service-orders", workshop.id],
    queryFn: () => listOrders(workshop.id),
    enabled: workshop.approved,
    refetchInterval: 30000,
  });
  const onChange = (order: ServiceOrder) => {
    cache.setQueryData<ServiceOrder[]>(
      ["service-orders", workshop.id],
      (old) => [order, ...(old || []).filter((x) => x.id !== order.id)],
    );
  };
  const create = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const order = await ownerAction("create", id, undefined, form);
      onChange(order);
      setSelected(order.id);
      setOpened((old) => (old.includes(order.id) ? old : [...old, order.id]));
      setId(crypto.randomUUID());
      setForm(empty);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (!workshop.approved)
    return <p>Arbetsorder blir tillgängliga när verkstaden är godkänd.</p>;
  const query = search.trim().toLocaleLowerCase("sv-SE");
  const filtered = orders.filter((order) =>
    [
      order.customer?.name,
      order.customer?.email,
      order.customer?.phone,
      order.bike,
      order.frame_number,
    ].some((value) => value?.toLocaleLowerCase("sv-SE").includes(query)),
  );
  const current = orders.find((order) => order.id === selected);
  return (
    <div className="space-y-6" data-private="true">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Arbetsorder</h1>
          <p className="text-muted-foreground mt-2">
            Från inlämning och prisgodkännande till utförd service och hämtning.
          </p>
        </div>
        <Button onClick={() => setOpen(!open)}>
          {open ? "Dölj formulär" : "Ny order för egen kund"}
        </Button>
      </header>
      {open && (
        <form
          className="rounded-2xl border bg-card p-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <h2 className="font-semibold">Egen kund</h2>
          <fieldset disabled={busy} className="space-y-3">
            {(
              [
                ["name", "Kundens namn *"],
                ["email", "E-post"],
                ["phone", "Telefon"],
                ["bike", "Cykel / modell *"],
                ["frame_number", "Ramnummer, valfritt"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                {label}
                <Input
                  maxLength={200}
                  type={
                    key === "email" ? "email" : key === "phone" ? "tel" : "text"
                  }
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Ange minst e-post eller telefon. Ingen kontakt tas automatiskt.
            </p>
            <label className="block text-sm">
              Vad ska undersökas eller göras? *
              <Textarea
                maxLength={5000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <Button
              type="submit"
              disabled={
                !form.name.trim() ||
                !form.bike.trim() ||
                !form.description.trim() ||
                (!form.email.trim() && !form.phone.trim())
              }
            >
              {busy ? "Sparar…" : "Skapa arbetsorder"}
            </Button>
          </fieldset>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        Vunna och upplåsta uppdrag kan läggas till från Affärsöversikt. Här
        visas de 200 senast uppdaterade arbetsordrarna, inklusive avslutad
        service.
      </p>
      <Input
        aria-label="Sök arbetsorder"
        placeholder="Sök kund, kontakt, cykel eller ramnummer"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loadError ? (
        <div role="alert">
          Arbetsordrarna kunde inte hämtas.{" "}
          <Button onClick={() => void refetch()}>Försök igen</Button>
        </div>
      ) : isLoading ? (
        <p>Hämtar arbetsorder…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(180px,260px)_1fr]">
          <nav aria-label="Välj arbetsorder" className="space-y-2">
            {filtered.length ? (
              filtered.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelected(order.id);
                    setOpened((old) =>
                      old.includes(order.id) ? old : [...old, order.id],
                    );
                  }}
                  aria-pressed={selected === order.id}
                  className={`block w-full rounded-xl border p-3 text-left ${selected === order.id ? "border-primary bg-primary/5" : "bg-card"}`}
                >
                  <span className="block font-medium">
                    {order.customer?.name}
                  </span>
                  <span className="block text-sm">{order.bike}</span>
                  <span className="block text-xs text-muted-foreground mt-1">
                    {statusLabels[order.status]} ·{" "}
                    {new Date(order.created_at).toLocaleDateString("sv-SE")}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Inga arbetsorder matchar.
              </p>
            )}
          </nav>
          {current ? (
            <div>
              {opened.map((orderId) => {
                const order = orders.find((item) => item.id === orderId);
                return order ? (
                  <div key={orderId} hidden={selected !== orderId}>
                    <OrderWorkspace order={order} onChange={onChange} />
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="rounded-xl border p-5 text-muted-foreground">
              Välj en arbetsorder eller lägg till din första kund.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
