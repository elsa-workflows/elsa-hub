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
          created_at: string
          currency: string
          description: string | null
          hours: number
          id: string
          is_active: boolean
          name: string
          price_cents: number
          service_provider_id: string
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          hours: number
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          service_provider_id: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          hours?: number
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
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
        }
        Insert: {
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
        }
        Update: {
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
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
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
      get_user_provider_id: { Args: never; Returns: string }
      hash_invitation_token: { Args: { p_token: string }; Returns: string }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
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
      credit_lot_status: "active" | "exhausted" | "expired"
      invoice_status: "draft" | "issued" | "paid" | "void"
      ledger_entry_type: "credit" | "debit"
      ledger_reason_code:
        | "purchase"
        | "usage"
        | "adjustment"
        | "expiry"
        | "refund"
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
      credit_lot_status: ["active", "exhausted", "expired"],
      invoice_status: ["draft", "issued", "paid", "void"],
      ledger_entry_type: ["credit", "debit"],
      ledger_reason_code: [
        "purchase",
        "usage",
        "adjustment",
        "expiry",
        "refund",
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
