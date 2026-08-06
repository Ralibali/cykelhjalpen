// Monetiseringsspärr för kundens ärendesida.
//
// Verkstadens kontaktvägar (telefon, e-post, webbplats) får aldrig lämna
// backend innan kunden valt verkstaden OCH vinsten är reglerad – antingen med
// betald vinstavgift eller ett draget gratis-lead (båda sätter paid = true).
// Företagsnamnet visas alltid så kunden kan jämföra offerterna.

export type RawWorkshop = {
  id?: string | null
  company_name?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
} | null

export type RawResponseRow = {
  id: string
  message: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time: string | null
  can_pickup: boolean
  status: string
  paid?: boolean | null
  created_at: string
  workshops?: RawWorkshop
}

export const isContactUnlocked = (row: { status: string; paid?: boolean | null }): boolean =>
  row.status === 'won' && row.paid === true

export const toCustomerResponse = (row: RawResponseRow) => {
  const unlocked = isContactUnlocked(row)
  return {
    id: row.id,
    message: row.message,
    estimated_price_min: row.estimated_price_min,
    estimated_price_max: row.estimated_price_max,
    estimated_time: row.estimated_time,
    can_pickup: row.can_pickup,
    status: row.status,
    created_at: row.created_at,
    contact_unlocked: unlocked,
    workshop: row.workshops
      ? {
        id: row.workshops.id ?? null,
        company_name: row.workshops.company_name ?? null,
        phone: unlocked ? row.workshops.phone ?? null : null,
        email: unlocked ? row.workshops.email ?? null : null,
        website: unlocked ? row.workshops.website ?? null : null,
      }
      : null,
  }
}
