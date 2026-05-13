import MarketplaceHealthPanel from '@/components/admin/MarketplaceHealthPanel'
import { AdminLayout } from './AdminDashboard'

const AdminMarketplaceHealth = () => (
  <AdminLayout>
    <div className="max-w-5xl">
      <h1 className="font-display text-2xl font-bold mb-6">Marketplace health</h1>
      <MarketplaceHealthPanel />
    </div>
  </AdminLayout>
)

export default AdminMarketplaceHealth
