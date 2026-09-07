import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ownerAction } from "@/lib/serviceOrders";
export default function CreateOrderFromLead({
  responseId,
}: {
  responseId: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const id = useRef(crypto.randomUUID()),
    lock = useRef(false);
  const navigate = useNavigate(),
    cache = useQueryClient();
  return (
    <div>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            const order = await ownerAction("create", id.current, undefined, {
              response_id: responseId,
            });
            await cache.invalidateQueries({ queryKey: ["service-orders"] });
            navigate("/dashboard/verkstad/arbetsorder", {
              state: { orderId: order.id },
            });
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Kunde inte skapa arbetsorder",
            );
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {busy ? "Skapar…" : "Skapa / öppna arbetsorder"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
