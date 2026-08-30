import {
  Activity, Bell, Bike, BookOpen, CreditCard, FileText, Home, Mail, Newspaper, Search,
  Settings, Sparkles, Star, Users, Wrench, BarChart3, ScrollText, Link2, Eye,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AdminCounts } from '@/hooks/useAdminCounts'

export interface AdminNavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Nyckel i useAdminCounts som visas som badge */
  badge?: keyof AdminCounts
  /** Röd badge istället för neutral */
  danger?: boolean
  keywords?: string
}

export interface AdminNavGroup {
  title: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: 'Dagligt',
    items: [
      { label: 'Översikt', href: '/admin', icon: Home, keywords: 'dashboard start' },
      { label: 'Cykelärenden', href: '/admin/cykelarenden', icon: Bike, badge: 'pendingRequests', keywords: 'förfrågningar kunder granska' },
      { label: 'Offerter', href: '/admin/offerter', icon: FileText, keywords: 'svar verkstadssvar' },
      { label: 'Recensioner', href: '/admin/recensioner', icon: Star, keywords: 'omdömen betyg moderering utfall' },
      { label: 'Verkstäder', href: '/admin/verkstader', icon: Wrench, badge: 'pendingWorkshops', keywords: 'godkänna partners' },
      { label: 'Inkorg', href: '/admin/mejl', icon: Mail, badge: 'unreadMail', keywords: 'mejl email inbound' },
    ],
  },
  {
    title: 'Affär',
    items: [
      { label: 'Betalningar', href: '/admin/cykelbetalningar', icon: CreditCard, keywords: 'lead charges intäkter' },
      { label: 'Stripe-logg', href: '/admin/stripe', icon: ScrollText, keywords: 'events webhook' },
      { label: 'Användare', href: '/admin/anvandare', icon: Users, keywords: 'konton profiler' },
    ],
  },
  {
    title: 'Tillväxt',
    items: [
      { label: 'Prospekt', href: '/admin/prospekt', icon: Search, badge: 'openProspects', keywords: 'rekrytering outreach' },
      { label: 'Statistik', href: '/admin/statistik', icon: BarChart3, keywords: 'analytics siffror' },
      { label: 'Marketplace health', href: '/admin/marketplace-health', icon: Activity, keywords: 'hälsa utbud efterfrågan städer' },
      { label: 'Innehåll V2', href: '/admin/innehall', icon: BookOpen, keywords: 'guider innehåll redaktion publicera granska v2' },
      { label: 'Besökare', href: '/admin/besokare', icon: Eye, keywords: 'trafik sidvisningar' },
      { label: 'Guider', href: '/admin/guider', icon: Newspaper, keywords: 'innehåll artiklar' },
      { label: 'Artikelgenerator', href: '/admin/artikelgenerator', icon: Sparkles, keywords: 'ai seo innehåll' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Notisloggen', href: '/admin/notifieringar-logg', icon: Bell, badge: 'failedNotifications', danger: true, keywords: 'sms mejl fel' },
      { label: 'Redirects', href: '/admin/redirects', icon: Link2, keywords: 'länkar 404' },
      { label: 'Audit-logg', href: '/admin/audit', icon: Activity, keywords: 'historik ändringar' },
      { label: 'Inställningar', href: '/admin/installningar', icon: Settings, keywords: 'konfiguration' },
    ],
  },
]

export const ADMIN_NAV_FLAT: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items)

/** De fem viktigaste posterna i mobilens bottenmeny. */
export const ADMIN_MOBILE_PRIMARY = ['/admin', '/admin/cykelarenden', '/admin/verkstader', '/admin/mejl']
