import { EN } from '../../src/locales/en'
import { buildCykelSeoPages } from '../../src/lib/cykelSeoPages'
const missing = new Set<string>()
const t = (sv: string, vars?: any) => {
  if (!(sv in EN)) missing.add(sv)
  const s = (EN as any)[sv] ?? sv
  return vars ? s.replace(/\{(\w+)\}/g, (m:string,k:string)=> k in vars ? String(vars[k]) : m) : s
}
const pages = buildCykelSeoPages(t)
console.log('pages', pages.length, 'missing', missing.size)
for (const m of missing) console.log('MISS:', JSON.stringify(m))
