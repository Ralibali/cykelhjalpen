/**
 * English translations keyed by the Swedish source string.
 * Grouped per area so several files can be maintained independently.
 */
import { EN_COMMON } from './en/common'
import { EN_HOME } from './en/home'
import { EN_WIZARD } from './en/wizard'
import { EN_WORKSHOP } from './en/workshop'
import { EN_ADMIN } from './en/admin'
import { EN_ADMIN2 } from './en/admin2'
import { EN_ADMIN3 } from './en/admin3'
import { EN_SEO } from './en/seo'
import { EN_AUTH } from './en/auth'

export const EN: Record<string, string> = {
  ...EN_COMMON,
  ...EN_HOME,
  ...EN_WIZARD,
  ...EN_WORKSHOP,
  ...EN_ADMIN,
  ...EN_ADMIN2,
  ...EN_ADMIN3,
  ...EN_SEO,
  ...EN_AUTH,
}
