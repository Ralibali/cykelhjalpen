// V2 ads config tests (S6): conversion labels are config-driven with EMPTY
// defaults — no activation until env values are provided.
import { describe, expect, it } from 'vitest'

import { adsConfigIsActive, resolveAdsConfig, V2_ADS_CONFIG_KEYS } from './adsConfig'

describe('resolveAdsConfig', () => {
  it('defaults to empty (no-op downstream) when no env is set', () => {
    const config = resolveAdsConfig({})
    expect(config).toEqual({ tagId: '', labelRequest: '', labelSignup: '' })
    expect(adsConfigIsActive(config)).toBe(false)
  })

  it('reads VITE_V2_ADS_* env values', () => {
    const config = resolveAdsConfig({
      VITE_V2_ADS_TAG_ID: ' AW-123 ',
      VITE_V2_ADS_LABEL_REQUEST: 'reqLabel',
      VITE_V2_ADS_LABEL_SIGNUP: 'signupLabel',
    })
    expect(config.tagId).toBe('AW-123')
    expect(config.labelRequest).toBe('reqLabel')
    expect(config.labelSignup).toBe('signupLabel')
    expect(adsConfigIsActive(config)).toBe(true)
  })

  it('is inactive without a tag id even if labels are set', () => {
    const config = resolveAdsConfig({ VITE_V2_ADS_LABEL_REQUEST: 'x' })
    expect(adsConfigIsActive(config)).toBe(false)
  })

  it('uses the real import.meta.env by default and stays empty in this repo', () => {
    const config = resolveAdsConfig()
    expect(config.tagId).toBe('')
    expect(config.labelRequest).toBe('')
    expect(config.labelSignup).toBe('')
  })

  it('exposes the namespaced v2 config keys', () => {
    expect(V2_ADS_CONFIG_KEYS).toEqual([
      'v2.ads.tag_id',
      'v2.ads.label_request_submitted',
      'v2.ads.label_workshop_signup',
    ])
  })
})
