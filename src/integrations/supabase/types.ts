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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          actor_user_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string | null
          service_provider_id: string | null
        }
        Insert: {
          action: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id?: string | null
          service_provider_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: Database["public"]["Enums"]["actor_type"]
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string | null
          service_provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_bundles: {
        Row: {
          billing_type: Database["public"]["Enums"]["billing_type"]
          created_at: string
          currency: string
          description: string | null
          hours: number
          id: string
          is_active: boolean
          monthly_consumption_cap_minutes: number | null
          monthly_hours: number | null
          name: string
          price_cents: number
          priority_level: string | null
          recommended_monthly_minutes: number | null
          recurring_interval: string | null
          service_provider_id: string
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          billing_type?: Database["public"]["Enums"]["billing_type"]
          created_at?: string
          currency?: string
          description?: string | null
          hours: number
          id?: string
          is_active?: boolean
          monthly_consumption_cap_minutes?: number | null
          monthly_hours?: number | null
          name: string
          price_cents: number
          priority_level?: string | null
          recommended_monthly_minutes?: number | null
          recurring_interval?: string | null
          service_provider_id: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_type?: Database["public"]["Enums"]["billing_type"]
          created_at?: string
          currency?: string
          description?: string | null
          hours?: number
          id?: string
          is_active?: boolean
          monthly_consumption_cap_minutes?: number | null
          monthly_hours?: number | null
          name?: string
          price_cents?: number
          priority_level?: string | null
          recommended_monthly_minutes?: number | null
          recurring_interval?: string | null
          service_provider_id?: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_bundles_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger_entries: {
        Row: {
          actor_type: Database["public"]["Enums"]["actor_type"]
          actor_user_id: string | null
          created_at: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          minutes_delta: number
          notes: string | null
          organization_id: string
          reason_code: Database["public"]["Enums"]["ledger_reason_code"]
          related_credit_lot_id: string | null
          related_order_id: string | null
          related_work_log_id: string | null
          service_provider_id: string
        }
        Insert: {
          actor_type?: Database["public"]["Enums"]["actor_type"]
          actor_user_id?: string | null
          created_at?: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          minutes_delta: number
          notes?: string | null
          organization_id: string
          reason_code: Database["public"]["Enums"]["ledger_reason_code"]
          related_credit_lot_id?: string | null
          related_order_id?: string | null
          related_work_log_id?: string | null
          service_provider_id: string
        }
        Update: {
          actor_type?: Database["public"]["Enums"]["actor_type"]
          actor_user_id?: string | null
          created_at?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          minutes_delta?: number
          notes?: string | null
          organization_id?: string
          reason_code?: Database["public"]["Enums"]["ledger_reason_code"]
          related_credit_lot_id?: string | null
          related_order_id?: string | null
          related_work_log_id?: string | null
          service_provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_entries_related_credit_lot_id_fkey"
            columns: ["related_credit_lot_id"]
            isOneToOne: false
            referencedRelation: "credit_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_entries_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_entries_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_related_work_log"
            columns: ["related_work_log_id"]
            isOneToOne: false
            referencedRelation: "work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_lots: {
        Row: {
          billing_period_start: string | null
          created_at: string
          expires_at: string
          id: string
          minutes_purchased: number
          minutes_remaining: number
          order_id: string | null
          organization_id: string
          purchased_at: string
          service_provider_id: string
          status: Database["public"]["Enums"]["credit_lot_status"]
          subscription_id: string | null
        }
        Insert: {
          billing_period_start?: string | null
          created_at?: string
          expires_at: string
          id?: string
          minutes_purchased: number
          minutes_remaining: number
          order_id?: string | null
          organization_id: string
          purchased_at?: string
          service_provider_id: string
          status?: Database["public"]["Enums"]["credit_lot_status"]
          subscription_id?: string | null
        }
        Update: {
          billing_period_start?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          minutes_purchased?: number
          minutes_remaining?: number
          order_id?: string | null
          organization_id?: string
          purchased_at?: string
          service_provider_id?: string
          status?: Database["public"]["Enums"]["credit_lot_status"]
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_lots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_lots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_lots_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_lots_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_call_requests: {
        Row: {
          company_name: string
          created_at: string
          current_usage: string
          discussion_topics: string
          email: string
          full_name: string
          id: string
          interests: string[] | null
          internal_notes: string | null
          organization_id: string | null
          project_stage: string
          scheduled_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          current_usage: string
          discussion_topics: string
          email: string
          full_name: string
          id?: string
          interests?: string[] | null
          internal_notes?: string | null
          organization_id?: string | null
          project_stage: string
          scheduled_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          current_usage?: string
          discussion_topics?: string
          email?: string
          full_name?: string
          id?: string
          interests?: string[] | null
          internal_notes?: string | null
          organization_id?: string | null
          project_stage?: string
          scheduled_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intro_call_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
          token: string
          token_hash: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          token: string
          token_hash?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          token?: string
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          currency: string
          id: string
          issued_at: string | null
          order_id: string | null
          organization_id: string
          paid_at: string | null
          service_provider_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_invoice_id: string | null
          stripe_receipt_url: string | null
          total_cents: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          issued_at?: string | null
          order_id?: string | null
          organization_id: string
          paid_at?: string | null
          service_provider_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_invoice_id?: string | null
          stripe_receipt_url?: string | null
          total_cents: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          issued_at?: string | null
          order_id?: string | null
          organization_id?: string
          paid_at?: string | null
          service_provider_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_invoice_id?: string | null
          stripe_receipt_url?: string | null
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_consumptions: {
        Row: {
          adjustment_ledger_entry_id: string | null
          created_at: string
          credit_lot_id: string
          id: string
          minutes_consumed: number
          work_log_id: string | null
        }
        Insert: {
          adjustment_ledger_entry_id?: string | null
          created_at?: string
          credit_lot_id: string
          id?: string
          minutes_consumed: number
          work_log_id?: string | null
        }
        Update: {
          adjustment_ledger_entry_id?: string | null
          created_at?: string
          credit_lot_id?: string
          id?: string
          minutes_consumed?: number
          work_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_consumptions_adjustment_ledger_entry_id_fkey"
            columns: ["adjustment_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "credit_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_consumptions_credit_lot_id_fkey"
            columns: ["credit_lot_id"]
            isOneToOne: false
            referencedRelation: "credit_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_consumptions_work_log_id_fkey"
            columns: ["work_log_id"]
            isOneToOne: false
            referencedRelation: "work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          newsletter_enabled: boolean
          notify_intro_call: boolean
          notify_org_invitation: boolean
          notify_purchase: boolean
          notify_subscription: boolean
          notify_work_logged: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          newsletter_enabled?: boolean
          notify_intro_call?: boolean
          notify_org_invitation?: boolean
          notify_purchase?: boolean
          notify_subscription?: boolean
          notify_work_logged?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          newsletter_enabled?: boolean
          notify_intro_call?: boolean
          notify_org_invitation?: boolean
          notify_purchase?: boolean
          notify_subscription?: boolean
          notify_work_logged?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          message: string
          payload: Json | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          message: string
          payload?: Json | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          message?: string
          payload?: Json | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          credit_bundle_id: string
          currency: string
          id: string
          organization_id: string
          paid_at: string | null
          service_provider_id: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          credit_bundle_id: string
          currency?: string
          id?: string
          organization_id: string
          paid_at?: string | null
          service_provider_id: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          credit_bundle_id?: string
          currency?: string
          id?: string
          organization_id?: string
          paid_at?: string | null
          service_provider_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_credit_bundle_id_fkey"
            columns: ["credit_bundle_id"]
            isOneToOne: false
            referencedRelation: "credit_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_credit_bundle_id_fkey"
            columns: ["credit_bundle_id"]
            isOneToOne: false
            referencedRelation: "credit_bundles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_customers: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          service_provider_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          service_provider_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          service_provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_customers_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["provider_role"]
          service_provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["provider_role"]
          service_provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["provider_role"]
          service_provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_members_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          accepting_new_purchases: boolean
          availability_status: string | null
          capacity_threshold_percent: number | null
          created_at: string
          enforce_capacity_gating: boolean
          enforce_consumption_caps: boolean
          estimated_lead_time_days: number | null
          id: string
          logo_url: string | null
          name: string
          purchase_pause_message: string | null
          slug: string
          total_available_minutes_per_month: number | null
          updated_at: string
        }
        Insert: {
          accepting_new_purchases?: boolean
          availability_status?: string | null
          capacity_threshold_percent?: number | null
          created_at?: string
          enforce_capacity_gating?: boolean
          enforce_consumption_caps?: boolean
          estimated_lead_time_days?: number | null
          id?: string
          logo_url?: string | null
          name: string
          purchase_pause_message?: string | null
          slug: string
          total_available_minutes_per_month?: number | null
          updated_at?: string
        }
        Update: {
          accepting_new_purchases?: boolean
          availability_status?: string | null
          capacity_threshold_percent?: number | null
          created_at?: string
          enforce_capacity_gating?: boolean
          enforce_consumption_caps?: boolean
          estimated_lead_time_days?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          purchase_pause_message?: string | null
          slug?: string
          total_available_minutes_per_month?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          credit_bundle_id: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          service_provider_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          credit_bundle_id: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          service_provider_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          credit_bundle_id?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          service_provider_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_credit_bundle_id_fkey"
            columns: ["credit_bundle_id"]
            isOneToOne: false
            referencedRelation: "credit_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_credit_bundle_id_fkey"
            columns: ["credit_bundle_id"]
            isOneToOne: false
            referencedRelation: "credit_bundles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      unsubscribe_tokens: {
        Row: {
          created_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      work_logs: {
        Row: {
          category: Database["public"]["Enums"]["work_category"]
          created_at: string
          created_by: string
          description: string
          id: string
          is_billable: boolean
          minutes_spent: number
          organization_id: string
          performed_at: string
          performed_by: string
          service_provider_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["work_category"]
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_billable?: boolean
          minutes_spent: number
          organization_id: string
          performed_at: string
          performed_by: string
          service_provider_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["work_category"]
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_billable?: boolean
          minutes_spent?: number
          organization_id?: string
          performed_at?: string
          performed_by?: string
          service_provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      credit_bundles_public: {
        Row: {
          billing_type: Database["public"]["Enums"]["billing_type"] | null
          currency: string | null
          description: string | null
          hours: number | null
          id: string | null
          monthly_hours: number | null
          name: string | null
          price_cents: number | null
          priority_level: string | null
          recurring_interval: string | null
        }
        Insert: {
          billing_type?: Database["public"]["Enums"]["billing_type"] | null
          currency?: string | null
          description?: string | null
          hours?: number | null
          id?: string | null
          monthly_hours?: number | null
          name?: string | null
          price_cents?: number | null
          priority_level?: string | null
          recurring_interval?: string | null
        }
        Update: {
          billing_type?: Database["public"]["Enums"]["billing_type"] | null
          currency?: string | null
          description?: string | null
          hours?: number | null
          id?: string | null
          monthly_hours?: number | null
          name?: string | null
          price_cents?: number | null
          priority_level?: string | null
          recurring_interval?: string | null
        }
        Relationships: []
      }
      invitations_secure: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          invited_by: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["org_role"] | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: never
          expires_at?: string | null
          id?: string | null
          invited_by?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["org_role"] | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: never
          expires_at?: string | null
          id?: string | null
          invited_by?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["org_role"] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      create_credit_adjustment: {
        Args: {
          p_adjustment_type: string
          p_minutes: number
          p_notes: string
          p_org_id: string
          p_provider_id: string
          p_reason_code: string
        }
        Returns: string
      }
      create_work_log_and_allocate: {
        Args: {
          p_category: Database["public"]["Enums"]["work_category"]
          p_description: string
          p_minutes: number
          p_org_id: string
          p_performed_at: string
          p_provider_id: string
        }
        Returns: string
      }
      get_admin_audit_events: {
        Args: { p_entity_type?: string; p_limit?: number; p_offset?: number }
        Returns: {
          action: string
          actor_email: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          after_json: Json
          before_json: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          organization_name: string
        }[]
      }
      get_admin_invitations: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_email: string
          organization_id: string
          organization_name: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
        }[]
      }
      get_admin_orders: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          amount_cents: number
          bundle_name: string
          created_at: string
          currency: string
          id: string
          organization_id: string
          organization_name: string
          paid_at: string
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      get_admin_organizations: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          available_credits: number
          created_at: string
          id: string
          logo_url: string
          member_count: number
          name: string
          slug: string
          total_credits_purchased: number
        }[]
      }
      get_admin_overview_stats: {
        Args: never
        Returns: {
          active_subscriptions: number
          pending_invitations: number
          total_orders: number
          total_organizations: number
          total_revenue_cents: number
          total_users: number
        }[]
      }
      get_admin_users: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          organization_count: number
          user_id: string
        }[]
      }
      get_credit_balance: {
        Args: { p_org_id: string }
        Returns: {
          available_minutes: number
          expiring_soon_minutes: number
          service_provider_id: string
          total_minutes: number
          used_minutes: number
        }[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          organization_id: string
          organization_name: string
          organization_slug: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
        }[]
      }
      get_org_audit_events: {
        Args: {
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
          p_org_id: string
        }
        Returns: {
          action: string
          actor_display_name: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          entity_type: string
          id: string
          summary: string
        }[]
      }
      get_provider_capacity_metrics: {
        Args: { p_provider_id: string }
        Returns: {
          projected_monthly_load: number
          recent_monthly_consumption: number
          sold_unused_minutes: number
          total_capacity: number
          utilization_percent: number
        }[]
      }
      get_user_provider_id: { Args: never; Returns: string }
      hash_invitation_token: { Args: { p_token: string }; Returns: string }
      ignore_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_provider_admin: { Args: { p_provider_id: string }; Returns: boolean }
      is_provider_customer: { Args: { p_org_id: string }; Returns: boolean }
      is_provider_member: { Args: { p_provider_id: string }; Returns: boolean }
      process_expired_credit_lots: {
        Args: never
        Returns: {
          lots_expired: number
          total_minutes_expired: number
        }[]
      }
    }
    Enums: {
      actor_type: "user" | "system"
      billing_type: "one_time" | "recurring"
      credit_lot_status: "active" | "exhausted" | "expired"
      invoice_status: "draft" | "issued" | "paid" | "void"
      ledger_entry_type: "credit" | "debit"
      ledger_reason_code:
        | "purchase"
        | "usage"
        | "adjustment"
        | "expiry"
        | "refund"
        | "subscription_credit"
      notification_type:
        | "org_invitation"
        | "provider_invitation"
        | "work_logged"
        | "purchase_completed"
        | "subscription_renewed"
        | "intro_call_submitted"
      order_status: "pending" | "paid" | "cancelled" | "refunded"
      org_role: "owner" | "admin" | "member"
      provider_role: "owner" | "admin" | "member"
      work_category:
        | "development"
        | "consulting"
        | "training"
        | "support"
        | "other"
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
      actor_type: ["user", "system"],
      billing_type: ["one_time", "recurring"],
      credit_lot_status: ["active", "exhausted", "expired"],
      invoice_status: ["draft", "issued", "paid", "void"],
      ledger_entry_type: ["credit", "debit"],
      ledger_reason_code: [
        "purchase",
        "usage",
        "adjustment",
        "expiry",
        "refund",
        "subscription_credit",
      ],
      notification_type: [
        "org_invitation",
        "provider_invitation",
        "work_logged",
        "purchase_completed",
        "subscription_renewed",
        "intro_call_submitted",
      ],
      order_status: ["pending", "paid", "cancelled", "refunded"],
      org_role: ["owner", "admin", "member"],
      provider_role: ["owner", "admin", "member"],
      work_category: [
        "development",
        "consulting",
        "training",
        "support",
        "other",
      ],
    },
  },
} as const
