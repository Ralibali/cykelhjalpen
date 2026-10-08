import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import type { UserRole } from '@/types'
import { withAuthTimeout } from '@/lib/authErrors'
import AuthLoadError from '@/components/AuthLoadError'
import { useT } from '@/lib/i18n'

type ProtectedRole = UserRole | 'workshop'

interface ProtectedRouteProps {
  children: React.ReactNode
  role?: ProtectedRole
}

const Spinner = () => {
  const t = useT()
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div role="status" aria-label={t('Laddar konto')} className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, profile, user, profileError, refreshProfile } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [workshopCheck, setWorkshopCheck] = useState<{
    userId: string; attempt: number; exists: boolean; error: boolean
  } | null>(null)
  const userId = user?.id
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (role !== 'workshop' || !userId || loading || profileError || isAdmin) return
    let cancelled = false
    const controller = new AbortController()
    ;(async () => {
      try {
        const { data, error } = await withAuthTimeout(supabase
          .from('workshops')
          .select('id')
          .eq('user_id', userId)
          .abortSignal(controller.signal)
          .maybeSingle())
        if (error) throw error
        if (!cancelled) setWorkshopCheck({ userId, attempt, exists: !!data, error: false })
      } catch {
        if (!cancelled) setWorkshopCheck({ userId, attempt, exists: false, error: true })
      } finally {
        controller.abort()
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [role, userId, loading, profileError, isAdmin, attempt])

  if (loading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/logga-in" replace />
  if (profileError) return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <AuthLoadError message={profileError} onRetry={() => void refreshProfile()} />
    </main>
  )

  if (role === 'workshop' && !isAdmin) {
    if (!workshopCheck || workshopCheck.userId !== userId || workshopCheck.attempt !== attempt) return <Spinner />
    if (workshopCheck.error) return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <AuthLoadError
          message="Kunde inte läsa in din verkstad. Försök igen. Du behöver inte registrera dig på nytt."
          onRetry={() => setAttempt(value => value + 1)}
        />
      </main>
    )
    if (!workshopCheck.exists) return <Navigate to="/registrera/verkstad" replace />
    return <>{children}</>
  }

  // Admin can access all protected routes
  if (role && profile?.role !== role && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
