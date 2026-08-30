# V2 CONTRACTS — Cykelhjälpen integration bible

**Status:** binding for all V2 implementation swarms · **Branch:** `v2/contracts` · **Date:** 2026-08-30
**Baseline:** V1 main @ `f4d4d25` (live product: pay-per-win 50 kr excl. VAT, 3 approved workshops, 21 requests, 5 quotes — cross-verified 2026-08-30).

This document is the stage-gate contract for ~13 parallel implementation swarms. If a swarm needs something not specified here, it MUST propose a contract change to the architect instead of inventing local conventions.

**Hard rules (from HQ, repeated because everything hangs on them):**
1. Migrations are ADDITIVE ONLY. No `DROP`/`ALTER` of existing columns, no data rewrites. New tables/columns/indexes/policies only. Every migration carries a rollback note in its header comment.
2. Live charging behavior is unchanged. The canonical pricing config seeds to exactly today's rule: **50 SEK excl. VAT per won lead, 25% VAT, 0% commission FOREVER**. `v2_pricing_config` enforces `commission_bps = 0` with a CHECK constraint.
3. No private customer/workshop fields on public surfaces. Public reads happen through scoped `security_invoker` views or SECURITY DEFINER RPCs that whitelist columns — never through broad table grants to `anon`.
4. All new tables are prefixed `v2_` (zero collision risk with legacy Updro tables and unambiguous ownership). All new edge functions are prefixed `v2-`.
5. TypeScript follows existing conventions: `_shared/*` is Deno (npm: specifiers, `.ts` extension imports); `src/lib/*` is Vite/vitest (extensionless imports, `vitest` tests).

---

## 0. Reading guide

| Section | Content |
|---|---|
| §1 | Table/function ownership map (which swarm owns what) |
| §2 | Schema design — every domain, exact DDL-level names |
| §3 | Edge-function API contracts (request/response JSON) |
| §4 | Domain event catalog (data-moat) |
| §5 | Feature-flag registry |
| §6 | RLS policy conventions |
| §7 | Rollout / activation gates per feature |
| §8 | Cross-cutting invariants & glossary |

---

## 1. Ownership map

Swarm IDs are stable; use them in commit messages (`feat(S4): …`) and PR labels.

| Swarm | Domain | Owns (tables) | Owns (edge functions) | Consumes |
|---|---|---|---|---|
| **S1 liquidity-core** | areas_served activation, eligibility engine, cluster support | `v2_city_configs`, `v2_city_clusters` (+ members via column), workshops new columns (`service_area_mode`, `cluster_opt_in`) | `v2-eligibility-check` | flags, city-state resolver |
| **S2 lifecycle-automation** | zero-quote rescue, nudges, winner activation reminders, stalled-winner recovery, customer re-selection, onboarding lifecycle | `v2_nudge_log`, `v2_rescue_actions`, `v2_workshop_onboarding` | `v2-zero-quote-rescue` (cron), `v2-winner-reminders` (cron), `v2-stalled-winner-recovery` (cron), `v2-reselect-winner` | flags, events, notifications.ts, choice-nudge.ts |
| **S3 reviews-outcomes** | outcome lifecycle, verified reviews, moderation, aggregates, quote-card/profile display data | `v2_job_outcomes`, `v2_reviews`, `v2_workshop_review_stats` | `v2-report-outcome`, `v2-confirm-outcome`, `v2-outcome-invites` (cron), `v2-submit-review`, `v2-respond-review`, `v2-moderate-review` | events, flags, token-view.ts |
| **S4 directory-profiles** | scoped public workshop profiles + directory, visibility/consent controls, ghosted-lead handling surface | `v2_public_workshop_directory` (view), workshops new column (`public_profile_opt_in`), `v2_ghosted_lead_claims` | `v2-get-public-workshop` (public), `v2-claim-ghosted-lead` (workshop) | S3 aggregates, city configs |
| **S5 prisindex** | Cykelprisindex engine, guide-price fallback | `v2_price_index_stats`, `v2_guide_prices` | `v2-compute-price-index` (cron/admin), `v2-get-price-index` (public) | workshop_responses, v2_job_outcomes, flags |
| **S6 data-moat** | original-data event collection, analytics plumbing | `v2_events` | `v2-emit-event` (internal), `v2-client-event` (public, hardened) | event catalog §4 |
| **S7 seo-content** | data-aware SEO architecture, content engine surface (NO mass generation) | `v2_content_pages` | `v2-content-publish` (admin) | S5 stats, S4 directory |
| **S8 retention** | workshop + customer retention lifecycle (consent-aware) | `v2_retention_contacts`, `v2_lifecycle_messages` | `v2-retention-cron` (cron), `v2-retention-unsubscribe` (public token) | notifications.ts, events |
| **S9 subscriptions** | subscription/tier capability (OFF by default), pricing experiments | `v2_plans`, `v2_workshop_subscriptions`, `v2_entitlement_overrides`, `v2_pricing_experiments` | `v2-create-subscription-checkout`, `v2-subscription-webhook`, `v2-admin-entitlement-override` | flags, Stripe, pricing config |
| **S10 admin-console** | admin UI for flags, city states, moderation, overrides, supply health | `v2_supply_snapshots` (writes via RPC from S2/S1 data) | `v2-admin-flags`, `v2-admin-city-state`, `v2-supply-snapshot` (cron) | everything read-only |
| **S11 customer-frontend** | wizard, quote comparison, re-selection UI, review submit UI | — (src only) | — | S2/S3/S5 contracts, `src/lib/v2/*` |
| **S12 workshop-frontend** | dashboard, billing, settings, profile opt-in UI, ghosted-lead claim UI | — (src only) | — | S1/S4/S9 contracts |
| **S13 qa-infra** | migration runner, seed verification, cron scheduling verification (registry R4!), type regeneration | — | — | all migrations |

