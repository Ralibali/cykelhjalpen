import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import DashboardLayout from '@/components/DashboardLayout'
import { Home, ClipboardList, MessageCircle, UserCircle } from 'lucide-react'

const navItems = [
  { label: 'Översikt', href: '/dashboard/buyer', icon: Home },
  { label: 'Mina uppdrag', href: '/dashboard/buyer/uppdrag', icon: ClipboardList },
  { label: 'Meddelanden', href: '/dashboard/buyer/chatt', icon: MessageCircle },
  { label: 'Min profil', href: '/dashboard/buyer/profil', icon: UserCircle },
]

const BuyerLayout = () => (
  <DashboardLayout navItems={navItems} ctaButton={{ label: '+ Nytt uppdrag', href: '/publicera' }}>
    <Suspense fallback={<div className="animate-pulse h-40 bg-muted rounded-xl" />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
)

export default BuyerLayout
