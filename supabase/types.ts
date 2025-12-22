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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          reservation_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reservation_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      blackout_dates: {
        Row: {
          campsite_id: string | null
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          campsite_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          campsite_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blackout_dates_campsite_id_fkey"
            columns: ["campsite_id"]
            isOneToOne: false
            referencedRelation: "campsites"
            referencedColumns: ["id"]
          },
        ]
      }
      campsites: {
        Row: {
          base_rate: number
          code: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          max_guests: number
          name: string
          notes: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          base_rate: number
          code: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_guests: number
          name: string
          notes?: string | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          base_rate?: number
          code?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_guests?: number
          name?: string
          notes?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_policies: {
        Row: {
          campsite_id: string | null
          created_at: string
          deposit_type: string | null
          deposit_value: number | null
          due_days_before_checkin: number | null
          end_month: number | null
          id: string
          name: string
          policy_type: string
          site_type: string | null
          start_month: number | null
        }
        Insert: {
          campsite_id?: string | null
          created_at?: string
          deposit_type?: string | null
          deposit_value?: number | null
          due_days_before_checkin?: number | null
          end_month?: number | null
          id?: string
          name: string
          policy_type: string
          site_type?: string | null
          start_month?: number | null
        }
        Update: {
          campsite_id?: string | null
          created_at?: string
          deposit_type?: string | null
          deposit_value?: number | null
          due_days_before_checkin?: number | null
          end_month?: number | null
          id?: string
          name?: string
          policy_type?: string
          site_type?: string | null
          start_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_policies_campsite_id_fkey"
            columns: ["campsite_id"]
            isOneToOne: false
            referencedRelation: "campsites"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          reservation_id: string
          status: string
          stripe_payment_intent_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          reservation_id: string
          status: string
          stripe_payment_intent_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          reservation_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number | null
          expires_at: number
          key: string
        }
        Insert: {
          count?: number | null
          expires_at: number
          key: string
        }
        Update: {
          count?: number | null
          expires_at?: number
          key?: string
        }
        Relationships: []
      }
      reservation_addons: {
        Row: {
          addon_id: string | null
          created_at: string
          id: string
          price_at_booking: number
          quantity: number
          reservation_id: string | null
        }
        Insert: {
          addon_id?: string | null
          created_at?: string
          id?: string
          price_at_booking: number
          quantity?: number
          reservation_id?: string | null
        }
        Update: {
          addon_id?: string | null
          created_at?: string
          id?: string
          price_at_booking?: number
          quantity?: number
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_addons_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          address1: string
          address2: string | null
          adults: number
          amount_paid: number
          archived_at: string | null
          archived_by: string | null
          balance_due: number | null
          camping_unit: string
          campsite_id: string | null
          check_in: string
          check_out: string
          children: number
          city: string
          comments: string | null
          contact_method: string
          created_at: string
          email: string
          first_name: string
          hear_about: string | null
          id: string
          last_name: string
          payment_policy_snapshot: Json | null
          payment_status: string | null
          phone: string
          postal_code: string
          public_edit_token_expires_at: string | null
          public_edit_token_hash: string | null
          remainder_due_at: string | null
          rv_length: string
          rv_year: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          address1: string
          address2?: string | null
          adults?: number
          amount_paid?: number
          archived_at?: string | null
          archived_by?: string | null
          balance_due?: number | null
          camping_unit: string
          campsite_id?: string | null
          check_in: string
          check_out: string
          children?: number
          city: string
          comments?: string | null
          contact_method: string
          created_at?: string
          email: string
          first_name: string
          hear_about?: string | null
          id?: string
          last_name: string
          payment_policy_snapshot?: Json | null
          payment_status?: string | null
          phone: string
          postal_code: string
          public_edit_token_expires_at?: string | null
          public_edit_token_hash?: string | null
          remainder_due_at?: string | null
          rv_length: string
          rv_year?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          address1?: string
          address2?: string | null
          adults?: number
          amount_paid?: number
          archived_at?: string | null
          archived_by?: string | null
          balance_due?: number | null
          camping_unit?: string
          campsite_id?: string | null
          check_in?: string
          check_out?: string
          children?: number
          city?: string
          comments?: string | null
          contact_method?: string
          created_at?: string
          email?: string
          first_name?: string
          hear_about?: string | null
          id?: string
          last_name?: string
          payment_policy_snapshot?: Json | null
          payment_status?: string | null
          phone?: string
          postal_code?: string
          public_edit_token_expires_at?: string | null
          public_edit_token_hash?: string | null
          remainder_due_at?: string | null
          rv_length?: string
          rv_year?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_campsite_id_fkey"
            columns: ["campsite_id"]
            isOneToOne: false
            referencedRelation: "campsites"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          id: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      reservation_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "checked_in"
        | "checked_out"
        | "no_show"
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
      reservation_status: [
        "pending",
        "confirmed",
        "cancelled",
        "checked_in",
        "checked_out",
        "no_show",
      ],
    },
  },
} as const
