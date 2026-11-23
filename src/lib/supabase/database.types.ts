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
      business_lines: {
        Row: {
          accepts_requests: boolean
          created_at: string
          form_schema: Json
          id: number
          name_en: string
          name_it: string
          slug: string
          sort: number
          summary_en: string
          summary_it: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          accepts_requests?: boolean
          created_at?: string
          form_schema?: Json
          id?: never
          name_en: string
          name_it: string
          slug: string
          sort?: number
          summary_en?: string
          summary_it?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          accepts_requests?: boolean
          created_at?: string
          form_schema?: Json
          id?: never
          name_en?: string
          name_it?: string
          slug?: string
          sort?: number
          summary_en?: string
          summary_it?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description_en: string
          description_it: string
          ends_on: string | null
          id: number
          kind: string
          location: string
          published: boolean
          source_code: string
          starts_on: string
          title_en: string
          title_it: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string
          description_it?: string
          ends_on?: string | null
          id?: never
          kind?: string
          location?: string
          published?: boolean
          source_code: string
          starts_on: string
          title_en: string
          title_it: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string
          description_it?: string
          ends_on?: string | null
          id?: never
          kind?: string
          location?: string
          published?: boolean
          source_code?: string
          starts_on?: string
          title_en?: string
          title_it?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          body_md: string
          created_at: string
          id: number
          kind: string
          locale: string
          published_at: string | null
          version: number
        }
        Insert: {
          body_md: string
          created_at?: string
          id?: never
          kind: string
          locale: string
          published_at?: string | null
          version: number
        }
        Update: {
          body_md?: string
          created_at?: string
          id?: never
          kind?: string
          locale?: string
          published_at?: string | null
          version?: number
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          attempts: number
          created_at: string
          delivered: string[]
          event_type: string
          id: number
          last_error: string | null
          next_attempt_at: string
          payload: Json
          processed_at: string | null
          request_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered?: string[]
          event_type: string
          id?: never
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          processed_at?: string | null
          request_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered?: string[]
          event_type?: string
          id?: never
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          processed_at?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          kind: string
          payload: Json
          read_at: string | null
          request_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kind: string
          payload?: Json
          read_at?: string | null
          request_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string
          payload?: Json
          read_at?: string | null
          request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          slug: string
          sort: number
          title_en: string
          title_it: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          slug: string
          sort?: number
          title_en: string
          title_it: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          slug?: string
          sort?: number
          title_en?: string
          title_it?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          business_line_id: number | null
          caption_en: string
          caption_it: string
          created_at: string
          created_by: string | null
          id: number
          image_path: string
          published: boolean
          rights_transferred: boolean
          sort: number
          updated_at: string
        }
        Insert: {
          business_line_id?: number | null
          caption_en?: string
          caption_it?: string
          created_at?: string
          created_by?: string | null
          id?: never
          image_path: string
          published?: boolean
          rights_transferred?: boolean
          sort?: number
          updated_at?: string
        }
        Update: {
          business_line_id?: number | null
          caption_en?: string
          caption_it?: string
          created_at?: string
          created_by?: string | null
          id?: never
          image_path?: string
          published?: boolean
          rights_transferred?: boolean
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          locale: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          locale?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          locale?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      request_files: {
        Row: {
          backed_up_at: string | null
          cloud_deleted_at: string | null
          created_at: string
          id: number
          mime_type: string | null
          original_name: string
          request_id: string
          size_bytes: number
          storage_path: string
          synced_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          backed_up_at?: string | null
          cloud_deleted_at?: string | null
          created_at?: string
          id?: never
          mime_type?: string | null
          original_name: string
          request_id: string
          size_bytes: number
          storage_path: string
          synced_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          backed_up_at?: string | null
          cloud_deleted_at?: string | null
          created_at?: string
          id?: never
          mime_type?: string | null
          original_name?: string
          request_id?: string
          size_bytes?: number
          storage_path?: string
          synced_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: number
          internal: boolean
          request_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: never
          internal?: boolean
          request_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: never
          internal?: boolean
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: number
          note: string | null
          request_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          note?: string | null
          request_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: never
          note?: string | null
          request_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_status_history_from_status_fkey"
            columns: ["from_status"]
            isOneToOne: false
            referencedRelation: "request_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_status_history_to_status_fkey"
            columns: ["to_status"]
            isOneToOne: false
            referencedRelation: "request_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      request_statuses: {
        Row: {
          code: string
          is_terminal: boolean
          label_en: string
          label_it: string
          notify_client: boolean
          sort: number
          visible_to_client: boolean
        }
        Insert: {
          code: string
          is_terminal?: boolean
          label_en: string
          label_it: string
          notify_client?: boolean
          sort: number
          visible_to_client?: boolean
        }
        Update: {
          code?: string
          is_terminal?: boolean
          label_en?: string
          label_it?: string
          notify_client?: boolean
          sort?: number
          visible_to_client?: boolean
        }
        Relationships: []
      }
      requests: {
        Row: {
          business_line_id: number
          created_at: string
          customer_id: string
          deadline: string | null
          description: string
          details: Json
          id: string
          kind: string
          measures: string | null
          privacy_consent_at: string
          privacy_document_id: number | null
          public_code: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_line_id: number
          created_at?: string
          customer_id: string
          deadline?: string | null
          description: string
          details?: Json
          id?: string
          kind?: string
          measures?: string | null
          privacy_consent_at: string
          privacy_document_id?: number | null
          public_code?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_line_id?: number
          created_at?: string
          customer_id?: string
          deadline?: string | null
          description?: string
          details?: Json
          id?: string
          kind?: string
          measures?: string | null
          privacy_consent_at?: string
          privacy_document_id?: number | null
          public_code?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_privacy_document_id_fkey"
            columns: ["privacy_document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_status_fkey"
            columns: ["status"]
            isOneToOne: false
            referencedRelation: "request_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      site_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_texts: {
        Row: {
          key: string
          locale: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          locale: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          locale?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_request_status: {
        Args: { p_note?: string; p_request_id: string; p_status: string }
        Returns: undefined
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      notify_claim_batch: {
        Args: { p_limit?: number }
        Returns: Database["public"]["Tables"]["notification_outbox"]["Row"][]
      }
      notify_mark_done: {
        Args: { p_delivered: string[]; p_id: number }
        Returns: undefined
      }
      notify_mark_failed: {
        Args: {
          p_delivered: string[]
          p_error: string
          p_id: number
          p_next_attempt_at: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "operatore" | "cliente"
      visibility: "attiva" | "in_sviluppo" | "oscurata"
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
      app_role: ["admin", "operatore", "cliente"],
      visibility: ["attiva", "in_sviluppo", "oscurata"],
    },
  },
} as const
