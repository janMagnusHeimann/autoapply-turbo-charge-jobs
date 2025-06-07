export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_runs: {
        Row: {
          applications_failed: number | null
          applications_submitted: number | null
          applications_successful: number | null
          completed_at: string | null
          config_snapshot: Json | null
          created_at: string | null
          error_message: string | null
          execution_log: string | null
          id: string
          job_configuration_id: string
          jobs_found: number | null
          last_activity_at: string | null
          name: string
          started_at: string | null
          status: string | null
          task_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applications_failed?: number | null
          applications_submitted?: number | null
          applications_successful?: number | null
          completed_at?: string | null
          config_snapshot?: Json | null
          created_at?: string | null
          error_message?: string | null
          execution_log?: string | null
          id?: string
          job_configuration_id: string
          jobs_found?: number | null
          last_activity_at?: string | null
          name: string
          started_at?: string | null
          status?: string | null
          task_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applications_failed?: number | null
          applications_submitted?: number | null
          applications_successful?: number | null
          completed_at?: string | null
          config_snapshot?: Json | null
          created_at?: string | null
          error_message?: string | null
          execution_log?: string | null
          id?: string
          job_configuration_id?: string
          jobs_found?: number | null
          last_activity_at?: string | null
          name?: string
          started_at?: string | null
          status?: string | null
          task_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_job_configuration_id_fkey"
            columns: ["job_configuration_id"]
            isOneToOne: false
            referencedRelation: "job_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          ai_summary: string | null
          content_type: string
          created_at: string | null
          extracted_text: string | null
          file_path: string
          file_size: number
          filename: string
          id: string
          original_filename: string
          status: string | null
          structured_data: Json | null
          suggested_improvements: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          content_type: string
          created_at?: string | null
          extracted_text?: string | null
          file_path: string
          file_size: number
          filename: string
          id?: string
          original_filename: string
          status?: string | null
          structured_data?: Json | null
          suggested_improvements?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          content_type?: string
          created_at?: string | null
          extracted_text?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          original_filename?: string
          status?: string | null
          structured_data?: Json | null
          suggested_improvements?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cvs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      github_application_campaigns: {
        Row: {
          applications_attempted: number | null
          applications_per_day: number | null
          applications_successful: number | null
          companies_processed: number | null
          companies_targeted: number | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          exclude_keywords: string[] | null
          id: string
          max_applications: number | null
          min_fit_score: number | null
          name: string
          source_repos: string[] | null
          started_at: string | null
          status: string | null
          target_keywords: string[] | null
          target_locations: string[] | null
          updated_at: string | null
        }
        Insert: {
          applications_attempted?: number | null
          applications_per_day?: number | null
          applications_successful?: number | null
          companies_processed?: number | null
          companies_targeted?: number | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          exclude_keywords?: string[] | null
          id?: string
          max_applications?: number | null
          min_fit_score?: number | null
          name: string
          source_repos?: string[] | null
          started_at?: string | null
          status?: string | null
          target_keywords?: string[] | null
          target_locations?: string[] | null
          updated_at?: string | null
        }
        Update: {
          applications_attempted?: number | null
          applications_per_day?: number | null
          applications_successful?: number | null
          companies_processed?: number | null
          companies_targeted?: number | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          exclude_keywords?: string[] | null
          id?: string
          max_applications?: number | null
          min_fit_score?: number | null
          name?: string
          source_repos?: string[] | null
          started_at?: string | null
          status?: string | null
          target_keywords?: string[] | null
          target_locations?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      github_companies: {
        Row: {
          ai_summary: string | null
          application_priority: number | null
          application_status: string | null
          applied_at: string | null
          created_at: string | null
          description: string | null
          fit_score: number | null
          id: string
          last_checked: string | null
          location: string | null
          meta_description: string | null
          name: string
          notes: string | null
          page_title: string | null
          raw_data: Json | null
          retrieved_at: string | null
          source_description: string | null
          source_line: string | null
          source_repo: string
          tags: string[] | null
          updated_at: string | null
          website: string | null
          website_accessible: boolean | null
        }
        Insert: {
          ai_summary?: string | null
          application_priority?: number | null
          application_status?: string | null
          applied_at?: string | null
          created_at?: string | null
          description?: string | null
          fit_score?: number | null
          id?: string
          last_checked?: string | null
          location?: string | null
          meta_description?: string | null
          name: string
          notes?: string | null
          page_title?: string | null
          raw_data?: Json | null
          retrieved_at?: string | null
          source_description?: string | null
          source_line?: string | null
          source_repo: string
          tags?: string[] | null
          updated_at?: string | null
          website?: string | null
          website_accessible?: boolean | null
        }
        Update: {
          ai_summary?: string | null
          application_priority?: number | null
          application_status?: string | null
          applied_at?: string | null
          created_at?: string | null
          description?: string | null
          fit_score?: number | null
          id?: string
          last_checked?: string | null
          location?: string | null
          meta_description?: string | null
          name?: string
          notes?: string | null
          page_title?: string | null
          raw_data?: Json | null
          retrieved_at?: string | null
          source_description?: string | null
          source_line?: string | null
          source_repo?: string
          tags?: string[] | null
          updated_at?: string | null
          website?: string | null
          website_accessible?: boolean | null
        }
        Relationships: []
      }
      github_selenium_applications: {
        Row: {
          application_url: string | null
          attempted_at: string | null
          automation_log: string | null
          browser_session_id: string | null
          campaign_id: string | null
          career_page_url: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_time_seconds: number | null
          form_data_submitted: Json | null
          form_fields_detected: Json | null
          id: string
          job_title: string | null
          max_retries: number | null
          retry_count: number | null
          screenshots_paths: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_url?: string | null
          attempted_at?: string | null
          automation_log?: string | null
          browser_session_id?: string | null
          campaign_id?: string | null
          career_page_url?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_seconds?: number | null
          form_data_submitted?: Json | null
          form_fields_detected?: Json | null
          id?: string
          job_title?: string | null
          max_retries?: number | null
          retry_count?: number | null
          screenshots_paths?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_url?: string | null
          attempted_at?: string | null
          automation_log?: string | null
          browser_session_id?: string | null
          campaign_id?: string | null
          career_page_url?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_seconds?: number | null
          form_data_submitted?: Json | null
          form_fields_detected?: Json | null
          id?: string
          job_title?: string | null
          max_retries?: number | null
          retry_count?: number | null
          screenshots_paths?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "github_selenium_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "github_application_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_selenium_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "github_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          ai_feedback: string | null
          application_reference: string | null
          applied_at: string | null
          cover_letter: string | null
          created_at: string | null
          custom_message: string | null
          cv_id: string
          id: string
          job_configuration_id: string
          job_listing_id: string
          notes: string | null
          response_received_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          application_reference?: string | null
          applied_at?: string | null
          cover_letter?: string | null
          created_at?: string | null
          custom_message?: string | null
          cv_id: string
          id?: string
          job_configuration_id: string
          job_listing_id: string
          notes?: string | null
          response_received_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          application_reference?: string | null
          applied_at?: string | null
          cover_letter?: string | null
          created_at?: string | null
          custom_message?: string | null
          cv_id?: string
          id?: string
          job_configuration_id?: string
          job_listing_id?: string
          notes?: string | null
          response_received_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_configuration_id_fkey"
            columns: ["job_configuration_id"]
            isOneToOne: false
            referencedRelation: "job_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_configurations: {
        Row: {
          auto_apply: boolean | null
          cover_letter_template: string | null
          created_at: string | null
          description: string | null
          exclude_keywords: Json | null
          experience_level: string | null
          id: string
          job_sites: Json
          job_titles: Json
          keywords: Json | null
          linkedin_email: string | null
          linkedin_password: string | null
          locations: Json
          max_applications_per_day: number | null
          max_salary: number | null
          min_salary: number | null
          name: string
          status: string | null
          task_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_apply?: boolean | null
          cover_letter_template?: string | null
          created_at?: string | null
          description?: string | null
          exclude_keywords?: Json | null
          experience_level?: string | null
          id?: string
          job_sites: Json
          job_titles: Json
          keywords?: Json | null
          linkedin_email?: string | null
          linkedin_password?: string | null
          locations: Json
          max_applications_per_day?: number | null
          max_salary?: number | null
          min_salary?: number | null
          name: string
          status?: string | null
          task_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_apply?: boolean | null
          cover_letter_template?: string | null
          created_at?: string | null
          description?: string | null
          exclude_keywords?: Json | null
          experience_level?: string | null
          id?: string
          job_sites?: Json
          job_titles?: Json
          keywords?: Json | null
          linkedin_email?: string | null
          linkedin_password?: string | null
          locations?: Json
          max_applications_per_day?: number | null
          max_salary?: number | null
          min_salary?: number | null
          name?: string
          status?: string | null
          task_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_configurations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ai_analysis: Json | null
          company_name: string
          company_url: string | null
          created_at: string | null
          description: string | null
          discovered_at: string | null
          id: string
          job_url: string
          location: string | null
          match_score: number | null
          requirements: string | null
          salary_range: string | null
          source_platform: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          company_name: string
          company_url?: string | null
          created_at?: string | null
          description?: string | null
          discovered_at?: string | null
          id?: string
          job_url: string
          location?: string | null
          match_score?: number | null
          requirements?: string | null
          salary_range?: string | null
          source_platform: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          company_name?: string
          company_url?: string | null
          created_at?: string | null
          description?: string | null
          discovered_at?: string | null
          id?: string
          job_url?: string
          location?: string | null
          match_score?: number | null
          requirements?: string | null
          salary_range?: string | null
          source_platform?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_applications: {
        Row: {
          company_name: string
          company_url: string | null
          created_at: string
          cv_preview: string | null
          discovered_at: string
          id: string
          job_description: string | null
          job_title: string
          job_url: string
          location: string | null
          match_score: number | null
          salary_range: string | null
          source_platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          company_url?: string | null
          created_at?: string
          cv_preview?: string | null
          discovered_at?: string
          id?: string
          job_description?: string | null
          job_title: string
          job_url: string
          location?: string | null
          match_score?: number | null
          salary_range?: string | null
          source_platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          company_url?: string | null
          created_at?: string
          cv_preview?: string | null
          discovered_at?: string
          id?: string
          job_description?: string | null
          job_title?: string
          job_url?: string
          location?: string | null
          match_score?: number | null
          salary_range?: string | null
          source_platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_login: string | null
          last_name: string | null
          preferred_job_titles: Json | null
          preferred_locations: Json | null
          salary_expectation_max: number | null
          salary_expectation_min: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_login?: string | null
          last_name?: string | null
          preferred_job_titles?: Json | null
          preferred_locations?: Json | null
          salary_expectation_max?: number | null
          salary_expectation_min?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_login?: string | null
          last_name?: string | null
          preferred_job_titles?: Json | null
          preferred_locations?: Json | null
          salary_expectation_max?: number | null
          salary_expectation_min?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_github_companies_by_location: {
        Args: { location_query: string }
        Returns: {
          id: string
          name: string
          website: string
          location: string
          source_repo: string
          fit_score: number
        }[]
      }
      prioritize_github_companies_for_campaign: {
        Args: { campaign_id_input: string; limit_count?: number }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
