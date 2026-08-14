import { buildCykelSeoPages as buildBase } from './cykelSeoPages'
import type { TFunction } from './i18n'

export { seoPagePath, EN_SLUG_STEMS } from './cykelSeoPages'
export type { CykelSeoPage } from './cykelSeoPages'

const neutralize = (value: string) => value
  .replaceAll('Linköping är Cykelhjälpens fokusstad just nu.', 'Cykelhjälpen finns i Linköping, Norrköping, Uppsala och Lund.')
  .replaceAll('Linköping is Cykelhjälpen’s focus city right now.', 'Cykelhjälpen is available in Linköping, Norrköping, Uppsala and Lund.')

export const buildCykelSeoPages = (t?: TFunction) => buildBase(t).map((page) => ({
  ...page,
  h1: neutralize(page.h1),
  title: neutralize(page.title),
  description: neutralize(page.description),
  intro: neutralize(page.intro),
  sections: page.sections.map((item) => ({ h2: neutralize(item.h2), body: neutralize(item.body) })),
  faq: page.faq.map((item) => ({ q: neutralize(item.q), a: neutralize(item.a) })),
}))
