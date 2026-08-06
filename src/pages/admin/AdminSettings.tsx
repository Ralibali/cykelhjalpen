import { AdminLayout } from './AdminDashboard'
import { TRIAL_LEADS, TRIAL_DAYS, MAX_OFFERS_PER_PROJECT, PLANS } from '@/lib/constants'
import { useT } from '@/lib/i18n'

const AdminSettings = () => {
  const t = useT()
  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">{t('Inställningar')}</h1>

      <div className="space-y-6 max-w-2xl">
        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold text-lg mb-4">{t('Aktuella systemvärden')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">{t('Trial-dagar')}</span>
              <span className="font-semibold">{t('{n} dagar', { n: TRIAL_DAYS })}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">{t('Trial-leads')}</span>
              <span className="font-semibold">{t('{n} st', { n: TRIAL_LEADS })}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">{t('Max offerter per uppdrag')}</span>
              <span className="font-semibold">{t('{n} st', { n: MAX_OFFERS_PER_PROJECT })}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold text-lg mb-4">{t('Prisplaner')}</h2>
          <div className="space-y-3">
            {PLANS.map(plan => (
              <div key={plan.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.id === 'monthly' ? t('Obegränsade') : '1'} {t('leads')}</p>
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
