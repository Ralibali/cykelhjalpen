// V2 Google Ads conversion config (S6 data-moat).
//
// Makes the previously hardcoded-empty Ads conversion labels config-driven.
// All keys default to EMPTY → trackAdsConversion stays a silent no-op until
// values are provided via build env (VITE_V2_ADS_*). No activation by default.
//
// Namespaced keys (registry-style, contract §5 conventions):
//   v2.ads.tag_id                 ← VITE_V2_ADS_TAG_ID      (t.ex. 'AW-123456789')
//   v2.ads.label_request_submitted← VITE_V2_ADS_LABEL_REQUEST
//   v2.ads.label_workshop_signup  ← VITE_V2_ADS_LABEL_SIGNUP

export const V2_ADS_CONFIG_KEYS = [
  'v2.ads.tag_id',
  'v2.ads.label_request_submitted',
  'v2.ads.label_workshop_signup',
] as const

export type V2AdsConfigKey = (typeof V2_ADS_CONFIG_KEYS)[number]

export interface V2AdsConfig {
  tagId: string
  labelRequest: string
  labelSignup: string
}

type EnvLike = Record<string, string | undefined>

const clean = (value: string | undefined): string => (value ?? '').trim()

/**
 * Resolve the ads config from an env-like map. Empty/absent values stay empty
 * (no-op downstream). Never throws.
 */
export function resolveAdsConfig(env?: EnvLike): V2AdsConfig {
  const source: EnvLike = env ?? ((import.meta as unknown as { env?: EnvLike }).env ?? {})
  return {
    tagId: clean(source.VITE_V2_ADS_TAG_ID),
    labelRequest: clean(source.VITE_V2_ADS_LABEL_REQUEST),
    labelSignup: clean(source.VITE_V2_ADS_LABEL_SIGNUP),
  }
}

/** True only when the config can actually fire at least one conversion. */
export function adsConfigIsActive(config: V2AdsConfig): boolean {
  return Boolean(config.tagId && (config.labelRequest || config.labelSignup))
}
