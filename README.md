# Cykelhjälpen

Linköpings marknadsplats för cykelreparationer. Beskriv ditt cykelproblem och få upp till fem prisförslag från lokala cykelverkstäder inom 24 timmar.

**Live:** https://cykelhjalpen.se

## Så funkar det

- **Kunder:** Helt gratis. Beskriv felet på cykeln i ett kort formulär och få upp till fem prisförslag från lokala verkstäder i Linköping inom ett dygn. Inget konto krävs.
- **Verkstäder:** Gratis att registrera. Du betalar 50 kr exkl. moms per skickad offert (lead-avgift via Stripe Checkout, engångsbetalning per svar). Max fem verkstäder kan svara per ärende. Konton kräver admin-godkännande innan första offerten kan skickas.

## Tech stack

- **Frontend:** React 18 + TypeScript, Vite 5, Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (Supabase) – Postgres, Auth, Edge Functions, Storage
- **Betalningar:** Stripe Checkout (one-time lead-avgifter)
- **E-post:** Resend via auth-email-hook Edge Function
- **Pakethanterare:** Bun

## Utveckling

```bash
bun install
bun run dev
```
