import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { useV2Pricing, formatKrFromOre, v2GrossOre } from '@/lib/v2/pricing'

export default function AdminSettings() {
  const pricing = useV2Pricing()
  const rows = [
    ['Månadsavgift', '0 kr'],
    ['Skicka offerter', 'Kostnadsfritt'],
    ['Gratis vunna jobb vid registrering', String(pricing.freeWinsOnSignup)],
    ['Därefter per vunnet jobb', `${formatKrFromOre(pricing.amountOre)} kr exkl. moms`],
    ['Per vunnet jobb inklusive moms', `${formatKrFromOre(v2GrossOre(pricing.amountOre, pricing.vatRate))} kr`],
    ['Provision på reparationen', '0 %'],
  ]
  return <CykelAdminLayout>
    <h1 className="font-display text-2xl font-bold mb-6">Inställningar</h1>
    <section className="max-w-2xl rounded-xl border bg-card p-5">
      <h2 className="font-display text-lg font-semibold mb-3">Priser för verkstäder</h2>
      <p className="text-sm text-muted-foreground mb-4">Avgiften tas först när kunden väljer verkstaden. Att ta emot ärenden och lämna offerter är gratis.</p>
      <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/50 p-3"><dt className="text-sm">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
      <p className="mt-4 text-sm text-muted-foreground">Detta är en läsvy. Prisreglerna styrs centralt i tjänsten och skickas till Stripe när betalningen skapas.</p>
    </section>
  </CykelAdminLayout>
}
