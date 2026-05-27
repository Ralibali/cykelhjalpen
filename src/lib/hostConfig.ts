export type SiteHost = 'cykelhjalpen' | 'updro';

export function getCurrentHost(): SiteHost {
  if (typeof window === 'undefined') return 'cykelhjalpen';
  const h = window.location.hostname;
  if (h.includes('updro.se') || h.includes('updro.lovable')) return 'updro';
  return 'cykelhjalpen';
}
