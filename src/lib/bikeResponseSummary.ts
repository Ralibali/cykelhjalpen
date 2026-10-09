type Response = { status?: string | null; paid?: boolean | null }

// Payment happens at a win, not when a quote is sent.
export function bikeResponseSummary(responses: Response[] = []) {
  const sent = responses.filter(row => ['sent', 'won', 'lost'].includes(row.status || '') || row.paid === true).length
  return {
    sent,
    drafts: responses.filter(row => ['draft', 'pending_payment'].includes(row.status || '') && !row.paid).length,
    won: responses.filter(row => row.status === 'won').length,
    settled: responses.filter(row => row.paid === true).length,
    hasReply: sent > 0,
  }
}

export function bikeResponseLabel(status: string, paid: boolean, free: boolean) {
  if (status === 'won') return paid ? (free ? 'Vunnet · gratis' : 'Vunnet · betalt') : 'Vunnet · inväntar betalning'
  if (status === 'lost') return 'Skickad · ej vald'
  if (status === 'sent' || paid) return 'Skickad'
  if (status === 'closed_for_responses') return 'Stängd'
  return 'Utkast'
}