**Shared foundation (already shipped by this branch — do not re-implement):**
- `supabase/functions/_shared/v2/` — `pricing-config.ts`, `flags.ts`, `city-state.ts`, `events.ts`, `config-schema.ts`
- `src/lib/v2/` — `contracts.ts`, `flags.ts`, `pricing.ts`, `cities.ts`, `events.ts`
- `supabase/migrations/20260830_v2_contracts_*.sql` — the full schema below, already applied as DDL.

**Existing tables swarms will touch (READ-ONLY unless noted):** `bike_repair_requests`, `workshop_responses`, `workshops` (S1/S4 add the columns listed in §2.2 — nobody else alters it), `lead_charges`, `notification_events`, `notifications`. Status enums on existing tables are TEXT conventions — S2 may add the request status value `'awaiting_reselection'` (documented in §2.2) but must keep all existing values working.

---

## 2. Schema design

All objects live in `public`. Every table: `id uuid primary key default gen_random_uuid()` unless stated, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` where mutable. Enums are Postgres ENUM types prefixed `v2_` (they are additive; dropping requires a future migration, so the value lists below are FINAL for the build).

### 2.1 Foundation: flags, city config, pricing, guide prices, events

**Enum `v2_city_state`**: `'RESEARCH'`, `'SUPPLY_BUILDING'`, `'LIMITED'`, `'ACTIVE'`, `'PAUSED'`.
Semantics (activation rules in §7):
- `RESEARCH` — no public demand capture; wizard soft-gates to notify-me.
- `SUPPLY_BUILDING` — demand capture open, requests always `pending_approval` + founder review; outreach counters include pending demand (Insight 12 fix).
- `LIMITED` — demand open, auto-approve ON regardless of 30-day-activity (cold-start inversion), directories/prisindex hidden.
- `ACTIVE` — full marketplace behavior, all public surfaces eligible.
- `PAUSED` — demand capture soft-gated, existing requests finish their lifecycle.

**Table `v2_city_configs`** — one row per city. Key is the ASCII slug used in `src/lib/cykelCities.ts`.
- `city_slug text primary key` — `'linkoping' | 'norrkoping' | 'uppsala' | 'lund'` (city #5 = new row, NOT activated)
- `city_name text not null` — exact-match string used in `bike_repair_requests.city` / `workshops.city` (`'Linköping'`, …)
- `state v2_city_state not null default 'RESEARCH'`
- `cluster_slug text null references v2_city_clusters(cluster_slug)`
- `demand_open boolean not null` — derived-at-write from state, kept explicit so ops can override per city without a deploy
- `auto_approve_requests boolean not null` — when true, `submit-bike-request` auto-approves without the active-workshop gate
- `directory_indexable boolean not null default false` — SEO gate for §7.4
- `price_index_public boolean not null default false` — sample-gate override for §7.5
- `target_active_workshops integer not null default 5` — marknadsplan target
- `notes text null`
- Seed: linkoping ACTIVE, norrkoping SUPPLY_BUILDING, uppsala LIMITED, lund LIMITED (per HQ; easily changeable by admin/S10).

**Table `v2_city_clusters`** — cluster support (Insight 7: Östergötland as ONE supply market).
- `cluster_slug text primary key` (`'ostergotland'`, future `'skane'`)
- `name text not null`, `active boolean not null default true`
- Seed: `ostergotland`; linkoping + norrkoping rows point at it.

**Table `v2_feature_flags`** — registry §5.1.
- `key text primary key` — namespaced `v2.<area>.<name>` (see §5)
- `enabled boolean not null default false`
- `rollout jsonb not null default '{}'` — optional `{ "cities": ["linkoping"], "percent": 0-100 }`; resolvers treat absent keys as OFF
- `description text not null default ''`
- `updated_by uuid null` (auth.users), `updated_at`

**Table `v2_pricing_config`** — canonical pricing layer. Live rule is row `key='winner_fee'`.
- `key text primary key` — `'winner_fee'` (more keys only via new contract revision)
- `amount_ore integer not null` — **5000** (50 kr)
- `currency text not null default 'SEK'`
- `vat_rate numeric(5,4) not null default 0.25`
- `commission_bps integer not null default 0` — **CHECK (commission_bps = 0)** — 0% commission FOREVER is enforced by the database, not by convention
- `credit_pack_min integer not null default 1`, `credit_pack_max integer not null default 100`, `credit_unit_ore integer not null default 5000`
- `free_wins_on_signup integer not null default 2`
- `effective_from timestamptz not null default now()`, `active boolean not null default true`
- `notes text null`
- Partial unique index `one active row per key`. Seed = exact live rule. Reading order: newest active row; fall back to compile-time constants (identical values) if the table is unreachable — helpers in `_shared/v2/pricing-config.ts` do exactly this.

**Table `v2_guide_prices`** — fallback "riktpriser" for prisindex (replaces hardcoded FALLBACK_PRICES over time).
- `repair_category text not null`, `bike_type text null` (null = generic), `city_slug text null` (null = national)
- `price_min_sek integer not null`, `price_max_sek integer not null`, `typical_sek integer null`
- `label text not null default 'riktpris'`, `source_note text null`
- Unique `(repair_category, coalesce(bike_type,''), coalesce(city_slug,''))` via unique index on expressions.

**Table `v2_events`** — data-moat event log (owner S6).
- `id bigint generated always as identity primary key`
- `event_name text not null` — catalog §4, validated in code
- `occurred_at timestamptz not null default now()`
- `actor_type text not null` — `'customer'|'workshop'|'admin'|'system'|'anon'`
- `actor_id uuid null` (workshop user id / admin id; NEVER customer PII)
- `city_slug text null`, `request_id uuid null`, `workshop_id uuid null`, `response_id uuid null`
- `session_id text null` (first-party session id, same as usePageTracking)
- `payload jsonb not null default '{}'` — schema per §4
- `consent_scope text not null default 'necessary'` — `'necessary'|'statistics'|'marketing'`
- `host text not null default 'cykelhjalpen'`
- Indexes: `(event_name, occurred_at desc)`, `(city_slug, occurred_at desc)`, `(request_id)`.

### 2.2 Marketplace liquidity (S1, S2)

**Additive columns on `public.workshops`** (nullable/defaulted, no rewrites):
- `service_area_mode text not null default 'city'` — `'city'` (today's behavior) | `'areas'` (match `areas_served[]` against request city_name) | `'cluster'` (any city in own city's cluster)
- `cluster_opt_in boolean not null default false` — explicit consent to cross-city matching
- `public_profile_opt_in boolean not null default false` — §2.3 consent gate
- `onboarding_state text not null default 'registered'` — mirrors `v2_workshop_onboarding.state` for cheap reads; S2 keeps both in sync (onboarding table is source of truth)

**Additive columns on `public.workshop_responses`:**
- `winner_reminded_at timestamptz null` — last winner-payment reminder (S2)
- `stalled_at timestamptz null` — set when flagged stalled (S2)
- `ghosted_claim_status text null` — `'none'|'claimed'|'credited'|'rejected'` quick read; source of truth `v2_ghosted_lead_claims` (S4)

**Additive columns on `public.bike_repair_requests`:**
- `reselection_count integer not null default 0` — customer re-selection after stalled winner
- New allowed status value: `'awaiting_reselection'` (winner stalled > 48h; customer invited to pick another quote). All other statuses unchanged.

**Table `v2_workshop_onboarding`** (S2) — lifecycle per workshop:
- `workshop_id uuid primary key references public.workshops(id) on delete cascade`
- `state text not null` — `'registered'|'approved'|'first_quote_sent'|'first_win'|'activated'|'dormant'|'churned'` (activated = ≥3 quotes in trailing 30d; dormant = 0 quotes in 30d after activation)
- `state_changed_at timestamptz not null default now()`, `last_nudge_at timestamptz null`, `notes text null`

**Table `v2_nudge_log`** (S2) — every automated nudge, idempotent:
- `dedupe_key text not null unique` — e.g. `zero_quote:{request_id}:24h`, `winner_payment:{response_id}:2h`
- `kind text not null` — `'zero_quote'|'few_quotes'|'winner_payment'|'onboarding'|'dormant_workshop'|'closing_soon'`
- `request_id uuid null`, `workshop_id uuid null`, `response_id uuid null`
- `channel text not null` — `'email'|'sms'|'in_app'`, `sent_count integer not null default 0`, `meta jsonb not null default '{}'`

**Table `v2_rescue_actions`** (S2) — zero-quote rescue trail:
- `request_id uuid not null references public.bike_repair_requests(id) on delete cascade`
- `action_type text not null` — `'auto_nudge'|'extend_window'|'founder_backstop'|'repost_invite'|'cross_cluster_broadcast'`
- `status text not null default 'planned'` — `'planned'|'executed'|'skipped'|'failed'`
- `reason text null`, `meta jsonb not null default '{}'`
- Index `(request_id, created_at desc)`.

**Table `v2_ghosted_lead_claims`** (S4) — ghosted-lead credit handling (dim12 action 3):
- `response_id uuid not null unique references public.workshop_responses(id)` — one claim per won response
- `workshop_id uuid not null references public.workshops(id)`
- `status text not null default 'pending'` — `'pending'|'approved'|'rejected'|'credited'`
- `customer_unreachable_since date null`, `evidence_note text null`
- `admin_note text null`, `resolved_by uuid null`, `resolved_at timestamptz null`
- Crediting = `free_lead_grants` insert (existing mechanism) + `lead_charges` refund row where a cash charge exists.

**Table `v2_supply_snapshots`** (S10) — daily per-city supply health time series:
- `captured_on date not null`, `city_slug text not null`
- `approved_workshops integer not null`, `active_workshops integer not null`, `requests_30d integer not null`, `quotes_30d integer not null`, `fill_rate numeric(5,4) null`, `median_hours_to_first_quote numeric(8,2) null`
- Unique `(city_slug, captured_on)`.

### 2.3 Verified outcomes & reviews (S3)

**Enum `v2_outcome_state`**: `'pending'`, `'reported_by_workshop'`, `'confirmed_by_customer'`, `'completed'`, `'no_show'`, `'cancelled'`, `'disputed'`, `'expired'`.
Lifecycle: `pending` (winner settled) → workshop reports done (`reported_by_workshop`) and/or customer confirms (`confirmed_by_customer`) → `completed` requires completion evidence = customer confirmation OR (workshop report + no customer dispute within 7 days). `no_show` (winner never contacted), `cancelled`, `disputed` (either party, admin-handled), `expired` (90 days no signal).

**Table `v2_job_outcomes`**:
- `request_id uuid not null unique references public.bike_repair_requests(id)` — one outcome per request
- `response_id uuid not null unique references public.workshop_responses(id)` — the winning response
- `workshop_id uuid not null references public.workshops(id)`
- `state v2_outcome_state not null default 'pending'`
- Evidence fields: `workshop_reported_at timestamptz null`, `customer_confirmed_at timestamptz null`, `final_price_sek integer null` (feeds prisindex!), `completion_evidence jsonb not null default '{}'` (`{ "source": "customer_confirm"|"workshop_report"|"admin", "note": … }`)
- `customer_invited_at timestamptz null`, `invite_count integer not null default 0`

**Enum `v2_review_state`**: `'submitted'`, `'verified'`, `'published'`, `'flagged'`, `'rejected'`, `'removed'`.
Rule: a review becomes `verified` ONLY when its outcome row has completion evidence (state `completed`). `published` = verified + moderation pass (auto-pass unless flagged). Aggregates count only `published`.

**Table `v2_reviews`**:
- `outcome_id uuid not null unique references public.v2_job_outcomes(id)` — one review per outcome (abuse cap #1)
- `request_id uuid not null`, `workshop_id uuid not null references public.workshops(id)`
- `rating smallint not null CHECK (rating between 1 and 5)`
- `body text null` (≤ 2000 chars enforced in function), `state v2_review_state not null default 'submitted'`
- `author_token_hash text not null` — sha256 of the request view_token; abuse cap #2 (no account needed, but no doubles)
- `customer_email_hash text not null` — sha256(lower(email)); abuse cap #3: one review per (workshop_id, customer_email_hash) per 180 days, enforced in `v2-submit-review` via the `v2_reviews_email_window` partial index (a rolling window cannot be a unique index)
- `workshop_response text null`, `workshop_responded_at timestamptz null`
- `moderated_by uuid null`, `moderated_at timestamptz null`, `moderation_note text null`

**Table `v2_workshop_review_stats`** — denormalized aggregates, maintained by trigger on `v2_reviews` (published only):
- `workshop_id uuid primary key references public.workshops(id) on delete cascade`
- `published_count integer not null default 0`, `avg_rating numeric(3,2) null`, `last_published_at timestamptz null`
- `recent_avg_90d numeric(3,2) null` — refreshed by `v2-compute-price-index` cron (cheap co-compute)

### 2.4 Public profiles & directory (S4)

**View `public.v2_public_workshop_directory`** — `security_invoker = true`, granted to `anon, authenticated`. Columns ONLY: `workshop_id`, `slug`, `company_name`, `city`, `city_slug`, `services`, `areas_served`, `logo_url`, `website`, `bio_short` (new workshops column, ≤ 280 chars, plain text), `created_year`, `published_review_count`, `avg_rating`, `cluster_slug`. NEVER: email, phone, address, stripe ids, free_leads_remaining, user_id.
Backed by a NEW additive policy on `workshops`: `"V2 public reads opted-in approved workshops"` `FOR SELECT TO anon, authenticated USING (approved = true AND public_profile_opt_in = true)`. This does NOT resurrect the dropped 20260610 broad policy — it is strictly narrower (opt-in + view-scoped columns).
Indexability: per-city `directory_indexable` flag (§2.1) AND city threshold from §7.4; pages render `noindex` until gate passes.

### 2.5 Cykelprisindex (S5)

**Enum `v2_price_confidence`**: `'insufficient'`, `'low'`, `'medium'`, `'high'`.
Thresholds (also in `_shared/v2/config-schema.ts`): n < 3 insufficient (never displayed), 3–9 low, 10–29 medium, ≥30 high.

**Table `v2_price_index_stats`**:
- `city_slug text not null`, `repair_category text not null`
- `window_start date not null`, `window_end date not null` — rolling 90-day windows + monthly snapshots
- `sample_count integer not null`, `median_sek integer null`, `p25_sek integer null`, `p75_sek integer null`, `min_sek integer null`, `max_sek integer null`
- `outliers_removed integer not null default 0` — IQR rule: drop < Q1−1.5·IQR or > Q3+1.5·IQR, counted here
- `confidence v2_price_confidence not null`
- `source text not null default 'quotes'` — `'quotes'` (sent quotes) | `'outcomes'` (final prices) | `'mixed'`
- `computed_at timestamptz not null default now()`
- Unique `(city_slug, repair_category, window_start, window_end, source)`.
- Public read ONLY via RPC `v2_get_price_index(p_city_slug text, p_category text default null)` (SECURITY DEFINER): returns rows where `confidence >= 'low'` AND city passes the sample gate (§7.5), else falls back to `v2_guide_prices` rows labelled `riktpris`. Direct table SELECT is admin/service only — PUBLIC DISPLAY IS SAMPLE-GATED IN SQL, not in UI code.

### 2.6 Content engine surface (S7)

**Table `v2_content_pages`** — routing/host-scoping/editorial fields; NO mass generation:
- `host text not null default 'cykelhjalpen'`, `path text not null` (e.g. `/guider/byta-dack`), unique `(host, path)`
- `page_type text not null` — `'guide'|'report'|'city_hub_extra'|'tool'`
- `status text not null default 'draft'` — `'draft'|'in_review'|'published'|'archived'` (public surface reads published only)
- `indexability text not null default 'noindex'` — `'index'|'noindex'|'auto'` (auto = resolved from data thresholds at render)
- Editorial fields: `title text not null`, `description text null`, `body_markdown text null`, `data_modules jsonb not null default '[]'` (e.g. `[{"type":"price_index","city":"linkoping","category":"Punktering / däckbyte"}]`), `author_name text null`, `reviewer_name text null` (E-E-A-T mechanic reviewer), `reviewed_at timestamptz null`, `published_at timestamptz null`
- Rule enforced in `v2-content-publish`: `published` requires `reviewer_name` + `reviewed_at` (editorial gate, not just a flag).

### 2.7 Retention lifecycle (S8)

**Table `v2_retention_contacts`** — consent-aware contact registry:
- `subject_type text not null` — `'customer'|'workshop'`
- `subject_key text not null` — customer: sha256(lower(email)); workshop: `workshops.id::text`
- `workshop_id uuid null references public.workshops(id)`
- `consent_basis text not null` — `'transactional'|'legitimate_interest'|'marketing_consent'`
- `consent_at timestamptz not null default now()`, `unsubscribed_at timestamptz null`
- `lifecycle_stage text not null default 'new'` — `'new'|'active'|'lapsing'|'dormant'|'win_back'`
- `last_contacted_at timestamptz null`
- Unique `(subject_type, subject_key)`.

**Table `v2_lifecycle_messages`** — scheduled/sent retention touches:
- `contact_id uuid not null references public.v2_retention_contacts(id) on delete cascade`
- `kind text not null` — `'seasonal_reminder'|'reactivation'|'review_request'|'win_back'|'onboarding_nudge'`
- `channel text not null` — `'email'|'sms'`, `status text not null default 'scheduled'` — `'scheduled'|'sent'|'skipped'|'failed'|'suppressed'`
- `scheduled_for timestamptz not null`, `sent_at timestamptz null`
- `dedupe_key text not null unique`, `meta jsonb not null default '{}'`
- Hard rule: `status='suppressed'` and never sent when contact has `unsubscribed_at` set and basis is not `transactional`.

### 2.8 Subscription / tier capability (S9 — OFF by default)

**Table `v2_plans`**:
- `code text primary key` — `'pay_per_win'` (default, 0 kr), `'pro'` (capability placeholder), `'pro_plus'`
- `name text not null`, `price_ore_monthly integer not null default 0`, `currency text not null default 'SEK'`
- `stripe_price_id text null`, `trial_days integer not null default 0`
- `entitlements jsonb not null default '{}'` — map of entitlement key → value, e.g. `{ "quotes_per_request_priority": true, "directory_featured": true, "free_wins_per_month": 1 }`
- `active boolean not null default false` — nothing sellable until explicitly activated
- Entitlement keys (registry, extend only via contract revision): `directory_featured`, `priority_slots`, `free_wins_per_month`, `price_index_early_access`, `profile_rich_modules`.

**Table `v2_workshop_subscriptions`**:
- `workshop_id uuid not null references public.workshops(id)`, `plan_code text not null references public.v2_plans(code)`
- `status text not null default 'trialing'` — `'trialing'|'active'|'past_due'|'cancelled'|'expired'`
- `stripe_subscription_id text null`, `stripe_customer_id text null`
- `trial_ends_at timestamptz null`, `current_period_end timestamptz null`, `cancelled_at timestamptz null`
- `granted_by_admin boolean not null default false`, `override_reason text null`
- Only one non-terminal row per workshop: partial unique index on `workshop_id` where status in ('trialing','active','past_due').

**Table `v2_entitlement_overrides`** — admin grants without Stripe:
- `workshop_id uuid not null references public.workshops(id)`, `entitlement_key text not null`, `value jsonb not null default 'true'`
- `expires_at timestamptz null`, `granted_by uuid null`, `reason text not null`
- Unique `(workshop_id, entitlement_key)`.

**Table `v2_pricing_experiments`** — pricing experiment registry (inert until flagged):
- `key text primary key`, `variants jsonb not null` — `[{"name":"control","winner_fee_ore":5000,"weight":1}]`
- `active boolean not null default false`, `started_at timestamptz null`, `ended_at timestamptz null`
- Invariant enforced in `_shared/v2/pricing-config.ts`: experiments may NEVER change `commission_bps` (always 0) and never apply retroactively to already-won responses.

---

## 3. Edge-function API contracts

Conventions: all functions are `v2-*` under `supabase/functions/`; CORS via `_shared/cors.ts`; errors `{ "error": string, "code": string }` with HTTP 4xx/5xx; success payloads below. Auth column: `token` = customer view_token (no login), `workshop` = user JWT of an approved workshop, `admin` = JWT with profiles.role='admin', `cron` = pg_cron/scheduled with service key, `internal` = service-key only.

### 3.1 S1 — eligibility

**`v2-eligibility-check`** (workshop)
→ req `{ "workshop_id"?: uuid, "request_id": uuid }` (workshop_id defaults to caller's)
← res `{ "eligible": boolean, "reasons": string[], "matched_via": "city"|"areas"|"cluster"|null, "request_summary": { "city": string, "repair_category": string, "status": string } }`

### 3.2 S2 — lifecycle automation

**`v2-zero-quote-rescue`** (cron, hourly)
→ req `{ "dry_run"?: boolean, "city_slug"?: string }`
← res `{ "scanned": number, "actions": [{ "request_id": uuid, "action_type": string, "status": string }], "skipped": number }`
Behavior: approved requests with 0 quotes at 24h → `auto_nudge` (+ emit `rescue.triggered`); 0 quotes at 72h → `extend_window` + `founder_backstop` alert; still 0 at close → `repost_invite` with prefilled `/skicka-arende?stad=` CTA (fixes the 404 dead-end, A8).

**`v2-winner-reminders`** (cron, hourly)
→ req `{ "dry_run"?: boolean }`
← res `{ "reminded": [{ "response_id": uuid, "stage": "2h"|"24h" }], "stalled": uuid[] }`
Behavior: `won` + unpaid → email at +2h, email+SMS at +24h (dedupe via `v2_nudge_log`); at +48h mark `stalled_at` and emit `winner.stalled`.

**`v2-stalled-winner-recovery`** (cron, daily)
→ req `{ "dry_run"?: boolean }`
← res `{ "recovered": [{ "request_id": uuid, "old_response_id": uuid }] }`
Behavior: stalled ≥72h → request `awaiting_reselection`, customer invited to pick another `sent` quote.

**`v2-reselect-winner`** (token)
→ req `{ "token": string, "response_id": uuid }`
← res `{ "request_id": uuid, "new_winner_response_id": uuid, "settlement": "free_lead"|"payment_required" }`
Constraints: request must be `awaiting_reselection`; old winner → `lost` + `stalled_at` kept for analytics; `reselection_count` incremented; new winner flows through the SAME settlement path as `select-bike-winner`.

### 3.3 S3 — outcomes & reviews

**`v2-report-outcome`** (workshop)
→ req `{ "response_id": uuid, "outcome": "completed"|"no_show"|"cancelled", "final_price_sek"?: number, "note"?: string }`
← res `{ "outcome_id": uuid, "state": string }`

**`v2-confirm-outcome`** (token)
→ req `{ "token": string, "outcome": "completed"|"no_show"|"cancelled"|"disputed", "final_price_sek"?: number, "note"?: string }`
← res `{ "outcome_id": uuid, "state": string, "review_invited": boolean }`

**`v2-outcome-invites`** (cron, daily) — "Hur gick det?" at +3d/+10d after winner settled
← res `{ "invited": number, "expired": number }`

**`v2-submit-review`** (token)
→ req `{ "token": string, "rating": 1|2|3|4|5, "body"?: string }`
← res `{ "review_id": uuid, "state": "submitted"|"verified", "published": boolean }`
Verified iff outcome has completion evidence; else stays `submitted` and is promoted by the completion path. Abuse caps from §2.3 enforced with 409 `{ "code": "duplicate_review" }` / 429 `{ "code": "rate_limited" }`.

**`v2-respond-review`** (workshop)
→ req `{ "review_id": uuid, "response": string }`
← res `{ "review_id": uuid, "workshop_responded_at": string }`

**`v2-moderate-review`** (admin)
→ req `{ "review_id": uuid, "action": "publish"|"flag"|"reject"|"remove", "note"?: string }`
← res `{ "review_id": uuid, "state": string }`

### 3.4 S4 — directory & ghosted leads

**`v2-get-public-workshop`** (public)
→ req `{ "slug": string }`
← res `200 { "workshop": <v2_public_workshop_directory row>, "reviews": [{ "rating": number, "body": string|null, "published_at": string, "workshop_response": string|null }] }` — reviews published-only, max 20, no author PII. 404 when not opted-in/approved.

**`v2-claim-ghosted-lead`** (workshop)
→ req `{ "response_id": uuid, "customer_unreachable_since": string, "evidence_note"?: string }`
← res `{ "claim_id": uuid, "status": "pending" }` — requires response `won`, settled (paid or free lead), ≥7 days since win.

### 3.5 S5 — prisindex

**`v2-compute-price-index`** (cron daily / admin on demand)
→ req `{ "city_slug"?: string, "window_days"?: number }` (default 90)
← res `{ "computed": [{ "city_slug": string, "repair_category": string, "sample_count": number, "confidence": string }] }`

**`v2-get-price-index`** (public)
→ req `{ "city_slug": string, "repair_category"?: string }`
← res `{ "rows": [{ "repair_category": string, "sample_count": number, "median_sek": number|null, "p25_sek": number|null, "p75_sek": number|null, "confidence": string, "window_end": string, "kind": "stats"|"riktpris" }], "sample_gated": boolean }`
When the city/category fails the sample gate, rows come from `v2_guide_prices` with `kind: "riktpris"` — the frontend MUST render the label.

### 3.6 S6 — events

**`v2-emit-event`** (internal)
→ req `{ "event_name": string, "payload"?: object, "actor_type"?: string, "actor_id"?: uuid, "city_slug"?: string, "request_id"?: uuid, "workshop_id"?: uuid, "response_id"?: uuid }`
← res `{ "id": number }`

**`v2-client-event`** (public, hardened)
→ req `{ "event_name": string, "payload"?: object, "session_id"?: string, "consent_scope"?: string }`
← res `{ "ok": true }` — server validates against the client-allowed subset of §4 (only `*.client.*` names), payload ≤ 4 KB, PII keys stripped (`email`, `phone`, `name`, `token`).

### 3.7 S7/S8 — content & retention

**`v2-content-publish`** (admin)
→ req `{ "path": string, "host"?: string, "action": "save_draft"|"submit_review"|"publish"|"archive", "fields"?: { …§2.6 columns } }`
← res `{ "page_id": uuid, "status": string }` — publish rejected without `reviewer_name`+`reviewed_at`.

**`v2-retention-cron`** (cron, daily)
← res `{ "sent": number, "suppressed": number, "failed": number }`

**`v2-retention-unsubscribe`** (public token)
→ req `{ "token": string }` ← res `{ "ok": true }` — sets `unsubscribed_at`, suppresses all non-transactional scheduled messages.

### 3.8 S9 — subscriptions (flag-gated: `v2.subscriptions.enabled` OFF)

**`v2-create-subscription-checkout`** (workshop)
→ req `{ "plan_code": string }`
← res `{ "checkout_url": string }` — 403 `{ "code": "feature_disabled" }` while the flag is off.

**`v2-subscription-webhook`** (stripe-signed) — handles `customer.subscription.*`, dedupes via `stripe_events`.

**`v2-admin-entitlement-override`** (admin)
→ req `{ "workshop_id": uuid, "entitlement_key": string, "value"?: any, "expires_at"?: string, "reason": string }`
← res `{ "override_id": uuid }`

---

## 4. Domain event catalog (data-moat)

Naming: `<domain>.<verb>` past tense. Server-side events are emitted via `_shared/v2/events.ts` (best-effort, never throws). Client-allowed events are prefixed `client.` and are the ONLY names accepted by `v2-client-event`.

| event_name | actor | payload fields | emitted by |
|---|---|---|---|
| `request.submitted` | customer | `{ bike_type, repair_category, urgency, city_slug, auto_approved }` | submit-bike-request |
| `request.approved` / `request.rejected` | admin/system | `{ city_slug, auto }` | approve path |
| `request.closed` | system | `{ city_slug, quotes_sent, reason: "max_quotes"|"window_expired" }` | close-stale |
| `request.zero_quote_at_24h` / `request.zero_quote_at_close` | system | `{ city_slug }` | v2-zero-quote-rescue |
| `quote.sent` | workshop | `{ city_slug, price_min, price_max, response_time_hours }` | submit-bike-response |
| `quote.won` | customer | `{ city_slug, price_min, price_max, quotes_total }` | select-bike-winner / v2-reselect-winner |
| `quote.settled` | system | `{ method: "free_lead"|"card"|"credit", amount_ore }` | settlement path |
| `winner.reminded` | system | `{ stage: "2h"|"24h" }` | v2-winner-reminders |
| `winner.stalled` / `winner.reselected` | system/customer | `{ stalled_hours, reselection_count }` | S2 |
| `outcome.reported` / `outcome.confirmed` | workshop/customer | `{ state, final_price_sek?, days_since_win }` | S3 |
| `review.invited` / `review.submitted` / `review.verified` / `review.published` | system/customer | `{ rating?, days_since_completion }` | S3 |
| `workshop.registered` / `workshop.approved` / `workshop.first_quote` / `workshop.first_win` / `workshop.activated` / `workshop.dormant` | workshop/system | `{ city_slug, days_since_registration? }` | register / review-workshop / S2 |
| `nudge.sent` | system | `{ kind, channel, sent_count }` | S2 |
| `rescue.triggered` | system | `{ action_type, city_slug }` | S2 |
| `ghosted.claimed` / `ghosted.credited` | workshop/admin | `{ days_since_win }` | S4 |
| `price_index.computed` | system | `{ city_slug, categories_computed, total_samples }` | S5 |
| `content.published` | admin | `{ path, page_type, reviewer }` | S7 |
| `retention.message_sent` / `retention.unsubscribed` | system | `{ kind, channel }` | S8 |
| `subscription.started` / `subscription.cancelled` / `subscription.trial_ended` | workshop/system | `{ plan_code, trial }` | S9 |
| `client.wizard_started` / `client.wizard_step_completed` / `client.wizard_submitted` | anon/customer | `{ step?, city_slug? }` | S11 frontend |
| `client.quote_card_viewed` / `client.winner_selected_click` | customer | `{ quotes_total }` | S11 |
| `client.directory_viewed` / `client.profile_viewed` | anon | `{ city_slug, slug? }` | S4/S11 |
| `client.estimator_used` | anon | `{ city_slug, repair_category }` | S5/S11 |

Payload rules: no raw emails/phones/names/tokens in payloads (hashes ok); `city_slug` is the ascii slug; money in SEK integers (öre only where suffixed `_ore`).

---

## 5. Feature-flag registry

All seeded OFF (`enabled=false`). `rollout.cities` narrows to city slugs; `rollout.percent` = deterministic bucketing on workshop/request id hash. Missing flag = OFF. Frontend reads via `src/lib/v2/flags.ts`; edge via `_shared/v2/flags.ts`; both cache ≤ 60s.

| flag key | default | purpose | activation gate (§7) |
|---|---|---|---|
| `v2.liquidity.areas_served_matching` | off | areas/cluster matching in board + notifications | G-L1 |
| `v2.liquidity.zero_quote_rescue` | off | automated rescue crons | G-L2 |
| `v2.liquidity.winner_reminders` | off | winner payment reminders + stalled recovery | G-L2 |
| `v2.liquidity.reselection` | off | customer re-selection UI/API | G-L3 |
| `v2.reviews.outcome_lifecycle` | off | outcome tracking + invites | G-R1 |
| `v2.reviews.verified_reviews` | off | review submit/display | G-R2 |
| `v2.directory.public_profiles` | off | `/verkstad/{slug}` + directory pages | G-D1 |
| `v2.prisindex.engine` | off | stats computation (writes tables) | G-P1 |
| `v2.prisindex.public_display` | off | stats on SEO pages (sample-gated in SQL too) | G-P2 |
| `v2.datamoat.event_collection` | off | server event emission | G-M1 |
| `v2.seo.content_surface` | off | v2_content_pages routing | G-C1 |
| `v2.retention.lifecycle` | off | retention crons | G-T1 |
| `v2.subscriptions.enabled` | off | plan checkout + entitlements | G-S1 |
| `v2.pricing.config_reader` | off | read pricing from v2_pricing_config instead of constants (values identical; pure indirection switch) | G-X1 |

---

## 6. RLS policy conventions

1. **RLS enabled on every new table** (`alter table … enable row level security` + `force row level security` NOT used — service role must keep working).
2. **No anon policies** on base tables. Public reads go through: (a) `security_invoker` views with whitelisted columns (`v2_public_workshop_directory`), backed by the narrow opt-in policy §2.4; or (b) SECURITY DEFINER RPCs (`v2_get_price_index`) that enforce gates in SQL.
3. **Owner policies** reuse existing helpers: `is_admin(auth.uid())`, `get_workshop_id(auth.uid())`, `is_approved_workshop(auth.uid())` — never re-implement role checks inline.
4. **Token access (customers) never via RLS** — customers are account-less; all customer reads/writes go through edge functions that validate `view_token` server-side (existing pattern: get-bike-request-by-token).
5. **Admin full access** policy on every operational table: `FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))`.
6. **`v2_events`**: insert service-role only (functions), select admin only. No update/delete for anyone.
7. Policy naming: `"V2 <who> <verb> <what>"` (e.g. `"V2 workshop reads own outcome"`) to keep V2 policies greppable.
8. **Never** re-create the dropped `"Public reads approved workshops"` broad policy (20260610 lesson). Public = scoped view + opt-in policy only.

---

## 7. Rollout / activation gates

Gates reference measurable evidence (per cross-verification §5–6). S10 owns measurement; flags flip only when the gate row is green.

| gate | feature | threshold (evidence) |
|---|---|---|
| G-L1 | areas/cluster matching | code shipped + shadow-mode log ≥7 days with zero mismatch incidents vs exact-city baseline |
| G-L2 | zero-quote rescue + winner reminders | cron scheduling VERIFIED in prod (registry R4 lesson: bike-choice-reminders was possibly unscheduled) + dry-run output reviewed |
| G-L3 | re-selection | ≥1 stalled winner observed in events (`winner.stalled`) |
| G-R1 | outcome lifecycle | winner flow instrumented (`quote.settled` events flowing ≥7 days) |
| G-R2 | verified reviews | ≥5 outcomes `completed` in Linköping; abuse caps load-tested |
| G-D1 | public directory/profiles | city `ACTIVE` or `LIMITED` AND ≥3 approved, `public_profile_opt_in=true` workshops in that city AND `directory_indexable=true` (admin) |
| G-P1 | prisindex engine | quote volume ≥1 category with n≥3 in trailing 90d (same honesty gate as today) |
| G-P2 | prisindex public display | per city+category n≥3 (`low`) to show labelled stats; n≥10 (`medium`) to show unlabelled-by-fallback; below → riktpris fallback. Enforced in SQL RPC. |
| G-C1 | content surface | ≥1 page passed editorial review (reviewer_name + reviewed_at); ≤6 published/month (scaled-content-abuse guard, dim09) |
| G-T1 | retention lifecycle | suppression list + unsubscribe verified end-to-end; DMARC/DKIM alignment fixed (A26) |
| G-S1 | subscriptions | demand gates D1–D4 from cross-verification §6.1 (Linköping ≥30 req/mo 2 months, fill ≥60%, ≥5 active workshops, choice ≥50%) |
| G-X1 | pricing config reader | shadow-read comparison: config value == compile-time constant for ≥7 days, then flip (values are seeded identical, so flip is behavior-neutral) |
| City #5 | any new city row | explicit HQ decision + supply seeded (≥3 approved workshops) BEFORE `demand_open=true`; city #5 is NOT activated in this build |

---

## 8. Invariants & glossary

**Invariants**
- I1: 0% commission forever — `v2_pricing_config.commission_bps CHECK (=0)`; no table/column may introduce commission semantics.
- I2: Live charging rule unchanged until G-X1 passes and HQ approves a pricing change; seeds = 5000 öre, 25% VAT, 2 free wins, credits 1–100 @ 5000 öre.
- I3: Public surfaces never expose customer PII, workshop contact fields beyond website, or non-published reviews.
- I4: Every automated external message has a `dedupe_key` (idempotency) and respects suppression/unsubscribe.
- I5: Reviews count toward aggregates only in state `published`; verified requires completion evidence on the linked outcome.
- I6: City identifiers: `city_slug` (ascii, config/URLs/events) ↔ `city_name` (exact-match strings in V1 tables). `_shared/v2/city-state.ts` owns the mapping; never hardcode `'Linköping'` in new code without going through the resolver.
- I7: All crons must be registered in the migration pack's scheduling notes AND verified in prod before their flag flips (registry R4 lesson).

**Glossary**: *fill rate* = % published requests with ≥1 quote within the window; *choice rate* = % requests-with-quotes reaching `completed`; *active workshop* = approved + ≥1 quote in trailing 30d (existing definition, `cykelMarketplaceHealth.ts`); *settled* = win paid by card or free lead/credit; *stalled winner* = won + unsettled ≥48h; *ghosted lead* = settled win where customer is unreachable ≥7 days.
