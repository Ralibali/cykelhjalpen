export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just nu'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min sedan`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'timme' : 'timmar'} sedan`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? 'dag' : 'dagar'} sedan`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'månad' : 'månader'} sedan`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('sv-SE').replace(/\s/g, ' ') + ' kr'
}
