// Antal öppna kundärenden per stad (RPC get_cykel_open_request_counts).
// Bara verkliga, aggregerade siffror – visas för verkstäder som bevis på
// efterfrågan. Inga påhittade eller avrundade tal.

export type OpenRequestCountRow = {
  city: string
  open_count: number | string
  latest_at: string | null
}

export type OpenRequestCounts = {
  byCity: Map<string, number>
  total: number
}

/** Summerar RPC-raderna. Okända städer räknas in i totalen men får ingen chip-siffra. */
export function summarizeOpenRequestCounts(rows: OpenRequestCountRow[] | null | undefined): OpenRequestCounts {
  const byCity = new Map<string, number>()
  let total = 0
  for (const row of rows ?? []) {
    const count = Number(row.open_count)
    if (!row.city || !Number.isFinite(count) || count <= 0) continue
    byCity.set(row.city, (byCity.get(row.city) ?? 0) + count)
    total += count
  }
  return { byCity, total }
}

type Translate = (sv: string, vars?: Record<string, string | number>) => string

/** Rubriken ovanför korten, t.ex. "3 öppna ärenden i Lund de senaste 14 dagarna". */
export function openRequestsSummary(counts: OpenRequestCounts, city: string, t: Translate): string | null {
  const count = city ? counts.byCity.get(city) ?? 0 : counts.total
  if (count <= 0) return null
  if (city) {
    return count === 1
      ? t('1 öppet ärende i {city} de senaste 14 dagarna', { city })
      : t('{count} öppna ärenden i {city} de senaste 14 dagarna', { count, city })
  }
  return count === 1
    ? t('1 öppet ärende de senaste 14 dagarna')
    : t('{count} öppna ärenden de senaste 14 dagarna', { count })
}
