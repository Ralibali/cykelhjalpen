import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import type { UserRole } from '@/types'

type ProtectedRole = UserRole | 'workshop'

interface ProtectedRouteProps {
  children: React.ReactNode
  role?: ProtectedRole
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
)

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, profile, user } = useAuth()
  const [workshopChecked, setWorkshopChecked] = useState(role !== 'workshop')
  const [hasWorkshop, setHasWorkshop] = useState(false)

  useEffect(() => {
    if (role !== 'workshop') return
    if (!user) {
      setWorkshopChecked(true)
      setHasWorkshop(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('workshops')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!cancelled) {
        setHasWorkshop(!!data)
        setWorkshopChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [role, user])

  if (loading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/logga-in" replace />

  if (role === 'workshop') {
    if (!workshopChecked) return <Spinner />
    if (!hasWorkshop && profile?.role !== 'admin') {
      return <Navigate to="/registrera/verkstad" replace />
    }
    return <>{children}</>
  }

  // Admin can access all protected routes
  if (role && profile?.role !== role && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
