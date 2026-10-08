import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, SupplierProfile, UserRole } from '@/types'
import { toast } from 'sonner'
import { getCurrentHost } from '@/lib/hostConfig'
import { withAuthTimeout } from '@/lib/authErrors'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  supplierProfile: SupplierProfile | null
  loading: boolean
  profileError: string | null
  isAuthenticated: boolean
  isBuyer: boolean
  isSupplier: boolean
  isAdmin: boolean
  isOnTrial: boolean
  trialLeadsLeft: number
  trialDaysLeft: number
  trialExpired: boolean
  hasActiveSubscription: boolean
  canUnlockLeads: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

interface SignUpData {
  email: string
  password: string
  role: UserRole
  full_name: string
  company_name?: string
  city?: string
  phone?: string
  categories?: string[]
  org_number?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const currentUserId = useRef<string | null>(null)
  const profileRequest = useRef(0)
  const profileController = useRef<AbortController | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    profileController.current?.abort()
    const controller = new AbortController()
    profileController.current = controller
    const request = ++profileRequest.current
    const isCurrent = () => !controller.signal.aborted && request === profileRequest.current && currentUserId.current === userId
    setLoading(true)
    setProfileError(null)

    try {
      const result = await withAuthTimeout((async () => {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .abortSignal(controller.signal)
          .maybeSingle()
        if (error || !profileData) throw error ?? new Error('missing_profile')

        // Workshops live in workshops, not Updro's supplier_profiles table.
        let supplierData: SupplierProfile | null = null
        if (getCurrentHost() === 'updro' && profileData.role === 'supplier') {
          const { data, error: supplierError } = await supabase
            .from('supplier_profiles')
            .select('*')
            .eq('id', userId)
            .abortSignal(controller.signal)
            .maybeSingle()
          if (supplierError) throw supplierError
          supplierData = data as unknown as SupplierProfile | null
        }
        return { profileData, supplierData }
      })())
      if (isCurrent()) {
        setProfile(result.profileData as unknown as Profile)
        setSupplierProfile(result.supplierData)
      }
    } catch {
      if (isCurrent()) {
        setProfile(null)
        setSupplierProfile(null)
        setProfileError('Du är inloggad, men vi kunde inte läsa in ditt konto. Försök igen. Kontakta oss om problemet kvarstår.')
      }
    } finally {
      if (isCurrent()) setLoading(false)
      controller.abort()
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  const createPendingProject = useCallback(async (userId: string) => {
    const raw = localStorage.getItem('pending_project')
    if (!raw) return
    try {
      const pending = JSON.parse(raw)
      localStorage.removeItem('pending_project')
      const { error } = await supabase.from('projects').insert({
        buyer_id: userId,
        title: pending.title,
        description: pending.description,
        category: pending.category,
        budget_range: pending.budget_range,
        start_time: pending.start_time,
        is_company: pending.is_company ?? true,
        status: 'pending',
      })
      if (!error) {
        toast.success('Ditt uppdrag har publicerats! ✅')
      }
    } catch {
      localStorage.removeItem('pending_project')
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let authEventReceived = false

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return
      const nextId = nextSession?.user.id ?? null
      if (currentUserId.current !== nextId) {
        currentUserId.current = nextId
        ++profileRequest.current
        profileController.current?.abort()
        setProfile(null)
        setSupplierProfile(null)
        setProfileError(null)
        setLoading(!!nextId)
      }
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (!nextId) setLoading(false)
    }

    // Keep the auth callback synchronous and free of Supabase requests.
    // Profile work runs separately, after Supabase has released its auth lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        authEventReceived = true
        applySession(nextSession)
      }
    )

    void withAuthTimeout(supabase.auth.getSession()).then(({ data, error }) => {
      if (!isMounted || authEventReceived) return
      if (error) throw error
      applySession(data.session)
    }).catch(() => {
      if (!isMounted || authEventReceived) return
      setProfileError('Kunde inte läsa din inloggning. Försök logga in igen.')
      setLoading(false)
    })

    return () => {
      isMounted = false
      profileController.current?.abort()
      subscription.unsubscribe()
    }
  }, [])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const timer = setTimeout(() => {
      void fetchProfile(userId)
      if (getCurrentHost() === 'updro') void createPendingProject(userId)
    }, 0)
    return () => clearTimeout(timer)
  }, [userId, fetchProfile, createPendingProject])

  const signIn = async (email: string, password: string) => {
    setProfileError(null)
    try {
      const { error } = await withAuthTimeout(supabase.auth.signInWithPassword({ email: email.trim(), password }))
      return { error: error as Error | null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('sign_in_failed') }
    }
  }

  const signUp = async (data: SignUpData) => {
    const { data: result, error } = await supabase.functions.invoke<{
      error?: string
      userId?: string
      session?: Session | null
    }>('create-account', { body: data })

    if (error || result?.error) {
      return { error: new Error(result?.error || error?.message || 'Något gick fel vid registrering.') }
    }

    if (result?.session) {
      await supabase.auth.setSession(result.session)
      setSession(result.session)
      setUser(result.session.user)
      await fetchProfile(result.session.user.id)
    }

    return { error: null }
  }


  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSupplierProfile(null)
  }

  // Trial calculations
  const isOnTrial = supplierProfile?.plan === 'trial' &&
    !!supplierProfile.trial_ends_at &&
    new Date(supplierProfile.trial_ends_at) > new Date() &&
    (supplierProfile.lead_credits ?? 0) > 0

  const trialLeadsLeft = supplierProfile?.lead_credits ?? 0

  const trialDaysLeft = supplierProfile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(supplierProfile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  const trialExpired = supplierProfile?.plan === 'trial' && !isOnTrial

  // Active subscription = monthly plan
  const hasActiveSubscription = supplierProfile?.plan === 'monthly'

  // Can unlock leads = on trial with credits, or has active subscription, or pay-per-lead (always can if willing to pay)
  const canUnlockLeads = isOnTrial || hasActiveSubscription

  const value: AuthContextType = {
    user,
    session,
    profile,
    supplierProfile,
    loading,
    profileError,
    isAuthenticated: !!user,
    isBuyer: profile?.role === 'buyer',
    isSupplier: profile?.role === 'supplier',
    isAdmin: profile?.role === 'admin',
    isOnTrial,
    trialLeadsLeft,
    trialDaysLeft,
    trialExpired,
    hasActiveSubscription,
    canUnlockLeads,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
