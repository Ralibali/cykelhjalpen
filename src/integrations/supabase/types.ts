export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      article_queue: {
        Row: {
          article_type: string
          category: string
          city: string | null
          created_at: string
          created_by: string | null
          estimated_difficulty: string | null
          generated_article_id: string | null
          id: string
          last_error: string | null
          priority: number
          publish_at: string | null
          retry_count: number
          search_intent: string | null
          status: string
          suggested_length: number
          target_keyword: string
          topic: string
          updated_at: string
          why_this_topic: string | null
        }
        Insert: {
          article_type?: string
          category: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          estimated_difficulty?: string | null
          generated_article_id?: string | null
          id?: string
          last_error?: string | null
          priority?: number
          publish_at?: string | null
          retry_count?: number
          search_intent?: string | null
          status?: string
          suggested_length?: number
          target_keyword: string
          topic: string
          updated_at?: string
          why_this_topic?: string | null
        }
        Update: {
          article_type?: string
          category?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          estimated_difficulty?: string | null
          generated_article_id?: string | null
          id?: string
          last_error?: string | null
          priority?: number
          publish_at?: string | null
          retry_count?: number
          search_intent?: string | null
          status?: string
          suggested_length?: number
          target_keyword?: string
          topic?: string
          updated_at?: string
          why_this_topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_queue_generated_article_id_fkey"
            columns: ["generated_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          article_type: string
          author_name: string
          author_role: string
          category: string
          city: string | null
          created_at: string
          faq: Json
          generated_by: string | null
          h1: string
          id: string
          intro: string
          meta_desc: string
          meta_title: string
          published_date: string
          read_time_minutes: number | null
          related_links: Json
          sections: Json
          slug: string
          status: string
          target_keyword: string | null
          updated_at: string
          updated_date: string
        }
        Insert: {
          article_type?: string
          author_name?: string
          author_role?: string
          category: string
          city?: string | null
          created_at?: string
          faq?: Json
          generated_by?: string | null
          h1: string
          id?: string
          intro: string
          meta_desc: string
          meta_title: string
          published_date?: string
          read_time_minutes?: number | null
          related_links?: Json
          sections?: Json
          slug: string
          status?: string
          target_keyword?: string | null
          updated_at?: string
          updated_date?: string
        }
        Update: {
          article_type?: string
          author_name?: string
          author_role?: string
          category?: string
          city?: string | null
          created_at?: string
          faq?: Json
          generated_by?: string | null
          h1?: string
          id?: string
          intro?: string
          meta_desc?: string
          meta_title?: string
          published_date?: string
          read_time_minutes?: number | null
          related_links?: Json
          sections?: Json
          slug?: string
          status?: string
          target_keyword?: string | null
          updated_at?: string
          updated_date?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_repair_requests: {
        Row: {
          admin_status: string
          approved_at: string | null
          area: string | null
          bike_type: string
          can_drop_off: boolean
          city: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          description: string
          id: string
          postcode: string | null
          rejected_reason: string | null
          repair_category: string
          status: string
          updated_at: string
          urgency: string | null
          view_token: string
          wants_pickup: boolean
        }
        Insert: {
          admin_status?: string
          approved_at?: string | null
          area?: string | null
          bike_type: string
          can_drop_off?: boolean
          city?: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          description: string
          id?: string
          postcode?: string | null
          rejected_reason?: string | null
          repair_category: string
          status?: string
          updated_at?: string
          urgency?: string | null
          view_token?: string
          wants_pickup?: boolean
        }
        Update: {
          admin_status?: string
          approved_at?: string | null
          area?: string | null
          bike_type?: string
          can_drop_off?: boolean
          city?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          description?: string
          id?: string
          postcode?: string | null
          rejected_reason?: string | null
          repair_category?: string
          status?: string
          updated_at?: string
          urgency?: string | null
          view_token?: string
          wants_pickup?: boolean
        }
        Relationships: []
      }
      bike_request_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bike_request_images_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_request_images_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_requests_for_workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      click_events: {
        Row: {
          created_at: string
          element_text: string | null
          event_name: string
          id: string
          metadata: Json | null
          path: string
          session_id: string
        }
        Insert: {
          created_at?: string
          element_text?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          path: string
          session_id: string
        }
        Update: {
          created_at?: string
          element_text?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          path?: string
          session_id?: string
        }
        Relationships: []
      }
      free_lead_grants: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          id: string
          reason: string | null
          workshop_id: string
        }
        Insert: {
          admin_id: string
          amount?: number
          created_at?: string
          id?: string
          reason?: string | null
          workshop_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          id?: string
          reason?: string | null
          workshop_id?: string
        }
        Relationships: []
      }
      guides: {
        Row: {
          category: string | null
          content: string
          description: string
          id: string
          is_published: boolean | null
          published_at: string | null
          reading_time_minutes: number | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          description: string
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          description?: string
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_charges: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          request_id: string
          response_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          workshop_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          request_id: string
          response_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          workshop_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          request_id?: string
          response_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_charges_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_charges_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_requests_for_workshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_charges_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "workshop_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_charges_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          project_id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          project_id: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          project_id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          delivery_weeks: number | null
          description: string
          id: string
          payment_plan: string | null
          price: number
          project_id: string
          status: string | null
          supplier_id: string
          title: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          delivery_weeks?: number | null
          description: string
          id?: string
          payment_plan?: string | null
          price: number
          project_id: string
          status?: string | null
          supplier_id: string
          title: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          delivery_weeks?: number | null
          description?: string
          id?: string
          payment_plan?: string | null
          price?: number
          project_id?: string
          status?: string | null
          supplier_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_bankid_verified: boolean | null
          is_phone_verified: boolean | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_bankid_verified?: boolean | null
          is_phone_verified?: boolean | null
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_bankid_verified?: boolean | null
          is_phone_verified?: boolean | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget_range: string | null
          buyer_id: string
          category: string
          city: string | null
          created_at: string | null
          description: string
          id: string
          is_company: boolean | null
          max_offers: number | null
          offer_count: number | null
          start_time: string | null
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          budget_range?: string | null
          buyer_id: string
          category: string
          city?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_company?: boolean | null
          max_offers?: number | null
          offer_count?: number | null
          start_time?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          budget_range?: string | null
          buyer_id?: string
          category?: string
          city?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_company?: boolean | null
          max_offers?: number | null
          offer_count?: number | null
          start_time?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          credits_awarded: boolean | null
          id: string
          referred_email: string
          referred_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          credits_awarded?: boolean | null
          id?: string
          referred_email: string
          referred_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          credits_awarded?: boolean | null
          id?: string
          referred_email?: string
          referred_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string | null
          id: string
          project_id: string
          rating: number
          supplier_id: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          project_id: string
          rating: number
          supplier_id: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          project_id?: string
          rating?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          amount_sek: number | null
          created_at: string | null
          credits_added: number | null
          event_type: string
          id: string
          plan: string | null
          stripe_event_id: string
          supplier_id: string | null
        }
        Insert: {
          amount_sek?: number | null
          created_at?: string | null
          credits_added?: number | null
          event_type: string
          id?: string
          plan?: string | null
          stripe_event_id: string
          supplier_id?: string | null
        }
        Update: {
          amount_sek?: number | null
          created_at?: string | null
          credits_added?: number | null
          event_type?: string
          id?: string
          plan?: string | null
          stripe_event_id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_events_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profiles: {
        Row: {
          avg_rating: number | null
          bio: string | null
          categories: string[] | null
          completed_projects: number | null
          contact_avatar_url: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string | null
          credit_check_at: string | null
          credit_check_passed: boolean | null
          has_fskatt: boolean | null
          has_fskatt_verified_at: string | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          lead_credits: number | null
          logo_url: string | null
          org_number: string | null
          plan: string | null
          portfolio_urls: string[] | null
          review_count: number | null
          services: string[] | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_leads_used: number | null
          website_url: string | null
        }
        Insert: {
          avg_rating?: number | null
          bio?: string | null
          categories?: string[] | null
          completed_projects?: number | null
          contact_avatar_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string | null
          credit_check_at?: string | null
          credit_check_passed?: boolean | null
          has_fskatt?: boolean | null
          has_fskatt_verified_at?: string | null
          id: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          lead_credits?: number | null
          logo_url?: string | null
          org_number?: string | null
          plan?: string | null
          portfolio_urls?: string[] | null
          review_count?: number | null
          services?: string[] | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_leads_used?: number | null
          website_url?: string | null
        }
        Update: {
          avg_rating?: number | null
          bio?: string | null
          categories?: string[] | null
          completed_projects?: number | null
          contact_avatar_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string | null
          credit_check_at?: string | null
          credit_check_passed?: boolean | null
          has_fskatt?: boolean | null
          has_fskatt_verified_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          lead_credits?: number | null
          logo_url?: string | null
          org_number?: string | null
          plan?: string | null
          portfolio_urls?: string[] | null
          review_count?: number | null
          services?: string[] | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_leads_used?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unlocked_leads: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          supplier_id: string
          used_trial_credit: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          supplier_id: string
          used_trial_credit?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          supplier_id?: string
          used_trial_credit?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unlocked_leads_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unlocked_leads_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_responses: {
        Row: {
          can_pickup: boolean
          created_at: string
          estimated_price_max: number | null
          estimated_price_min: number | null
          estimated_time: string | null
          id: string
          message: string
          paid: boolean
          request_id: string
          status: string
          stripe_payment_intent_id: string | null
          used_free_lead: boolean
          workshop_id: string
        }
        Insert: {
          can_pickup?: boolean
          created_at?: string
          estimated_price_max?: number | null
          estimated_price_min?: number | null
          estimated_time?: string | null
          id?: string
          message: string
          paid?: boolean
          request_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          used_free_lead?: boolean
          workshop_id: string
        }
        Update: {
          can_pickup?: boolean
          created_at?: string
          estimated_price_max?: number | null
          estimated_price_min?: number | null
          estimated_time?: string | null
          id?: string
          message?: string
          paid?: boolean
          request_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          used_free_lead?: boolean
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_requests_for_workshops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_responses_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          address: string | null
          approved: boolean
          areas_served: string[] | null
          city: string
          company_name: string
          created_at: string
          email: string
          free_leads_remaining: number
          id: string
          phone: string | null
          services: string[] | null
          slug: string | null
          sms_notifications: boolean
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          approved?: boolean
          areas_served?: string[] | null
          city?: string
          company_name: string
          created_at?: string
          email: string
          free_leads_remaining?: number
          id?: string
          phone?: string | null
          services?: string[] | null
          slug?: string | null
          sms_notifications?: boolean
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          approved?: boolean
          areas_served?: string[] | null
          city?: string
          company_name?: string
          created_at?: string
          email?: string
          free_leads_remaining?: number
          id?: string
          phone?: string | null
          services?: string[] | null
          slug?: string | null
          sms_notifications?: boolean
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      bike_requests_for_workshops: {
        Row: {
          already_responded: boolean | null
          area: string | null
          bike_type: string | null
          can_drop_off: boolean | null
          city: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          id: string | null
          postcode: string | null
          repair_category: string | null
          status: string | null
          urgency: string | null
          wants_pickup: boolean | null
        }
        Insert: {
          already_responded?: never
          area?: string | null
          bike_type?: string | null
          can_drop_off?: boolean | null
          city?: string | null
          created_at?: string | null
          customer_email?: never
          customer_name?: never
          customer_phone?: never
          description?: string | null
          id?: string | null
          postcode?: string | null
          repair_category?: string | null
          status?: string | null
          urgency?: string | null
          wants_pickup?: boolean | null
        }
        Update: {
          already_responded?: never
          area?: string | null
          bike_type?: string | null
          can_drop_off?: boolean | null
          city?: string | null
          created_at?: string | null
          customer_email?: never
          customer_name?: never
          customer_phone?: never
          description?: string | null
          id?: string | null
          postcode?: string | null
          repair_category?: string | null
          status?: string | null
          urgency?: string | null
          wants_pickup?: boolean | null
        }
        Relationships: []
      }
      public_agency_directory: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          bio: string | null
          categories: string[] | null
          city: string | null
          company_name: string | null
          completed_projects: number | null
          contact_email: string | null
          contact_name: string | null
          cover_url: string | null
          credit_check_passed: boolean | null
          full_name: string | null
          has_fskatt: boolean | null
          id: string | null
          is_featured: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          org_number: string | null
          portfolio_urls: string[] | null
          review_count: number | null
          services: string[] | null
          slug: string | null
          website_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          company_name: string | null
          full_name: string | null
          id: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
        }
        Relationships: []
      }
      public_supplier_profiles: {
        Row: {
          avg_rating: number | null
          bio: string | null
          categories: string[] | null
          completed_projects: number | null
          contact_avatar_url: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string | null
          credit_check_at: string | null
          credit_check_passed: boolean | null
          has_fskatt: boolean | null
          has_fskatt_verified_at: string | null
          id: string | null
          is_featured: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          org_number: string | null
          portfolio_urls: string[] | null
          review_count: number | null
          services: string[] | null
          slug: string | null
          website_url: string | null
        }
        Insert: {
          avg_rating?: number | null
          bio?: string | null
          categories?: string[] | null
          completed_projects?: number | null
          contact_avatar_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string | null
          credit_check_at?: string | null
          credit_check_passed?: boolean | null
          has_fskatt?: boolean | null
          has_fskatt_verified_at?: string | null
          id?: string | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          org_number?: string | null
          portfolio_urls?: string[] | null
          review_count?: number | null
          services?: string[] | null
          slug?: string | null
          website_url?: string | null
        }
        Update: {
          avg_rating?: number | null
          bio?: string | null
          categories?: string[] | null
          completed_projects?: number | null
          contact_avatar_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string | null
          credit_check_at?: string | null
          credit_check_passed?: boolean | null
          has_fskatt?: boolean | null
          has_fskatt_verified_at?: string | null
          id?: string | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          org_number?: string | null
          portfolio_urls?: string[] | null
          review_count?: number | null
          services?: string[] | null
          slug?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_cykel_price_stats: {
        Args: never
        Returns: {
          price_high: number
          price_low: number
          price_typical: number
          repair_category: string
          sample_count: number
        }[]
      }
      get_cykel_public_stats: { Args: never; Returns: Json }
      get_workshop_id: { Args: { _user_id: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved_workshop: { Args: { _user_id: string }; Returns: boolean }
      submit_bike_repair_request: {
        Args: {
          p_area: string
          p_bike_type: string
          p_can_drop_off: boolean
          p_city?: string
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_description: string
          p_postcode: string
          p_repair_category: string
          p_urgency: string
          p_wants_pickup: boolean
        }
        Returns: {
          id: string
          view_token: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
