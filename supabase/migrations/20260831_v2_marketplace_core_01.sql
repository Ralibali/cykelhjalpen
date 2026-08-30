-- V2 MARKETPLACE CORE 01 (S1) — feature flag for city-state customer messaging.
-- Contract: docs/v2/CONTRACTS.md §5. ADDITIVE ONLY (single INSERT).
--
-- Deviation (flagged by S1, pending architect ratification): the §5 registry
-- had no key gating city-state customer messaging (SUPPLY_BUILDING honesty
-- copy on request-submit + city pages). This adds
-- 'v2.liquidity.city_state_messaging', seeded OFF like every other V2 flag.
-- The key is also registered in _shared/v2/config-schema.ts and
-- src/lib/v2/contracts.ts (parity enforced by contracts.test.ts).
--
-- Rollback: delete from public.v2_feature_flags
--   where key = 'v2.liquidity.city_state_messaging';
--   (Row is new; deleting it touches no V1 data or other flags.)

INSERT INTO public.v2_feature_flags (key, enabled, description) VALUES
  ('v2.liquidity.city_state_messaging', false,
   'Stads-status-meddelanden (SUPPLY_BUILDING/LIMITED/PAUSED/RESEARCH) på /skicka-arende och stadssidor');
