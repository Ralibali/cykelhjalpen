import MarketplaceHealthPanel from '@/components/admin/MarketplaceHealthPanel'
import { AdminLayout } from './AdminDashboard'
import { useT } from '@/lib/i18n'

const AdminMarketplaceHealth = () => {
  const t = useT()
  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <h1 className="font-display text-2xl font-bold mb-6">{t('Marketplace health')}</h1>
        <MarketplaceHealthPanel />
      </div>
    </AdminLayout>
  )
}

export default AdminMarketplaceHealth
