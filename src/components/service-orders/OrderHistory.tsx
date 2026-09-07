import { money, type ServiceOrder } from "@/lib/serviceOrders";
export default function OrderHistory({ order }: { order: ServiceOrder }) {
  return (
    <div className="space-y-5">
      <section>
        <h2 className="font-semibold mb-3">Prisversioner</h2>
        {!order.quotes.length && (
          <p className="text-sm text-muted-foreground">
            Inget prisförslag ännu.
          </p>
        )}
        <div className="space-y-3">
          {[...order.quotes].reverse().map((quote) => (
            <article key={quote.version} className="rounded-xl border p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">
                  Version {quote.version} · {money(quote.price_ore)} inkl. moms
                </h3>
                <p className="text-sm">
                  {quote.decision === "approved"
                    ? "Godkänt"
                    : quote.decision === "declined"
                      ? "Avböjt"
                      : quote.version === order.quotes.length
                        ? "Väntar på svar"
                        : "Ersatt av ny version"}
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap mt-2">
                {quote.description}
              </p>
              {quote.decided_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Svar via kundlänk av {quote.decision_name} ·{" "}
                  {new Date(quote.decided_at).toLocaleString("sv-SE")}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-3">Servicehistorik</h2>
        <ol className="space-y-3">
          {[...order.history].reverse().map((event, index) => (
            <li key={`${event.at}-${index}`} className="border-l-2 pl-3">
              <p className="text-sm font-medium">{event.label}</p>
              {event.note && (
                <p className="text-sm whitespace-pre-wrap mt-1">{event.note}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(event.at).toLocaleString("sv-SE")} ·{" "}
                {event.actor === "customer" ? "Kund" : "Verkstad"}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
