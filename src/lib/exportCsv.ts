export function exportCsv(rows: Record<string, any>[], filename: string) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => headers.map(h => {
      const val = String(row[h] ?? '')
      return val.includes(';') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val
    }).join(';'))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
