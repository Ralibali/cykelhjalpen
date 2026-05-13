import { AdminLayout } from './AdminDashboard'
import VisitorAnalytics from '@/components/admin/VisitorAnalytics'

const AdminVisitors = () => (
  <AdminLayout>
    <h1 className="font-display text-2xl font-bold mb-6">Besöksanalys</h1>
    <VisitorAnalytics />
  </AdminLayout>
)

export default AdminVisitors
