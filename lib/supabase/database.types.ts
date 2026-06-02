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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {

      oil_customers: {
        Row: {
          company_name: string
          created_at: string
          id: string
          status: string
          updated_at: string
          logo_url: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          logo_url?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          logo_url?: string | null
        }
        Relationships: []
      }
      oil_lab_requests: {
        Row: {
          assigned_to_profile_id: string | null
          created_at: string
          customer_id: string
          description: string | null
          due_date: string | null
          id: string
          is_new_machine: boolean
          machine_id: string | null
          new_machine_data: Json | null
          priority: string
          request_date: string
          requested_by_profile_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_profile_id?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_new_machine?: boolean
          machine_id?: string | null
          new_machine_data?: Json | null
          priority?: string
          request_date?: string
          requested_by_profile_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_profile_id?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_new_machine?: boolean
          machine_id?: string | null
          new_machine_data?: Json | null
          priority?: string
          request_date?: string
          requested_by_profile_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oil_lab_requests_assigned_to_profile_id_fkey"
            columns: ["assigned_to_profile_id"]
            isOneToOne: false
            referencedRelation: "oil_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_lab_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "oil_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_lab_requests_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "oil_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_lab_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "oil_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_lab_tests: {
        Row: {
          created_at: string
          id: string
          machine_id: string
          pdf_path: string | null
          product_id: string
          tan_value: number | null
          test_date: string
          updated_at: string
          updated_by: string | null
          viscosity: number | null
          water_content: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id: string
          pdf_path?: string | null
          product_id: string
          tan_value?: number | null
          test_date: string
          updated_at?: string
          updated_by?: string | null
          viscosity?: number | null
          water_content?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string
          pdf_path?: string | null
          product_id?: string
          tan_value?: number | null
          test_date?: string
          updated_at?: string
          updated_by?: string | null
          viscosity?: number | null
          water_content?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oil_lab_tests_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "oil_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_lab_tests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "oil_products"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_machines: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          location: string | null
          machine_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          location?: string | null
          machine_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          location?: string | null
          machine_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oil_machines_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "oil_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_maintenance_action_logs: {
        Row: {
          action_id: string
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          to_status: string | null
        }
        Insert: {
          action_id: string
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          to_status?: string | null
        }
        Update: {
          action_id?: string
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oil_maintenance_action_logs_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "oil_maintenance_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_maintenance_action_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "oil_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_maintenance_actions: {
        Row: {
          alert_key: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          due_date: string | null
          evidence_notes: string | null
          id: string
          machine_id: string | null
          owner_profile_id: string | null
          priority: string
          source_payload: Json
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          verification_status: string
        }
        Insert: {
          alert_key?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          due_date?: string | null
          evidence_notes?: string | null
          id?: string
          machine_id?: string | null
          owner_profile_id?: string | null
          priority?: string
          source_payload?: Json
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          verification_status?: string
        }
        Update: {
          alert_key?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          due_date?: string | null
          evidence_notes?: string | null
          id?: string
          machine_id?: string | null
          owner_profile_id?: string | null
          priority?: string
          source_payload?: Json
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "oil_maintenance_actions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "oil_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_maintenance_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "oil_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_maintenance_actions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "oil_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_maintenance_actions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "oil_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_maintenance_actions_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "oil_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_maintenance_actions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "oil_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_products: {
        Row: {
          created_at: string
          id: string
          product_name: string
          product_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_name: string
          product_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_name?: string
          product_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      oil_profiles: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          phone_number: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id: string
          phone_number?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          phone_number?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oil_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "oil_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_rate_limits: {
        Row: {
          count: number
          key: string
          reset_at: string
        }
        Insert: {
          count: number
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_oil_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      current_user_role: { Args: never; Returns: string }
      get_my_claim: { Args: { claim: string }; Returns: string }
      get_my_customer_id: { Args: never; Returns: string }
      insert_lab_request: {
        Args: {
          p_customer_id: string
          p_description?: string
          p_due_date?: string
          p_is_new_machine?: boolean
          p_machine_id?: string
          p_new_machine_data?: Json
          p_priority?: string
          p_requested_by_profile_id: string
          p_title?: string
        }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      set_customer_user_management_pin: {
        Args: { p_customer_id: string; p_pin: string }
        Returns: undefined
      }
      verify_customer_user_management_pin: {
        Args: { p_customer_id: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
