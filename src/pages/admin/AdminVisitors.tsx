import { AdminLayout } from './AdminDashboard'
import VisitorAnalytics from '@/components/admin/VisitorAnalytics'
import { useT } from '@/lib/i18n'

const AdminVisitors = () => {
  const t = useT()
  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">{t('Besöksanalys')}</h1>
      <VisitorAnalytics />
    </AdminLayout>
  )
}

export default AdminVisitors
