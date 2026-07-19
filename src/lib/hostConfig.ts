export type SiteHost = 'cykelhjalpen' | 'updro';

export function getCurrentHost(): SiteHost {
  if (typeof window === 'undefined') return 'cykelhjalpen';
  const h = window.location.hostname;
  if (h.includes('updro.se') || h.startsWith('updro.')) return 'updro';
  return 'cykelhjalpen';
}
