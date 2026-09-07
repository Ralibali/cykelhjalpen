import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  customerAction,
  money,
  statusLabels,
  tokenFromHash,
} from "@/lib/serviceOrders";
import OrderHistory from "@/components/service-orders/OrderHistory";
export default function ServiceOrderCustomer() {
  const location = useLocation(),
    token = tokenFromHash(location.hash),
    cache = useQueryClient();
  const [name, setName] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const {
    data: order,
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["customer-service-order", token],
    queryFn: () => customerAction(token),
    enabled: !!token,
    retry: false,
    refetchInterval: 30000,
  });
  const quote = order?.quotes.at(-1);
  useEffect(() => {
    setConfirmed(false);
    setError("");
  }, [token, quote?.version]);
  const decide = async (decision: string) => {
    if (lock.current || !quote || !confirmed) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await customerAction(
        token,
        "decide",
        quote.version,
        decision,
        name,
        confirmed,
      );
      cache.setQueryData(["customer-service-order", token], result);
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Svaret kunde inte sparas");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <main
      className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-12"
      data-private="true"
    >
      <Helmet>
        <title>Din arbetsorder – Cykelhjälpen</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <h1 className="font-display text-3xl font-bold">Din cykelservice</h1>
      {!token ? (
        <p>Öppna hela kundlänken som du fick från verkstaden.</p>
      ) : loadError ? (
        <div role="alert">
          <p>
            {loadError instanceof Error
              ? loadError.message
              : "Arbetsordern kunde inte hämtas"}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            Försök igen
          </Button>
        </div>
      ) : isLoading ? (
        <p>Hämtar arbetsordern…</p>
      ) : (
        order && (
          <>
            <header className="rounded-2xl border bg-card p-5">
              <h2 className="text-xl font-semibold">{order.workshop?.name}</h2>
              <p className="text-sm mt-1">
                {[order.workshop?.phone, order.workshop?.email]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="font-semibold mt-4">{order.bike}</p>
              <p className="text-sm mt-1">{statusLabels[order.status]}</p>
              <p className="text-sm whitespace-pre-wrap mt-3">
                {order.description}
              </p>
            </header>
            {order.status === "awaiting_approval" &&
              quote &&
              !quote.decision && (
                <section className="rounded-2xl border-2 border-primary p-5 space-y-4">
                  <h2 className="text-xl font-semibold">Granska totalpriset</h2>
                  <p className="text-2xl font-bold">
                    {money(quote.price_ore)}{" "}
                    <span className="text-sm font-normal">inklusive moms</span>
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {quote.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Version {quote.version}. Detta är hela arbetets föreslagna
                    totalpris och ersätter tidigare prisförslag. Ditt svar
                    sparas i orderns historik. Ingen betalning görs här.
                  </p>
                  <fieldset disabled={busy} className="space-y-3">
                    <label className="block text-sm">
                      Ditt namn
                      <Input
                        maxLength={200}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setConfirmed(false);
                        }}
                      />
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      Jag är kunden eller företräder kunden och har granskat
                      arbetet och det nya totalpriset.
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={!confirmed || !name.trim()}
                        onClick={() => void decide("approved")}
                      >
                        Godkänn {money(quote.price_ore)}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!confirmed || !name.trim()}
                        onClick={() => void decide("declined")}
                      >
                        Avböj prisförslaget
                      </Button>
                    </div>
                  </fieldset>
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </section>
              )}
            <OrderHistory order={order} />
          </>
        )
      )}
    </main>
  );
}
