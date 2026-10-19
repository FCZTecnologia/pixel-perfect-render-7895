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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      consumption: {
        Row: {
          attachment_path: string | null
          created_at: string
          energy_curr: number
          energy_prev: number
          hvac_curr: number
          hvac_prev: number
          id: string
          reference_month: string
          total_amount: number
          unit_id: string
          water_curr: number
          water_prev: number
        }
        Insert: {
          attachment_path?: string | null
          created_at?: string
          energy_curr?: number
          energy_prev?: number
          hvac_curr?: number
          hvac_prev?: number
          id?: string
          reference_month: string
          total_amount?: number
          unit_id: string
          water_curr?: number
          water_prev?: number
        }
        Update: {
          attachment_path?: string | null
          created_at?: string
          energy_curr?: number
          energy_prev?: number
          hvac_curr?: number
          hvac_prev?: number
          id?: string
          reference_month?: string
          total_amount?: number
          unit_id?: string
          water_curr?: number
          water_prev?: number
        }
        Relationships: [
          {
            foreignKeyName: "consumption_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_bills: {
        Row: {
          amount: number
          attachment_path: string | null
          created_at: string
          due_date: string | null
          id: string
          kind: Database["public"]["Enums"]["utility_kind"]
          paid_at: string | null
          reading_curr: number
          reading_prev: number
          reference_month: string
          unit_id: string
        }
        Insert: {
          amount?: number
          attachment_path?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["utility_kind"]
          paid_at?: string | null
          reading_curr?: number
          reading_prev?: number
          reference_month: string
          unit_id: string
        }
        Update: {
          amount?: number
          attachment_path?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["utility_kind"]
          paid_at?: string | null
          reading_curr?: number
          reading_prev?: number
          reference_month?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumption_bills_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_messages: {
        Row: {
          author_id: string
          created_at: string
          from_admin: boolean
          id: string
          message: string
          notice_id: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          message: string
          notice_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          message?: string
          notice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_messages_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          unit_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          title: string
          unit_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      os_messages: {
        Row: {
          author_id: string
          created_at: string
          from_admin: boolean
          id: string
          message: string
          order_id: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          message: string
          order_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          message?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          number: number
          photos: string[]
          priority: Database["public"]["Enums"]["os_priority"]
          status: Database["public"]["Enums"]["os_status"]
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          number?: number
          photos?: string[]
          priority?: Database["public"]["Enums"]["os_priority"]
          status?: Database["public"]["Enums"]["os_status"]
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          number?: number
          photos?: string[]
          priority?: Database["public"]["Enums"]["os_priority"]
          status?: Database["public"]["Enums"]["os_status"]
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          author_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          unit_id: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          unit_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          active: boolean
          created_at: string
          document: string | null
          email: string
          id: string
          identifier: string
          login_user_id: string | null
          owner_name: string
          phone: string | null
          terminated_at: string | null
          unit_type: Database["public"]["Enums"]["unit_type"]
          username: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          document?: string | null
          email: string
          id?: string
          identifier: string
          login_user_id?: string | null
          owner_name: string
          phone?: string | null
          terminated_at?: string | null
          unit_type?: Database["public"]["Enums"]["unit_type"]
          username?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          document?: string | null
          email?: string
          id?: string
          identifier?: string
          login_user_id?: string | null
          owner_name?: string
          phone?: string | null
          terminated_at?: string | null
          unit_type?: Database["public"]["Enums"]["unit_type"]
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_admin_if_none: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_unit: { Args: { _unit_id: string }; Returns: boolean }
      owns_unit_path: { Args: { _name: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "condomino"
      os_priority: "baixa" | "media" | "alta"
      os_status: "pendente" | "em_andamento" | "concluido" | "cancelado"
      unit_type: "galpao" | "sala_comercial" | "residencial"
      utility_kind: "energia" | "agua" | "climatizacao"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "condomino"],
      os_priority: ["baixa", "media", "alta"],
      os_status: ["pendente", "em_andamento", "concluido", "cancelado"],
      unit_type: ["galpao", "sala_comercial", "residencial"],
      utility_kind: ["energia", "agua", "climatizacao"],
    },
  },
} as const
