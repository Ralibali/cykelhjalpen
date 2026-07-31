// Hjälpfunktioner för inkorgsvyn (/admin/mejl).

/** Bygger ett svarsämne – lägger inte till "Sv:" om det redan finns. */
export const buildReplySubject = (subject: string | null | undefined): string => {
  const trimmed = (subject || '').trim()
  if (!trimmed) return 'Sv:'
  return /^sv\s*:/i.test(trimmed) ? trimmed : `Sv: ${trimmed}`
}

/** Kort utdrag ur mejltext för listvyn. */
export const emailSnippet = (text: string | null | undefined, max = 90): string => {
  const collapsed = (text || '').replace(/\s+/g, ' ').trim()
  if (!collapsed) return '(utan textinnehåll)'
  return collapsed.length > max ? `${collapsed.slice(0, max - 1).trimEnd()}…` : collapsed
}

/** Datum i listvyn: klockslag om mejlet kom i dag, annars "12 jan" (+ år om annat år). */
export const formatMailDate = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  }
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('sv-SE', sameYear
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}
