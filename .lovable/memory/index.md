# Memory: index.md

# Updro.se – Design System & Decisions

## Colors (HSL)
- Primary/brand-blue: 217 91% 53% (#2563EB)
- Accent/mint: 160 96% 43% (#06D6A0)
- Brand dark: 224 54% 8% (#0A0F1E)
- Coral: 0 100% 71% (#FF6B6B)

## Fonts
- Display: Space Grotesk (700 for headings)
- Body: Plus Jakarta Sans (replaced Inter – user found Inter too generic)
- Mono: JetBrains Mono

## Logo
- "upd" in foreground + "ro" in brand-blue, Zap icon before

## Architecture
- Types in src/types/index.ts
- Constants in src/lib/constants.ts
- Home sections in src/components/home/
- Navbar: src/components/Navbar.tsx
- Footer: src/components/Footer.tsx
- Dashboard sidebar uses Outlet pattern — SupplierLayout.tsx & BuyerLayout.tsx
- Pages inside dashboard must NOT wrap themselves in DashboardLayout

## Rules
- **Numbers < 12 MUST be written as Swedish words** — use `numWord()` from `src/lib/numberWords.ts`
- Always use semantic design tokens, never hardcoded colors in components

## Backend: Lovable Cloud (Supabase) connected
