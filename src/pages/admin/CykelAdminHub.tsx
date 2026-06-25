import { getCurrentHost } from '@/lib/hostConfig'
import AdminDashboard from './AdminDashboard'
import CykelAdminOverview from './CykelAdminOverview'

const AdminRoot = () => (
  getCurrentHost() === 'updro'
    ? <AdminDashboard />
    : <CykelAdminOverview />
)

export default AdminRoot
