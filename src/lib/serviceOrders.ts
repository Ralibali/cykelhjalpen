import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
const quoteSchema = z.object({
  version: z.number().int(),
  description: z.string(),
  price_ore: z.number().int().nonnegative(),
  currency: z.literal("SEK"),
  vat_included: z.literal(true),
  created_at: z.string(),
  decision: z.enum(["approved", "declined"]).nullable(),
  decision_name: z.string().optional(),
  decided_at: z.string().optional(),
});
const historySchema = z.object({
  kind: z.string(),
  label: z.string(),
  at: z.string(),
  actor: z.string(),
  note: z.string().optional(),
  version: z.number().optional(),
});
export const orderSchema = z.object({
  id: z.string().uuid(),
  bike: z.string(),
  description: z.string(),
  status: z.enum([
    "intake",
    "awaiting_approval",
    "approved",
    "in_progress",
    "ready",
    "collected",
    "cancelled",
  ]),
  quotes: z.array(quoteSchema),
  history: z.array(historySchema),
  revision: z.number().int(),
  created_at: z.string(),
  workshop_id: z.string().optional(),
  source_response_id: z.string().nullable().optional(),
  frame_number: z.string().nullable().optional(),
  token_expires_at: z.string().nullable().optional(),
  customer: z
    .object({
      name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .optional(),
  workshop: z
    .object({
      name: z.string(),
      email: z.string(),
      phone: z.string().nullable(),
    })
    .optional(),
});
export type ServiceOrder = z.infer<typeof orderSchema>;
export const statusLabels: Record<ServiceOrder["status"], string> = {
  intake: "Inlämnad / planeras",
  awaiting_approval: "Väntar på prisgodkännande",
  approved: "Pris godkänt",
  in_progress: "Arbete pågår",
  ready: "Klar för hämtning",
  collected: "Utlämnad",
  cancelled: "Avbruten",
};
export const money = (ore: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(
    ore / 100,
  );
export function parsePrice(value: string): number | null {
  const clean = value.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, fraction = ""] = clean.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return amount <= 100000000 ? amount : null;
}
async function rpc(
  name: string,
  args: Record<string, unknown>,
): Promise<ServiceOrder> {
  const call = supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await call(name, args);
  if (error) throw new Error(error.message);
  return orderSchema.parse(data);
}
export const ownerAction = (
  action: string,
  id: string,
  revision?: number,
  data: Record<string, unknown> = {},
) =>
  rpc("v2_service_order_owner", {
    p_action: action,
    p_id: id,
    p_revision: revision ?? null,
    p_data: data,
  });
export const customerAction = (
  token: string,
  action = "read",
  version?: number,
  decision?: string,
  name?: string,
  confirmed = false,
) =>
  rpc("v2_service_order_customer", {
    p_token: token,
    p_action: action,
    p_version: version ?? null,
    p_decision: decision ?? null,
    p_name: name ?? null,
    p_confirmed: confirmed,
  });
export async function listOrders(workshop: string) {
  const { data, error } = await supabase
    .from("v2_service_orders" as never)
    .select("*")
    .eq("workshop_id", workshop)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return z.array(orderSchema).parse(data);
}
export function serviceLink(token: string) {
  return `${window.location.origin}/serviceorder#token=${encodeURIComponent(token)}`;
}
export function tokenFromHash(hash: string) {
  const value = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return z.string().uuid().safeParse(value).success ? value! : "";
}
