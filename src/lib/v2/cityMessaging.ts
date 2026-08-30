// V2 city-state customer messaging (frontend). Contract: docs/v2/CONTRACTS.md
// §2.1 state semantics. Pure mapping from a city config to honest Swedish
// copy (English variant included, matching customerChoiceCopy conventions).
//
// Rendered ONLY when the v2.liquidity.city_state_messaging flag is ON (the
// flag is seeded OFF — contract deviation noted in the S1 report: the §5
// registry had no key for city-state messaging).
//
// Tone rule (Insight: honest trust): SUPPLY_BUILDING / LIMITED cities say so
// plainly instead of implying full coverage. ACTIVE and unknown cities render
// nothing (live behavior unchanged).

import type { V2CityState } from './contracts'

export type V2CityMessagingLang = 'sv' | 'en'

export interface V2CityStateNotice {
  state: V2CityState
  /** 'info' = neutral note; 'warning' = demand currently soft-gated. */
  tone: 'info' | 'warning'
  title: string
  body: string
}

export interface V2CityMessagingConfig {
  state: V2CityState | string
  city_name: string
  demand_open?: boolean
}

/**
 * Notice to show for a city's current state, or null when the city behaves
 * like the live product (ACTIVE / unknown / no config). RESEARCH/PAUSED keep
 * state-specific copy; for normally-open states, demand_open=false warns
 * (ops override per contract §2.1).
 */
export function v2CityStateNotice(
  config: V2CityMessagingConfig | null | undefined,
  lang: V2CityMessagingLang = 'sv',
): V2CityStateNotice | null {
  if (!config) return null
  const city = config.city_name

  // RESEARCH/PAUSED keep their specific copy even though their seeded
  // demand_open=false (stateDefaults); the generic demand-closed override
  // below is for states that are normally open (ops override, §2.1).
  if (config.state === 'RESEARCH') {
    return {
      state: 'RESEARCH',
      tone: 'warning',
      title: lang === 'sv'
        ? `Vi är inte igång i ${city} än`
        : `We are not live in ${city} yet`,
      body: lang === 'sv'
        ? 'Vi undersöker intresset här. Du kan lämna ditt ärende, men vi kan inte lova prisförslag just nu.'
        : 'We are gauging interest here. You can leave your request, but we cannot promise quotes just yet.',
    }
  }
  if (config.state === 'PAUSED') {
    return {
      state: 'PAUSED',
      tone: 'warning',
      title: lang === 'sv'
        ? `Vi pausar tillfälligt nya ärenden i ${city}`
        : `We are temporarily pausing new requests in ${city}`,
      body: lang === 'sv'
        ? 'Ärenden som redan skickats slutförs som vanligt. Prova gärna igen lite senare.'
        : 'Requests already submitted are completed as usual. Please try again a bit later.',
    }
  }

  if (config.demand_open === false) {
    return {
      state: (config.state as V2CityState) ?? 'PAUSED',
      tone: 'warning',
      title: lang === 'sv'
        ? `Vi tar tillfälligt inte emot nya ärenden i ${city}`
        : `We are temporarily not accepting new requests in ${city}`,
      body: lang === 'sv'
        ? 'Ärenden som redan skickats slutförs som vanligt. Prova gärna igen lite senare.'
        : 'Requests already submitted are completed as usual. Please try again a bit later.',
    }
  }

  switch (config.state) {
    case 'SUPPLY_BUILDING':
      return {
        state: 'SUPPLY_BUILDING',
        tone: 'info',
        title: lang === 'sv'
          ? `Vi bygger upp verkstadstätheten i ${city}`
          : `We are building up workshop coverage in ${city}`,
        body: lang === 'sv'
          ? 'Ditt ärende tas emot som vanligt och granskas personligen av oss, men vi ansluter fortfarande verkstäder här — det kan därför ta lite längre tid innan prisförslag kommer in.'
          : 'Your request is received as usual and personally reviewed by us, but we are still onboarding workshops here — quotes may therefore take a little longer to arrive.',
      }
    case 'LIMITED':
      return {
        state: 'LIMITED',
        tone: 'info',
        title: lang === 'sv'
          ? `Vi är nyligen igång i ${city}`
          : `We have recently launched in ${city}`,
        body: lang === 'sv'
          ? 'Tjänsten är öppen och ärendet skickas direkt, men verkstäderna här är fortfarande få — räkna med att svaren kan dröja lite.'
          : 'The service is open and your request is sent right away, but workshops here are still few — expect answers to take a little longer.',
      }
    default:
      return null
  }
}
