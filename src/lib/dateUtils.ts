type Translator = (sv: string, vars?: Record<string, string | number>) => string

const identity: Translator = (s) => s

export function timeAgo(dateStr: string, t: Translator = identity): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return t('Just nu')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('{n} min sedan', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? t('{n} timme sedan', { n: hours }) : t('{n} timmar sedan', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? t('{n} dag sedan', { n: days }) : t('{n} dagar sedan', { n: days })
  const months = Math.floor(days / 30)
  return months === 1 ? t('{n} månad sedan', { n: months }) : t('{n} månader sedan', { n: months })
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('sv-SE').replace(/\s/g, ' ') + ' kr'
}
