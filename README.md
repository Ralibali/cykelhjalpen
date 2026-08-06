# Cykelhjälpen

Marknadsplats för cykelreparationer i Linköping, Norrköping, Uppsala och Lund. Beskriv ditt cykelproblem och få upp till tre prisförslag från lokala cykelverkstäder inom 24 timmar.

**Live:** https://cykelhjalpen.se

## Så funkar det

- **Kunder:** Helt gratis. Beskriv felet på cykeln i ett kort formulär och få upp till tre prisförslag från lokala verkstäder inom ett dygn. Inget konto krävs.
- **Verkstäder:** Gratis att registrera, gratis att lämna offert. Du betalar 50 kr exkl. moms först när kunden väljer din offert — inget att förlora på att svara. Max tre verkstäder kan svara per ärende. Konton kräver admin-godkännande innan första offerten kan skickas.

## Tech stack

- **Frontend:** React 18 + TypeScript, Vite 5, Tailwind CSS, shadcn/ui
- **Backend:** Supabase – Postgres, Auth, Edge Functions, Storage
- **Betalningar:** Stripe Checkout (one-time lead-avgifter)
- **E-post:** Resend via auth-email-hook Edge Function
- **Pakethanterare:** Bun

## Utveckling

```bash
bun install
bun run dev
```
