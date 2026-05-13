export type UserRole = 'buyer' | 'supplier' | 'admin'
export type ProjectStatus = 'draft' | 'active' | 'closed' | 'completed'
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'
export type SupplierPlan = 'none' | 'trial' | 'payg' | 'standard' | 'premium' | 'monthly' | 'lead'
export type BudgetRange = 'under_10k' | '10k_50k' | '50k_150k' | 'over_150k' | 'unknown'
export type StartTime = 'asap' | 'within_month' | 'within_3months' | 'flexible'
export type PaymentPlan = 'fixed' | 'hourly' | 'milestone'
export type Category =
  | 'Webbutveckling' | 'E-handel' | 'Digital marknadsföring'
  | 'Grafisk design/UX' | 'SEO' | 'App-utveckling'
  | 'IT-konsult' | 'Sociala medier'
  | 'Mjukvaruutveckling' | 'Video & foto' | 'Varumärke & PR'
  | 'UX/Webbdesign' | 'Underhåll/IT Support' | 'Affärsutveckling' | 'AI-utveckling'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  email: string | null
  company_name: string | null
  city: string | null
  phone: string | null
  avatar_url: string | null
  is_bankid_verified: boolean
  is_phone_verified: boolean
  created_at: string
}

export interface SupplierProfile {
  id: string
  slug: string
  bio: string | null
  logo_url: string | null
  cover_url: string | null
  categories: Category[]
  services: string[]
  portfolio_urls: string[]
  website_url: string | null
  avg_rating: number
  review_count: number
  completed_projects: number
  plan: SupplierPlan
  trial_ends_at: string | null
  trial_leads_used: number
  lead_credits: number
  is_featured: boolean
  is_verified: boolean
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_avatar_url: string | null
  org_number: string | null
  has_fskatt: boolean
  has_fskatt_verified_at: string | null
  credit_check_passed: boolean
  credit_check_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  profile?: Profile
}

export interface Project {
  id: string
  buyer_id: string
  title: string
  description: string
  category: Category
  budget_range: BudgetRange
  start_time: StartTime
  city: string | null
  is_company: boolean
  status: ProjectStatus
  offer_count: number
  max_offers: number
  view_count: number
  created_at: string
  buyer?: Profile
}

export interface Offer {
  id: string
  project_id: string
  supplier_id: string
  title: string
  description: string
  price: number
  payment_plan: PaymentPlan
  delivery_weeks: number
  status: OfferStatus
  created_at: string
  supplier?: Profile & { supplier_profile?: SupplierProfile }
  project?: Project
}

export interface Message {
  id: string
  project_id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}
