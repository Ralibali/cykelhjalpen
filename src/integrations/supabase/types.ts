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
          closed_at: string | null
          created_at: string
          customer_email: string
          customer_language: string
          customer_name: string
          customer_phone: string | null
          customer_terms_accepted_at: string | null
          customer_terms_version: string | null
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
          // __V2GEN_COLS_bike_repair_requests_Row_START__
          reselection_count: number
          // __V2GEN_COLS_bike_repair_requests_Row_END__
        }
        Insert: {
          admin_status?: string
          approved_at?: string | null
          area?: string | null
          bike_type: string
          can_drop_off?: boolean
          city?: string
          closed_at?: string | null
          created_at?: string
          customer_email: string
          customer_language?: string
          customer_name: string
          customer_phone?: string | null
          customer_terms_accepted_at?: string | null
          customer_terms_version?: string | null
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
          // __V2GEN_COLS_bike_repair_requests_Insert_START__
          reselection_count?: number
          // __V2GEN_COLS_bike_repair_requests_Insert_END__
        }
        Update: {
          admin_status?: string
          approved_at?: string | null
          area?: string | null
          bike_type?: string
          can_drop_off?: boolean
          city?: string
          closed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_language?: string
          customer_name?: string
          customer_phone?: string | null
          customer_terms_accepted_at?: string | null
          customer_terms_version?: string | null
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
          // __V2GEN_COLS_bike_repair_requests_Update_START__
          reselection_count?: number
          // __V2GEN_COLS_bike_repair_requests_Update_END__
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
      contact_suppression: {
        Row: {
          added_by: string | null
          contact_type: string
          created_at: string
          id: string
          reason: string | null
          value: string
        }
        Insert: {
          added_by?: string | null
          contact_type: string
          created_at?: string
          id?: string
          reason?: string | null
          value: string
        }
        Update: {
          added_by?: string | null
          contact_type?: string
          created_at?: string
          id?: string
          reason?: string | null
          value?: string
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
      inbound_emails: {
        Row: {
          archived_at: string | null
          created_at: string
          from_email: string
          from_name: string | null
          headers: Json | null
          html_body: string | null
          id: string
          message_id: string | null
          prospect_id: string | null
          raw: Json | null
          read_at: string | null
          received_at: string
          replied_at: string | null
          resend_email_id: string | null
          subject: string | null
          text_body: string | null
          to_emails: string[]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          from_email: string
          from_name?: string | null
          headers?: Json | null
          html_body?: string | null
          id?: string
          message_id?: string | null
          prospect_id?: string | null
          raw?: Json | null
          read_at?: string | null
          received_at?: string
          replied_at?: string | null
          resend_email_id?: string | null
          subject?: string | null
          text_body?: string | null
          to_emails?: string[]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          from_email?: string
          from_name?: string | null
          headers?: Json | null
          html_body?: string | null
          id?: string
          message_id?: string | null
          prospect_id?: string | null
          raw?: Json | null
          read_at?: string | null
          received_at?: string
          replied_at?: string | null
          resend_email_id?: string | null
          subject?: string | null
          text_body?: string | null
          to_emails?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "workshop_prospects"
            referencedColumns: ["id"]
          },
        ]
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
      lead_credit_purchases: {
        Row: {
          amount_ore: number
          created_at: string
          currency: string
          id: string
          quantity: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          amount_ore: number
          created_at?: string
          currency?: string
          id?: string
          quantity: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          amount_ore?: number
          created_at?: string
          currency?: string
          id?: string
          quantity?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_credit_purchases_workshop_id_fkey"
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
      notification_events: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          error: string | null
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          payload: Json
          provider: string | null
          recipient: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          payload?: Json
          provider?: string | null
          recipient: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          payload?: Json
          provider?: string | null
          recipient?: string
          status?: string
          updated_at?: string
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
      outreach_activities: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          channel: string
          created_at: string
          direction: string
          error: string | null
          id: string
          idempotency_key: string | null
          kind: string
          message: string
          performed_by: string | null
          prospect_id: string
          provider: string | null
          provider_message_id: string | null
          recipient: string
          retry_count: number
          send_lock_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          channel: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          message: string
          performed_by?: string | null
          prospect_id: string
          provider?: string | null
          provider_message_id?: string | null
          recipient: string
          retry_count?: number
          send_lock_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          message?: string
          performed_by?: string | null
          prospect_id?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string
          retry_count?: number
          send_lock_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "workshop_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_clicks: {
        Row: {
          activity_id: string
          clicked_at: string
          id: string
          prospect_id: string
          user_agent: string | null
        }
        Insert: {
          activity_id: string
          clicked_at?: string
          id?: string
          prospect_id: string
          user_agent?: string | null
        }
        Update: {
          activity_id?: string
          clicked_at?: string
          id?: string
          prospect_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_clicks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "outreach_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_clicks_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "workshop_prospects"
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
      prospect_sources: {
        Row: {
          city: string | null
          created_at: string
          fetched_at: string
          id: string
          prospect_id: string
          raw_excerpt: string | null
          raw_payload: Json
          search_term: string | null
          source_type: string
          source_url: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          prospect_id: string
          raw_excerpt?: string | null
          raw_payload?: Json
          search_term?: string | null
          source_type: string
          source_url?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          prospect_id?: string
          raw_excerpt?: string | null
          raw_payload?: Json
          search_term?: string | null
          source_type?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_sources_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "workshop_prospects"
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
      sent_emails: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          from_email: string
          html_body: string | null
          id: string
          in_reply_to: string | null
          prospect_id: string | null
          resend_email_id: string | null
          status: string
          subject: string
          text_body: string
          to_emails: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          from_email?: string
          html_body?: string | null
          id?: string
          in_reply_to?: string | null
          prospect_id?: string | null
          resend_email_id?: string | null
          status?: string
          subject: string
          text_body: string
          to_emails: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          from_email?: string
          html_body?: string | null
          id?: string
          in_reply_to?: string | null
          prospect_id?: string | null
          resend_email_id?: string | null
          status?: string
          subject?: string
          text_body?: string
          to_emails?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "sent_emails_in_reply_to_fkey"
            columns: ["in_reply_to"]
            isOneToOne: false
            referencedRelation: "inbound_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "workshop_prospects"
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
      terms_acceptance_log: {
        Row: {
          accepted_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          terms_type: string
          terms_version: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          terms_type: string
          terms_version: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          terms_type?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      terms_versions: {
        Row: {
          content_summary: string | null
          created_at: string
          effective_date: string
          id: string
          title: string
          type: string
          version: string
        }
        Insert: {
          content_summary?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          title: string
          type: string
          version: string
        }
        Update: {
          content_summary?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          title?: string
          type?: string
          version?: string
        }
        Relationships: []
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
      workshop_prospects: {
        Row: {
          address: string | null
          ai_summary: string | null
          assigned_admin_id: string | null
          city: string
          company_name: string
          contact_count: number
          converted_workshop_id: string | null
          created_at: string
          do_not_contact: boolean
          email: string | null
          id: string
          last_checked_at: string | null
          last_contacted_at: string | null
          normalized_domain: string | null
          normalized_email: string | null
          normalized_name: string
          normalized_phone: string | null
          notes: string | null
          opening_hours: string | null
          phone: string | null
          score: number
          services: string[]
          status: string
          unsubscribe_token: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          ai_summary?: string | null
          assigned_admin_id?: string | null
          city: string
          company_name: string
          contact_count?: number
          converted_workshop_id?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          id?: string
          last_checked_at?: string | null
          last_contacted_at?: string | null
          normalized_domain?: string | null
          normalized_email?: string | null
          normalized_name: string
          normalized_phone?: string | null
          notes?: string | null
          opening_hours?: string | null
          phone?: string | null
          score?: number
          services?: string[]
          status?: string
          unsubscribe_token?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          ai_summary?: string | null
          assigned_admin_id?: string | null
          city?: string
          company_name?: string
          contact_count?: number
          converted_workshop_id?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          id?: string
          last_checked_at?: string | null
          last_contacted_at?: string | null
          normalized_domain?: string | null
          normalized_email?: string | null
          normalized_name?: string
          normalized_phone?: string | null
          notes?: string | null
          opening_hours?: string | null
          phone?: string | null
          score?: number
          services?: string[]
          status?: string
          unsubscribe_token?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_prospects_converted_workshop_id_fkey"
            columns: ["converted_workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
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
          // __V2GEN_COLS_workshop_responses_Row_START__
          ghosted_claim_status: string | null
          stalled_at: string | null
          winner_reminded_at: string | null
          // __V2GEN_COLS_workshop_responses_Row_END__
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
          // __V2GEN_COLS_workshop_responses_Insert_START__
          ghosted_claim_status?: string | null
          stalled_at?: string | null
          winner_reminded_at?: string | null
          // __V2GEN_COLS_workshop_responses_Insert_END__
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
          // __V2GEN_COLS_workshop_responses_Update_START__
          ghosted_claim_status?: string | null
          stalled_at?: string | null
          winner_reminded_at?: string | null
          // __V2GEN_COLS_workshop_responses_Update_END__
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
          booking_url: string | null
          city: string
          company_name: string
          created_at: string
          description: string | null
          dpa_accepted_at: string | null
          email: string
          facebook_url: string | null
          founded_year: number | null
          free_leads_remaining: number
          id: string
          instagram_url: string | null
          logo_url: string | null
          opening_hours: string | null
          org_number: string | null
          phone: string | null
          price_info: string | null
          rejected_reason: string | null
          reviewed_at: string | null
          services: string[] | null
          slug: string | null
          sms_notifications: boolean
          stripe_customer_id: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string
          website: string | null
          // __V2GEN_COLS_workshops_Row_START__
          bio_short: string | null
          cluster_opt_in: boolean
          onboarding_state: string
          public_profile_opt_in: boolean
          service_area_mode: string
          // __V2GEN_COLS_workshops_Row_END__
        }
        Insert: {
          address?: string | null
          approved?: boolean
          areas_served?: string[] | null
          booking_url?: string | null
          city?: string
          company_name: string
          created_at?: string
          description?: string | null
          dpa_accepted_at?: string | null
          email: string
          facebook_url?: string | null
          founded_year?: number | null
          free_leads_remaining?: number
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          opening_hours?: string | null
          org_number?: string | null
          phone?: string | null
          price_info?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          services?: string[] | null
          slug?: string | null
          sms_notifications?: boolean
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          // __V2GEN_COLS_workshops_Insert_START__
          bio_short?: string | null
          cluster_opt_in?: boolean
          onboarding_state?: string
          public_profile_opt_in?: boolean
          service_area_mode?: string
          // __V2GEN_COLS_workshops_Insert_END__
        }
        Update: {
          address?: string | null
          approved?: boolean
          areas_served?: string[] | null
          booking_url?: string | null
          city?: string
          company_name?: string
          created_at?: string
          description?: string | null
          dpa_accepted_at?: string | null
          email?: string
          facebook_url?: string | null
          founded_year?: number | null
          free_leads_remaining?: number
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          opening_hours?: string | null
          org_number?: string | null
          phone?: string | null
          price_info?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          services?: string[] | null
          slug?: string | null
          sms_notifications?: boolean
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          // __V2GEN_COLS_workshops_Update_START__
          bio_short?: string | null
          cluster_opt_in?: boolean
          onboarding_state?: string
          public_profile_opt_in?: boolean
          service_area_mode?: string
          // __V2GEN_COLS_workshops_Update_END__
        }
        Relationships: []
      }
      // __V2GEN_TABLES_START__ (generated by scripts/generate-v2-types.mjs — do not edit by hand)
      v2_city_clusters: {
        Row: {
          active: boolean
          cluster_slug: string
          created_at: string
          name: string
        }
        Insert: {
          active?: boolean
          cluster_slug: string
          created_at?: string
          name: string
        }
        Update: {
          active?: boolean
          cluster_slug?: string
          created_at?: string
          name?: string
        }
        Relationships: []
      }
      v2_city_configs: {
        Row: {
          auto_approve_requests: boolean
          city_name: string
          city_slug: string
          cluster_slug: string | null
          created_at: string
          demand_open: boolean
          directory_indexable: boolean
          notes: string | null
          price_index_public: boolean
          state: Database["public"]["Enums"]["v2_city_state"]
          target_active_workshops: number
          updated_at: string
        }
        Insert: {
          auto_approve_requests?: boolean
          city_name: string
          city_slug: string
          cluster_slug?: string | null
          created_at?: string
          demand_open?: boolean
          directory_indexable?: boolean
          notes?: string | null
          price_index_public?: boolean
          state?: Database["public"]["Enums"]["v2_city_state"]
          target_active_workshops?: number
          updated_at?: string
        }
        Update: {
          auto_approve_requests?: boolean
          city_name?: string
          city_slug?: string
          cluster_slug?: string | null
          created_at?: string
          demand_open?: boolean
          directory_indexable?: boolean
          notes?: string | null
          price_index_public?: boolean
          state?: Database["public"]["Enums"]["v2_city_state"]
          target_active_workshops?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_city_configs_cluster_slug_fkey"
            columns: ["cluster_slug"]
            isOneToOne: false
            referencedRelation: "v2_city_clusters"
            referencedColumns: ["cluster_slug"]
          },
        ]
      }
      v2_content_pages: {
        Row: {
          author_name: string | null
          body_markdown: string | null
          created_at: string
          data_modules: Json
          description: string | null
          host: string
          id: string
          indexability: string
          page_type: string
          path: string
          published_at: string | null
          reviewed_at: string | null
          reviewer_name: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body_markdown?: string | null
          created_at?: string
          data_modules?: Json
          description?: string | null
          host?: string
          id?: string
          indexability?: string
          page_type: string
          path: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewer_name?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body_markdown?: string | null
          created_at?: string
          data_modules?: Json
          description?: string | null
          host?: string
          id?: string
          indexability?: string
          page_type?: string
          path?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewer_name?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      v2_entitlement_overrides: {
        Row: {
          created_at: string
          entitlement_key: string
          expires_at: string | null
          granted_by: string | null
          id: string
          reason: string
          value: Json
          workshop_id: string
        }
        Insert: {
          created_at?: string
          entitlement_key: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason: string
          value?: Json
          workshop_id: string
        }
        Update: {
          created_at?: string
          entitlement_key?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string
          value?: Json
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_entitlement_overrides_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          city_slug: string | null
          consent_scope: string
          event_name: string
          host: string
          id: number
          occurred_at: string
          payload: Json
          request_id: string | null
          response_id: string | null
          session_id: string | null
          workshop_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          city_slug?: string | null
          consent_scope?: string
          event_name: string
          host?: string
          id?: number
          occurred_at?: string
          payload?: Json
          request_id?: string | null
          response_id?: string | null
          session_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          city_slug?: string | null
          consent_scope?: string
          event_name?: string
          host?: string
          id?: number
          occurred_at?: string
          payload?: Json
          request_id?: string | null
          response_id?: string | null
          session_id?: string | null
          workshop_id?: string | null
        }
        Relationships: []
      }
      v2_feature_flags: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          key: string
          rollout: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          key: string
          rollout?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          key?: string
          rollout?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      v2_ghosted_lead_claims: {
        Row: {
          admin_note: string | null
          created_at: string
          customer_unreachable_since: string | null
          evidence_note: string | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          response_id: string
          status: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          customer_unreachable_since?: string | null
          evidence_note?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          response_id: string
          status?: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          customer_unreachable_since?: string | null
          evidence_note?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          response_id?: string
          status?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_ghosted_lead_claims_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "workshop_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_ghosted_lead_claims_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_guide_prices: {
        Row: {
          bike_type: string | null
          city_slug: string | null
          created_at: string
          id: string
          label: string
          price_max_sek: number
          price_min_sek: number
          repair_category: string
          source_note: string | null
          typical_sek: number | null
          updated_at: string
        }
        Insert: {
          bike_type?: string | null
          city_slug?: string | null
          created_at?: string
          id?: string
          label?: string
          price_max_sek: number
          price_min_sek: number
          repair_category: string
          source_note?: string | null
          typical_sek?: number | null
          updated_at?: string
        }
        Update: {
          bike_type?: string | null
          city_slug?: string | null
          created_at?: string
          id?: string
          label?: string
          price_max_sek?: number
          price_min_sek?: number
          repair_category?: string
          source_note?: string | null
          typical_sek?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      v2_job_outcomes: {
        Row: {
          completion_evidence: Json
          created_at: string
          customer_confirmed_at: string | null
          customer_invited_at: string | null
          final_price_sek: number | null
          id: string
          invite_count: number
          request_id: string
          response_id: string
          state: Database["public"]["Enums"]["v2_outcome_state"]
          updated_at: string
          workshop_id: string
          workshop_reported_at: string | null
        }
        Insert: {
          completion_evidence?: Json
          created_at?: string
          customer_confirmed_at?: string | null
          customer_invited_at?: string | null
          final_price_sek?: number | null
          id?: string
          invite_count?: number
          request_id: string
          response_id: string
          state?: Database["public"]["Enums"]["v2_outcome_state"]
          updated_at?: string
          workshop_id: string
          workshop_reported_at?: string | null
        }
        Update: {
          completion_evidence?: Json
          created_at?: string
          customer_confirmed_at?: string | null
          customer_invited_at?: string | null
          final_price_sek?: number | null
          id?: string
          invite_count?: number
          request_id?: string
          response_id?: string
          state?: Database["public"]["Enums"]["v2_outcome_state"]
          updated_at?: string
          workshop_id?: string
          workshop_reported_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_job_outcomes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_job_outcomes_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "workshop_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_job_outcomes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_lifecycle_messages: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          meta: Json
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          contact_id: string
          created_at?: string
          dedupe_key: string
          id?: string
          kind: string
          meta?: Json
          scheduled_for: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          meta?: Json
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_lifecycle_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "v2_retention_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_nudge_log: {
        Row: {
          channel: string
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          meta: Json
          request_id: string | null
          response_id: string | null
          sent_count: number
          workshop_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          dedupe_key: string
          id?: string
          kind: string
          meta?: Json
          request_id?: string | null
          response_id?: string | null
          sent_count?: number
          workshop_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          meta?: Json
          request_id?: string | null
          response_id?: string | null
          sent_count?: number
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_nudge_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_nudge_log_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "workshop_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_nudge_log_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_plans: {
        Row: {
          active: boolean
          code: string
          created_at: string
          currency: string
          entitlements: Json
          name: string
          price_ore_monthly: number
          stripe_price_id: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          currency?: string
          entitlements?: Json
          name: string
          price_ore_monthly?: number
          stripe_price_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          currency?: string
          entitlements?: Json
          name?: string
          price_ore_monthly?: number
          stripe_price_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      v2_price_index_stats: {
        Row: {
          city_slug: string
          computed_at: string
          confidence: Database["public"]["Enums"]["v2_price_confidence"]
          id: string
          max_sek: number | null
          median_sek: number | null
          min_sek: number | null
          outliers_removed: number
          p25_sek: number | null
          p75_sek: number | null
          repair_category: string
          sample_count: number
          source: string
          window_end: string
          window_start: string
        }
        Insert: {
          city_slug: string
          computed_at?: string
          confidence?: Database["public"]["Enums"]["v2_price_confidence"]
          id?: string
          max_sek?: number | null
          median_sek?: number | null
          min_sek?: number | null
          outliers_removed?: number
          p25_sek?: number | null
          p75_sek?: number | null
          repair_category: string
          sample_count?: number
          source?: string
          window_end: string
          window_start: string
        }
        Update: {
          city_slug?: string
          computed_at?: string
          confidence?: Database["public"]["Enums"]["v2_price_confidence"]
          id?: string
          max_sek?: number | null
          median_sek?: number | null
          min_sek?: number | null
          outliers_removed?: number
          p25_sek?: number | null
          p75_sek?: number | null
          repair_category?: string
          sample_count?: number
          source?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      v2_pricing_config: {
        Row: {
          active: boolean
          amount_ore: number
          commission_bps: number
          created_at: string
          credit_pack_max: number
          credit_pack_min: number
          credit_unit_ore: number
          currency: string
          effective_from: string
          free_wins_on_signup: number
          key: string
          notes: string | null
          vat_rate: number
        }
        Insert: {
          active?: boolean
          amount_ore: number
          commission_bps?: number
          created_at?: string
          credit_pack_max?: number
          credit_pack_min?: number
          credit_unit_ore?: number
          currency?: string
          effective_from?: string
          free_wins_on_signup?: number
          key: string
          notes?: string | null
          vat_rate?: number
        }
        Update: {
          active?: boolean
          amount_ore?: number
          commission_bps?: number
          created_at?: string
          credit_pack_max?: number
          credit_pack_min?: number
          credit_unit_ore?: number
          currency?: string
          effective_from?: string
          free_wins_on_signup?: number
          key?: string
          notes?: string | null
          vat_rate?: number
        }
        Relationships: []
      }
      v2_pricing_experiments: {
        Row: {
          active: boolean
          created_at: string
          ended_at: string | null
          key: string
          started_at: string | null
          updated_at: string
          variants: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          ended_at?: string | null
          key: string
          started_at?: string | null
          updated_at?: string
          variants: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          ended_at?: string | null
          key?: string
          started_at?: string | null
          updated_at?: string
          variants?: Json
        }
        Relationships: []
      }
      v2_rescue_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          meta: Json
          reason: string | null
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_rescue_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_repair_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_retention_contacts: {
        Row: {
          consent_at: string
          consent_basis: string
          created_at: string
          id: string
          last_contacted_at: string | null
          lifecycle_stage: string
          subject_key: string
          subject_type: string
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          workshop_id: string | null
        }
        Insert: {
          consent_at?: string
          consent_basis: string
          created_at?: string
          id?: string
          last_contacted_at?: string | null
          lifecycle_stage?: string
          subject_key: string
          subject_type: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          workshop_id?: string | null
        }
        Update: {
          consent_at?: string
          consent_basis?: string
          created_at?: string
          id?: string
          last_contacted_at?: string | null
          lifecycle_stage?: string
          subject_key?: string
          subject_type?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_retention_contacts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_reviews: {
        Row: {
          author_token_hash: string
          body: string | null
          created_at: string
          customer_email_hash: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          outcome_id: string
          rating: number
          request_id: string
          state: Database["public"]["Enums"]["v2_review_state"]
          updated_at: string
          workshop_id: string
          workshop_responded_at: string | null
          workshop_response: string | null
        }
        Insert: {
          author_token_hash: string
          body?: string | null
          created_at?: string
          customer_email_hash: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          outcome_id: string
          rating: number
          request_id: string
          state?: Database["public"]["Enums"]["v2_review_state"]
          updated_at?: string
          workshop_id: string
          workshop_responded_at?: string | null
          workshop_response?: string | null
        }
        Update: {
          author_token_hash?: string
          body?: string | null
          created_at?: string
          customer_email_hash?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          outcome_id?: string
          rating?: number
          request_id?: string
          state?: Database["public"]["Enums"]["v2_review_state"]
          updated_at?: string
          workshop_id?: string
          workshop_responded_at?: string | null
          workshop_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_reviews_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "v2_job_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "bike_repair_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_reviews_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_supply_snapshots: {
        Row: {
          active_workshops: number
          approved_workshops: number
          captured_on: string
          city_slug: string
          created_at: string
          fill_rate: number | null
          id: string
          median_hours_to_first_quote: number | null
          quotes_30d: number
          requests_30d: number
        }
        Insert: {
          active_workshops?: number
          approved_workshops?: number
          captured_on: string
          city_slug: string
          created_at?: string
          fill_rate?: number | null
          id?: string
          median_hours_to_first_quote?: number | null
          quotes_30d?: number
          requests_30d?: number
        }
        Update: {
          active_workshops?: number
          approved_workshops?: number
          captured_on?: string
          city_slug?: string
          created_at?: string
          fill_rate?: number | null
          id?: string
          median_hours_to_first_quote?: number | null
          quotes_30d?: number
          requests_30d?: number
        }
        Relationships: []
      }
      v2_workshop_onboarding: {
        Row: {
          created_at: string
          last_nudge_at: string | null
          notes: string | null
          state: string
          state_changed_at: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          last_nudge_at?: string | null
          notes?: string | null
          state?: string
          state_changed_at?: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          last_nudge_at?: string | null
          notes?: string | null
          state?: string
          state_changed_at?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_workshop_onboarding_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_workshop_review_stats: {
        Row: {
          avg_rating: number | null
          last_published_at: string | null
          published_count: number
          recent_avg_90d: number | null
          updated_at: string
          workshop_id: string
        }
        Insert: {
          avg_rating?: number | null
          last_published_at?: string | null
          published_count?: number
          recent_avg_90d?: number | null
          updated_at?: string
          workshop_id: string
        }
        Update: {
          avg_rating?: number | null
          last_published_at?: string | null
          published_count?: number
          recent_avg_90d?: number | null
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_workshop_review_stats_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_workshop_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          granted_by_admin: boolean
          id: string
          override_reason: string | null
          plan_code: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          workshop_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          granted_by_admin?: boolean
          id?: string
          override_reason?: string | null
          plan_code: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workshop_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          granted_by_admin?: boolean
          id?: string
          override_reason?: string | null
          plan_code?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_workshop_subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "v2_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "v2_workshop_subscriptions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      // __V2GEN_TABLES_END__
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
      // __V2GEN_VIEWS_START__ (generated by scripts/generate-v2-types.mjs — do not edit by hand)
      v2_public_workshop_directory: {
        Row: {
          areas_served: string[] | null
          avg_rating: number | null
          bio_short: string | null
          city: string | null
          city_slug: string | null
          cluster_slug: string | null
          company_name: string | null
          created_year: number | null
          last_review_at: string | null
          logo_url: string | null
          published_review_count: number | null
          services: string[] | null
          slug: string | null
          website: string | null
          workshop_id: string | null
        }
        Insert: {
          areas_served?: string[] | null
          avg_rating?: number | null
          bio_short?: string | null
          city?: string | null
          city_slug?: string | null
          cluster_slug?: string | null
          company_name?: string | null
          created_year?: number | null
          last_review_at?: string | null
          logo_url?: string | null
          published_review_count?: number | null
          services?: string[] | null
          slug?: string | null
          website?: string | null
          workshop_id?: string | null
        }
        Update: {
          areas_served?: string[] | null
          avg_rating?: number | null
          bio_short?: string | null
          city?: string | null
          city_slug?: string | null
          cluster_slug?: string | null
          company_name?: string | null
          created_year?: number | null
          last_review_at?: string | null
          logo_url?: string | null
          published_review_count?: number | null
          services?: string[] | null
          slug?: string | null
          website?: string | null
          workshop_id?: string | null
        }
        Relationships: []
      }
      // __V2GEN_VIEWS_END__
    }
    Functions: {
      choose_bike_winner: {
        Args: { p_request_id: string; p_response_id: string }
        Returns: {
          already_chosen: boolean
          winner_workshop_id: string
        }[]
      }
      consume_free_lead_for_response: {
        Args: { p_response_id: string; p_workshop_id: string }
        Returns: {
          already_processed: boolean
          remaining_free_leads: number
          request_id: string
        }[]
      }
      get_cykel_open_requests_teaser: {
        Args: never
        Returns: {
          area: string
          bike_type: string
          city: string
          created_at: string
          repair_category: string
          urgency: string
        }[]
      }
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
      grant_lead_credits: {
        Args: { p_quantity: number; p_workshop_id: string }
        Returns: number
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved_workshop: { Args: { _user_id: string }; Returns: boolean }
      log_terms_acceptance: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_ip_address?: unknown
          p_terms_type: string
          p_terms_version: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      reserve_outreach_send_slot: {
        Args: { _activity_id: string; _cap: number; _sender: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          channel: string
          created_at: string
          direction: string
          error: string | null
          id: string
          idempotency_key: string | null
          kind: string
          message: string
          performed_by: string | null
          prospect_id: string
          provider: string | null
          provider_message_id: string | null
          recipient: string
          retry_count: number
          send_lock_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "outreach_activities"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      settle_winner_free_lead: {
        Args: { p_response_id: string; p_workshop_id: string }
        Returns: {
          already_processed: boolean
          remaining_free_leads: number
        }[]
      }
      submit_bike_repair_request:
        | {
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
        | {
            Args: {
              p_area: string
              p_bike_type: string
              p_can_drop_off: boolean
              p_city: string
              p_customer_email: string
              p_customer_language?: string
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
      // __V2GEN_FUNCTIONS_START__ (generated by scripts/generate-v2-types.mjs — do not edit by hand)
      v2_emit_client_event: {
        Args: {
          p_consent_scope?: string
          p_event_name: string
          p_payload?: Json
          p_session_id?: string
        }
        Returns: Json
      }
      v2_get_price_index: {
        Args: {
          p_category?: string
          p_city_slug: string
        }
        Returns: Json
      }
      v2_refresh_workshop_review_stats: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      // __V2GEN_FUNCTIONS_END__
    }
    Enums: {
      // __V2GEN_ENUMS_START__ (generated by scripts/generate-v2-types.mjs — do not edit by hand)
      v2_city_state: "RESEARCH" | "SUPPLY_BUILDING" | "LIMITED" | "ACTIVE" | "PAUSED"
      v2_outcome_state: "pending" | "reported_by_workshop" | "confirmed_by_customer" | "completed" | "no_show" | "cancelled" | "disputed" | "expired"
      v2_price_confidence: "insufficient" | "low" | "medium" | "high"
      v2_review_state: "submitted" | "verified" | "published" | "flagged" | "rejected" | "removed"
      // __V2GEN_ENUMS_END__
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
    Enums: {
      // __V2GEN_CONSTANTS_START__ (generated by scripts/generate-v2-types.mjs — do not edit by hand)
      v2_city_state: ["RESEARCH", "SUPPLY_BUILDING", "LIMITED", "ACTIVE", "PAUSED"],
      v2_outcome_state: ["pending", "reported_by_workshop", "confirmed_by_customer", "completed", "no_show", "cancelled", "disputed", "expired"],
      v2_price_confidence: ["insufficient", "low", "medium", "high"],
      v2_review_state: ["submitted", "verified", "published", "flagged", "rejected", "removed"],
      // __V2GEN_CONSTANTS_END__
    },
  },
} as const
