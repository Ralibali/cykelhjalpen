import { AdminLayout } from './AdminDashboard'
import { TRIAL_LEADS, TRIAL_DAYS, MAX_OFFERS_PER_PROJECT, PLANS } from '@/lib/constants'

const AdminSettings = () => {
  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Inställningar</h1>

      <div className="space-y-6 max-w-2xl">
        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold text-lg mb-4">Aktuella systemvärden</h2>
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Trial-dagar</span>
              <span className="font-semibold">{TRIAL_DAYS} dagar</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Trial-leads</span>
              <span className="font-semibold">{TRIAL_LEADS} st</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Max offerter per uppdrag</span>
              <span className="font-semibold">{MAX_OFFERS_PER_PROJECT} st</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold text-lg mb-4">Prisplaner</h2>
          <div className="space-y-3">
            {PLANS.map(plan => (
              <div key={plan.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.id === 'monthly' ? 'Obegränsade' : '1'} leads</p>
                </div>
                <span className="font-semibold">{plan.price} kr {plan.per}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}

export default AdminSettings
