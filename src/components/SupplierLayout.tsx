import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import DashboardLayout from '@/components/DashboardLayout'
import { Home, Search, FileText, MessageCircle, UserCircle, CreditCard, Gift } from 'lucide-react'

const navItems = [
  { label: 'Översikt', href: '/dashboard/supplier', icon: Home },
  { label: 'Uppdrag', href: '/dashboard/supplier/uppdrag', icon: Search },
  { label: 'Offerter', href: '/dashboard/supplier/offerter', icon: FileText },
  { label: 'Meddelanden', href: '/dashboard/supplier/chatt', icon: MessageCircle },
  { label: 'Profil', href: '/dashboard/supplier/profil', icon: UserCircle },
  { label: 'Fakturering', href: '/dashboard/supplier/fakturering', icon: CreditCard },
  { label: 'Bjud in', href: '/dashboard/supplier/bjud-in', icon: Gift },
]

const SupplierLayout = () => (
  <DashboardLayout navItems={navItems}>
    <Suspense fallback={<div className="animate-pulse h-40 bg-muted rounded-xl" />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
)

export default SupplierLayout
