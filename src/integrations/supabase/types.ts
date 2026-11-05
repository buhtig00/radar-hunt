export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          is_active: boolean;
          metadata: Json | null;
          source_id: string;
          token_count: number | null;
        };
        Insert: {
          chunk_index?: number;
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          is_active?: boolean;
          metadata?: Json | null;
          source_id: string;
          token_count?: number | null;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          is_active?: boolean;
          metadata?: Json | null;
          source_id?: string;
          token_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_chunks_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "ai_knowledge_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_feedback: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          interaction_id: string;
          rating: string;
          user_id: string | null;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          interaction_id: string;
          rating: string;
          user_id?: string | null;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          interaction_id?: string;
          rating?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_feedback_interaction_id_fkey";
            columns: ["interaction_id"];
            isOneToOne: false;
            referencedRelation: "ai_interactions";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_interactions: {
        Row: {
          answer: Json;
          created_at: string;
          id: string;
          language: string;
          latency_ms: number | null;
          mode: string;
          query: string;
          role: string | null;
          safety_flags: string[];
          sources_used: string[];
          subspecialty: string | null;
          user_id: string | null;
          validation_level: string;
        };
        Insert: {
          answer: Json;
          created_at?: string;
          id?: string;
          language?: string;
          latency_ms?: number | null;
          mode: string;
          query: string;
          role?: string | null;
          safety_flags?: string[];
          sources_used?: string[];
          subspecialty?: string | null;
          user_id?: string | null;
          validation_level?: string;
        };
        Update: {
          answer?: Json;
          created_at?: string;
          id?: string;
          language?: string;
          latency_ms?: number | null;
          mode?: string;
          query?: string;
          role?: string | null;
          safety_flags?: string[];
          sources_used?: string[];
          subspecialty?: string | null;
          user_id?: string | null;
          validation_level?: string;
        };
        Relationships: [];
      };
      ai_knowledge_sources: {
        Row: {
          approval_status: string;
          author: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          evidence_level: string | null;
          external_url: string | null;
          id: string;
          is_active: boolean;
          kol_validator: string | null;
          language: string;
          last_reviewed_at: string | null;
          metadata: Json | null;
          pathology: string | null;
          publication_date: string | null;
          source_type: string;
          subspecialty: string;
          title: string;
          updated_at: string;
          validation_level: string | null;
        };
        Insert: {
          approval_status?: string;
          author?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          evidence_level?: string | null;
          external_url?: string | null;
          id?: string;
          is_active?: boolean;
          kol_validator?: string | null;
          language?: string;
          last_reviewed_at?: string | null;
          metadata?: Json | null;
          pathology?: string | null;
          publication_date?: string | null;
          source_type: string;
          subspecialty: string;
          title: string;
          updated_at?: string;
          validation_level?: string | null;
        };
        Update: {
          approval_status?: string;
          author?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          evidence_level?: string | null;
          external_url?: string | null;
          id?: string;
          is_active?: boolean;
          kol_validator?: string | null;
          language?: string;
          last_reviewed_at?: string | null;
          metadata?: Json | null;
          pathology?: string | null;
          publication_date?: string | null;
          source_type?: string;
          subspecialty?: string;
          title?: string;
          updated_at?: string;
          validation_level?: string | null;
        };
        Relationships: [];
      };
      ai_safety_events: {
        Row: {
          action_taken: string | null;
          categories: string[];
          created_at: string;
          id: string;
          interaction_id: string | null;
          matched_terms: string[];
          query_excerpt: string | null;
          severity: string;
          user_id: string | null;
        };
        Insert: {
          action_taken?: string | null;
          categories?: string[];
          created_at?: string;
          id?: string;
          interaction_id?: string | null;
          matched_terms?: string[];
          query_excerpt?: string | null;
          severity?: string;
          user_id?: string | null;
        };
        Update: {
          action_taken?: string | null;
          categories?: string[];
          created_at?: string;
          id?: string;
          interaction_id?: string | null;
          matched_terms?: string[];
          query_excerpt?: string | null;
          severity?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_safety_events_interaction_id_fkey";
            columns: ["interaction_id"];
            isOneToOne: false;
            referencedRelation: "ai_interactions";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_source_audit: {
        Row: {
          actor_role: string | null;
          actor_user_id: string | null;
          comment: string | null;
          created_at: string;
          decision: string;
          id: string;
          metadata: Json;
          new_is_active: boolean | null;
          new_status: string | null;
          prev_is_active: boolean | null;
          prev_status: string | null;
          source_id: string;
        };
        Insert: {
          actor_role?: string | null;
          actor_user_id?: string | null;
          comment?: string | null;
          created_at?: string;
          decision: string;
          id?: string;
          metadata?: Json;
          new_is_active?: boolean | null;
          new_status?: string | null;
          prev_is_active?: boolean | null;
          prev_status?: string | null;
          source_id: string;
        };
        Update: {
          actor_role?: string | null;
          actor_user_id?: string | null;
          comment?: string | null;
          created_at?: string;
          decision?: string;
          id?: string;
          metadata?: Json;
          new_is_active?: boolean | null;
          new_status?: string | null;
          prev_is_active?: boolean | null;
          prev_status?: string | null;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_source_audit_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "ai_knowledge_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_ai_source_links: {
        Row: {
          ai_knowledge_source_id: string | null;
          case_template_id: string | null;
          classification_id: string | null;
          created_at: string;
          device_id: string | null;
          guideline_id: string | null;
          id: string;
          medication_id: string | null;
          pathology_id: string | null;
          protocol_id: string | null;
          relationship_type: string;
        };
        Insert: {
          ai_knowledge_source_id?: string | null;
          case_template_id?: string | null;
          classification_id?: string | null;
          created_at?: string;
          device_id?: string | null;
          guideline_id?: string | null;
          id?: string;
          medication_id?: string | null;
          pathology_id?: string | null;
          protocol_id?: string | null;
          relationship_type?: string;
        };
        Update: {
          ai_knowledge_source_id?: string | null;
          case_template_id?: string | null;
          classification_id?: string | null;
          created_at?: string;
          device_id?: string | null;
          guideline_id?: string | null;
          id?: string;
          medication_id?: string | null;
          pathology_id?: string | null;
          protocol_id?: string | null;
          relationship_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_ai_source_links_ai_knowledge_source_id_fkey";
            columns: ["ai_knowledge_source_id"];
            isOneToOne: false;
            referencedRelation: "ai_knowledge_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_ai_source_links_case_template_id_fkey";
            columns: ["case_template_id"];
            isOneToOne: false;
            referencedRelation: "oph_case_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_ai_source_links_classification_id_fkey";
            columns: ["classification_id"];
            isOneToOne: false;
            referencedRelation: "oph_classifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_ai_source_links_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "oph_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_ai_source_links_guideline_id_fkey";
            columns: ["guideline_id"];
            isOneToOne: false;
            referencedRelation: "oph_guidelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_ai_source_links_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "oph_medications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_ai_source_links_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_ai_source_links_protocol_id_fkey";
            columns: ["protocol_id"];
            isOneToOne: false;
            referencedRelation: "oph_protocols";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_anatomical_sites: {
        Row: {
          code: string;
          created_at: string;
          description_en: string | null;
          description_es: string | null;
          id: string;
          is_active: boolean;
          name_en: string;
          name_es: string;
          parent_site_id: string | null;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          id?: string;
          is_active?: boolean;
          name_en: string;
          name_es: string;
          parent_site_id?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          id?: string;
          is_active?: boolean;
          name_en?: string;
          name_es?: string;
          parent_site_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_anatomical_sites_parent_site_id_fkey";
            columns: ["parent_site_id"];
            isOneToOne: false;
            referencedRelation: "oph_anatomical_sites";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_case_template_sections: {
        Row: {
          case_template_id: string;
          created_at: string;
          id: string;
          instructions_en: string | null;
          instructions_es: string | null;
          is_required: boolean;
          metadata: Json;
          section_key: string;
          section_order: number;
          section_title_en: string;
          section_title_es: string | null;
          updated_at: string;
        };
        Insert: {
          case_template_id: string;
          created_at?: string;
          id?: string;
          instructions_en?: string | null;
          instructions_es?: string | null;
          is_required?: boolean;
          metadata?: Json;
          section_key: string;
          section_order: number;
          section_title_en: string;
          section_title_es?: string | null;
          updated_at?: string;
        };
        Update: {
          case_template_id?: string;
          created_at?: string;
          id?: string;
          instructions_en?: string | null;
          instructions_es?: string | null;
          is_required?: boolean;
          metadata?: Json;
          section_key?: string;
          section_order?: number;
          section_title_en?: string;
          section_title_es?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_case_template_sections_case_template_id_fkey";
            columns: ["case_template_id"];
            isOneToOne: false;
            referencedRelation: "oph_case_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_case_templates: {
        Row: {
          case_prompt_en: string | null;
          case_prompt_es: string | null;
          created_at: string;
          difficulty_level: string;
          expected_classification_links: string[];
          expected_protocol_links: string[];
          id: string;
          is_active: boolean;
          kol_validator_id: string | null;
          learning_objectives_en: string | null;
          learning_objectives_es: string | null;
          metadata: Json;
          next_review_at: string | null;
          pathology_id: string | null;
          red_flags_en: string | null;
          red_flags_es: string | null;
          required_fields: Json;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          status: Database["public"]["Enums"]["oph_content_status"];
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          suggested_discussion_points_en: string | null;
          suggested_discussion_points_es: string | null;
          title_en: string;
          title_es: string;
          updated_at: string;
        };
        Insert: {
          case_prompt_en?: string | null;
          case_prompt_es?: string | null;
          created_at?: string;
          difficulty_level?: string;
          expected_classification_links?: string[];
          expected_protocol_links?: string[];
          id?: string;
          is_active?: boolean;
          kol_validator_id?: string | null;
          learning_objectives_en?: string | null;
          learning_objectives_es?: string | null;
          metadata?: Json;
          next_review_at?: string | null;
          pathology_id?: string | null;
          red_flags_en?: string | null;
          red_flags_es?: string | null;
          required_fields?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          suggested_discussion_points_en?: string | null;
          suggested_discussion_points_es?: string | null;
          title_en: string;
          title_es: string;
          updated_at?: string;
        };
        Update: {
          case_prompt_en?: string | null;
          case_prompt_es?: string | null;
          created_at?: string;
          difficulty_level?: string;
          expected_classification_links?: string[];
          expected_protocol_links?: string[];
          id?: string;
          is_active?: boolean;
          kol_validator_id?: string | null;
          learning_objectives_en?: string | null;
          learning_objectives_es?: string | null;
          metadata?: Json;
          next_review_at?: string | null;
          pathology_id?: string | null;
          red_flags_en?: string | null;
          red_flags_es?: string | null;
          required_fields?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"];
          suggested_discussion_points_en?: string | null;
          suggested_discussion_points_es?: string | null;
          title_en?: string;
          title_es?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_case_templates_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_classification_items: {
        Row: {
          classification_id: string;
          code: string | null;
          created_at: string;
          definition_en: string | null;
          definition_es: string | null;
          id: string;
          item_order: number;
          label_en: string;
          label_es: string | null;
          management_implication_en: string | null;
          management_implication_es: string | null;
          metadata: Json;
          updated_at: string;
        };
        Insert: {
          classification_id: string;
          code?: string | null;
          created_at?: string;
          definition_en?: string | null;
          definition_es?: string | null;
          id?: string;
          item_order: number;
          label_en: string;
          label_es?: string | null;
          management_implication_en?: string | null;
          management_implication_es?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Update: {
          classification_id?: string;
          code?: string | null;
          created_at?: string;
          definition_en?: string | null;
          definition_es?: string | null;
          id?: string;
          item_order?: number;
          label_en?: string;
          label_es?: string | null;
          management_implication_en?: string | null;
          management_implication_es?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_classification_items_classification_id_fkey";
            columns: ["classification_id"];
            isOneToOne: false;
            referencedRelation: "oph_classifications";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_classifications: {
        Row: {
          acronym: string | null;
          clinical_use_en: string | null;
          clinical_use_es: string | null;
          created_at: string;
          description_en: string | null;
          description_es: string | null;
          id: string;
          is_active: boolean;
          kol_validator_id: string | null;
          metadata: Json;
          name: string;
          next_review_at: string | null;
          original_source: string | null;
          pathology_id: string | null;
          references_json: Json;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["oph_content_status"];
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          updated_at: string;
        };
        Insert: {
          acronym?: string | null;
          clinical_use_en?: string | null;
          clinical_use_es?: string | null;
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          id?: string;
          is_active?: boolean;
          kol_validator_id?: string | null;
          metadata?: Json;
          name: string;
          next_review_at?: string | null;
          original_source?: string | null;
          pathology_id?: string | null;
          references_json?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          updated_at?: string;
        };
        Update: {
          acronym?: string | null;
          clinical_use_en?: string | null;
          clinical_use_es?: string | null;
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          id?: string;
          is_active?: boolean;
          kol_validator_id?: string | null;
          metadata?: Json;
          name?: string;
          next_review_at?: string | null;
          original_source?: string | null;
          pathology_id?: string | null;
          references_json?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_classifications_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_clinical_cases: {
        Row: {
          age_range: string | null;
          anonymisation_confirmed: boolean;
          case_template_id: string | null;
          chief_complaint: string | null;
          created_at: string;
          discussion_question: string | null;
          examination: string | null;
          history: string | null;
          id: string;
          imaging_tests: string | null;
          is_active: boolean;
          kol_validator_id: string | null;
          metadata: Json;
          next_review_at: string | null;
          outcome: string | null;
          pathology_id: string | null;
          pii_risk_details: Json;
          pii_risk_detected: boolean;
          references_json: Json;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sex: string | null;
          status: Database["public"]["Enums"]["oph_content_status"];
          submitted_by: string | null;
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          title: string;
          treatment_course: string | null;
          updated_at: string;
        };
        Insert: {
          age_range?: string | null;
          anonymisation_confirmed?: boolean;
          case_template_id?: string | null;
          chief_complaint?: string | null;
          created_at?: string;
          discussion_question?: string | null;
          examination?: string | null;
          history?: string | null;
          id?: string;
          imaging_tests?: string | null;
          is_active?: boolean;
          kol_validator_id?: string | null;
          metadata?: Json;
          next_review_at?: string | null;
          outcome?: string | null;
          pathology_id?: string | null;
          pii_risk_details?: Json;
          pii_risk_detected?: boolean;
          references_json?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sex?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          submitted_by?: string | null;
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          title: string;
          treatment_course?: string | null;
          updated_at?: string;
        };
        Update: {
          age_range?: string | null;
          anonymisation_confirmed?: boolean;
          case_template_id?: string | null;
          chief_complaint?: string | null;
          created_at?: string;
          discussion_question?: string | null;
          examination?: string | null;
          history?: string | null;
          id?: string;
          imaging_tests?: string | null;
          is_active?: boolean;
          kol_validator_id?: string | null;
          metadata?: Json;
          next_review_at?: string | null;
          outcome?: string | null;
          pathology_id?: string | null;
          pii_risk_details?: Json;
          pii_risk_detected?: boolean;
          references_json?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sex?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          submitted_by?: string | null;
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"];
          title?: string;
          treatment_course?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_clinical_cases_case_template_id_fkey";
            columns: ["case_template_id"];
            isOneToOne: false;
            referencedRelation: "oph_case_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_clinical_cases_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_device_uses: {
        Row: {
          clinical_notes_en: string | null;
          clinical_notes_es: string | null;
          created_at: string;
          device_id: string;
          id: string;
          is_active: boolean;
          pathology_id: string | null;
          protocol_id: string | null;
          status: Database["public"]["Enums"]["oph_content_status"];
          updated_at: string;
          use_case_en: string;
          use_case_es: string | null;
        };
        Insert: {
          clinical_notes_en?: string | null;
          clinical_notes_es?: string | null;
          created_at?: string;
          device_id: string;
          id?: string;
          is_active?: boolean;
          pathology_id?: string | null;
          protocol_id?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          updated_at?: string;
          use_case_en: string;
          use_case_es?: string | null;
        };
        Update: {
          clinical_notes_en?: string | null;
          clinical_notes_es?: string | null;
          created_at?: string;
          device_id?: string;
          id?: string;
          is_active?: boolean;
          pathology_id?: string | null;
          protocol_id?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          updated_at?: string;
          use_case_en?: string;
          use_case_es?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oph_device_uses_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "oph_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_device_uses_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_device_uses_protocol_id_fkey";
            columns: ["protocol_id"];
            isOneToOne: false;
            referencedRelation: "oph_protocols";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_devices: {
        Row: {
          created_at: string;
          description_en: string | null;
          description_es: string | null;
          device_category: Database["public"]["Enums"]["oph_device_category"];
          id: string;
          indications_en: string | null;
          indications_es: string | null;
          intended_use_en: string | null;
          intended_use_es: string | null;
          is_active: boolean;
          kol_validator_id: string | null;
          limitations_en: string | null;
          limitations_es: string | null;
          manufacturer: string | null;
          metadata: Json;
          name: string;
          next_review_at: string | null;
          references_json: Json;
          regulatory_status: string | null;
          related_pathology_ids: string[];
          reviewed_at: string | null;
          reviewed_by: string | null;
          safety_notes_en: string | null;
          safety_notes_es: string | null;
          status: Database["public"]["Enums"]["oph_content_status"];
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"] | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          device_category: Database["public"]["Enums"]["oph_device_category"];
          id?: string;
          indications_en?: string | null;
          indications_es?: string | null;
          intended_use_en?: string | null;
          intended_use_es?: string | null;
          is_active?: boolean;
          kol_validator_id?: string | null;
          limitations_en?: string | null;
          limitations_es?: string | null;
          manufacturer?: string | null;
          metadata?: Json;
          name: string;
          next_review_at?: string | null;
          references_json?: Json;
          regulatory_status?: string | null;
          related_pathology_ids?: string[];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          safety_notes_en?: string | null;
          safety_notes_es?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"] | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          device_category?: Database["public"]["Enums"]["oph_device_category"];
          id?: string;
          indications_en?: string | null;
          indications_es?: string | null;
          intended_use_en?: string | null;
          intended_use_es?: string | null;
          is_active?: boolean;
          kol_validator_id?: string | null;
          limitations_en?: string | null;
          limitations_es?: string | null;
          manufacturer?: string | null;
          metadata?: Json;
          name?: string;
          next_review_at?: string | null;
          references_json?: Json;
          regulatory_status?: string | null;
          related_pathology_ids?: string[];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          safety_notes_en?: string | null;
          safety_notes_es?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      oph_guidelines: {
        Row: {
          citation: string | null;
          copyright_notes: string | null;
          country_region: string | null;
          created_at: string;
          doi: string | null;
          id: string;
          is_active: boolean;
          key_recommendations_en: string | null;
          key_recommendations_es: string | null;
          metadata: Json;
          next_review_at: string | null;
          notes_on_use: string | null;
          organization: string;
          pathology_id: string | null;
          publication_year: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source_type: Database["public"]["Enums"]["oph_guideline_source_type"];
          status: Database["public"]["Enums"]["oph_content_status"];
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"] | null;
          summary_en: string | null;
          summary_es: string | null;
          title: string;
          updated_at: string;
          url: string | null;
          version: string | null;
        };
        Insert: {
          citation?: string | null;
          copyright_notes?: string | null;
          country_region?: string | null;
          created_at?: string;
          doi?: string | null;
          id?: string;
          is_active?: boolean;
          key_recommendations_en?: string | null;
          key_recommendations_es?: string | null;
          metadata?: Json;
          next_review_at?: string | null;
          notes_on_use?: string | null;
          organization: string;
          pathology_id?: string | null;
          publication_year?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_type: Database["public"]["Enums"]["oph_guideline_source_type"];
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"] | null;
          summary_en?: string | null;
          summary_es?: string | null;
          title: string;
          updated_at?: string;
          url?: string | null;
          version?: string | null;
        };
        Update: {
          citation?: string | null;
          copyright_notes?: string | null;
          country_region?: string | null;
          created_at?: string;
          doi?: string | null;
          id?: string;
          is_active?: boolean;
          key_recommendations_en?: string | null;
          key_recommendations_es?: string | null;
          metadata?: Json;
          next_review_at?: string | null;
          notes_on_use?: string | null;
          organization?: string;
          pathology_id?: string | null;
          publication_year?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_type?: Database["public"]["Enums"]["oph_guideline_source_type"];
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"] | null;
          summary_en?: string | null;
          summary_es?: string | null;
          title?: string;
          updated_at?: string;
          url?: string | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oph_guidelines_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_medication_indications: {
        Row: {
          created_at: string;
          evidence_level: Database["public"]["Enums"]["oph_evidence_level"] | null;
          id: string;
          indication_en: string;
          indication_es: string | null;
          is_active: boolean;
          line_of_therapy: string | null;
          medication_id: string;
          notes_en: string | null;
          notes_es: string | null;
          pathology_id: string | null;
          references_json: Json;
          status: Database["public"]["Enums"]["oph_content_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          evidence_level?: Database["public"]["Enums"]["oph_evidence_level"] | null;
          id?: string;
          indication_en: string;
          indication_es?: string | null;
          is_active?: boolean;
          line_of_therapy?: string | null;
          medication_id: string;
          notes_en?: string | null;
          notes_es?: string | null;
          pathology_id?: string | null;
          references_json?: Json;
          status?: Database["public"]["Enums"]["oph_content_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          evidence_level?: Database["public"]["Enums"]["oph_evidence_level"] | null;
          id?: string;
          indication_en?: string;
          indication_es?: string | null;
          is_active?: boolean;
          line_of_therapy?: string | null;
          medication_id?: string;
          notes_en?: string | null;
          notes_es?: string | null;
          pathology_id?: string | null;
          references_json?: Json;
          status?: Database["public"]["Enums"]["oph_content_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_medication_indications_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "oph_medications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_medication_indications_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_medications: {
        Row: {
          adverse_effects_en: string | null;
          adverse_effects_es: string | null;
          brand_names: string[];
          common_uses_en: string | null;
          common_uses_es: string | null;
          contraindications_en: string | null;
          contraindications_es: string | null;
          created_at: string;
          generic_name_en: string;
          generic_name_es: string | null;
          id: string;
          is_active: boolean;
          is_intravitreal: boolean | null;
          is_prescription: boolean | null;
          is_surgical_adjuvant: boolean | null;
          kol_validator_id: string | null;
          mechanism_en: string | null;
          mechanism_es: string | null;
          medication_class: Database["public"]["Enums"]["oph_medication_class"];
          metadata: Json;
          monitoring_en: string | null;
          monitoring_es: string | null;
          next_review_at: string | null;
          pregnancy_lactation_notes: string | null;
          references_json: Json;
          regulatory_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          route: Database["public"]["Enums"]["oph_medication_route"];
          status: Database["public"]["Enums"]["oph_content_status"];
          updated_at: string;
          warnings_en: string | null;
          warnings_es: string | null;
        };
        Insert: {
          adverse_effects_en?: string | null;
          adverse_effects_es?: string | null;
          brand_names?: string[];
          common_uses_en?: string | null;
          common_uses_es?: string | null;
          contraindications_en?: string | null;
          contraindications_es?: string | null;
          created_at?: string;
          generic_name_en: string;
          generic_name_es?: string | null;
          id?: string;
          is_active?: boolean;
          is_intravitreal?: boolean | null;
          is_prescription?: boolean | null;
          is_surgical_adjuvant?: boolean | null;
          kol_validator_id?: string | null;
          mechanism_en?: string | null;
          mechanism_es?: string | null;
          medication_class: Database["public"]["Enums"]["oph_medication_class"];
          metadata?: Json;
          monitoring_en?: string | null;
          monitoring_es?: string | null;
          next_review_at?: string | null;
          pregnancy_lactation_notes?: string | null;
          references_json?: Json;
          regulatory_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          route: Database["public"]["Enums"]["oph_medication_route"];
          status?: Database["public"]["Enums"]["oph_content_status"];
          updated_at?: string;
          warnings_en?: string | null;
          warnings_es?: string | null;
        };
        Update: {
          adverse_effects_en?: string | null;
          adverse_effects_es?: string | null;
          brand_names?: string[];
          common_uses_en?: string | null;
          common_uses_es?: string | null;
          contraindications_en?: string | null;
          contraindications_es?: string | null;
          created_at?: string;
          generic_name_en?: string;
          generic_name_es?: string | null;
          id?: string;
          is_active?: boolean;
          is_intravitreal?: boolean | null;
          is_prescription?: boolean | null;
          is_surgical_adjuvant?: boolean | null;
          kol_validator_id?: string | null;
          mechanism_en?: string | null;
          mechanism_es?: string | null;
          medication_class?: Database["public"]["Enums"]["oph_medication_class"];
          metadata?: Json;
          monitoring_en?: string | null;
          monitoring_es?: string | null;
          next_review_at?: string | null;
          pregnancy_lactation_notes?: string | null;
          references_json?: Json;
          regulatory_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          route?: Database["public"]["Enums"]["oph_medication_route"];
          status?: Database["public"]["Enums"]["oph_content_status"];
          updated_at?: string;
          warnings_en?: string | null;
          warnings_es?: string | null;
        };
        Relationships: [];
      };
      oph_pathologies: {
        Row: {
          anatomical_site_id: string | null;
          clinical_features_en: string | null;
          clinical_features_es: string | null;
          created_at: string;
          definition_en: string | null;
          definition_es: string | null;
          diagnostic_workup_en: string | null;
          diagnostic_workup_es: string | null;
          differential_diagnosis_en: string | null;
          differential_diagnosis_es: string | null;
          epidemiology_en: string | null;
          epidemiology_es: string | null;
          evidence_level: Database["public"]["Enums"]["oph_evidence_level"] | null;
          follow_up_en: string | null;
          follow_up_es: string | null;
          icd10_codes: string[];
          id: string;
          is_active: boolean;
          kol_validator_id: string | null;
          metadata: Json;
          name_en: string;
          name_es: string;
          next_review_at: string | null;
          red_flags_en: string | null;
          red_flags_es: string | null;
          references_json: Json;
          reviewed_at: string | null;
          reviewed_by: string | null;
          risk_factors_en: string | null;
          risk_factors_es: string | null;
          slug: string;
          snomed_codes: string[];
          source_summary: string | null;
          status: Database["public"]["Enums"]["oph_content_status"];
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          synonyms_en: string[];
          synonyms_es: string[];
          treatment_overview_en: string | null;
          treatment_overview_es: string | null;
          updated_at: string;
        };
        Insert: {
          anatomical_site_id?: string | null;
          clinical_features_en?: string | null;
          clinical_features_es?: string | null;
          created_at?: string;
          definition_en?: string | null;
          definition_es?: string | null;
          diagnostic_workup_en?: string | null;
          diagnostic_workup_es?: string | null;
          differential_diagnosis_en?: string | null;
          differential_diagnosis_es?: string | null;
          epidemiology_en?: string | null;
          epidemiology_es?: string | null;
          evidence_level?: Database["public"]["Enums"]["oph_evidence_level"] | null;
          follow_up_en?: string | null;
          follow_up_es?: string | null;
          icd10_codes?: string[];
          id?: string;
          is_active?: boolean;
          kol_validator_id?: string | null;
          metadata?: Json;
          name_en: string;
          name_es: string;
          next_review_at?: string | null;
          red_flags_en?: string | null;
          red_flags_es?: string | null;
          references_json?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_factors_en?: string | null;
          risk_factors_es?: string | null;
          slug: string;
          snomed_codes?: string[];
          source_summary?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          synonyms_en?: string[];
          synonyms_es?: string[];
          treatment_overview_en?: string | null;
          treatment_overview_es?: string | null;
          updated_at?: string;
        };
        Update: {
          anatomical_site_id?: string | null;
          clinical_features_en?: string | null;
          clinical_features_es?: string | null;
          created_at?: string;
          definition_en?: string | null;
          definition_es?: string | null;
          diagnostic_workup_en?: string | null;
          diagnostic_workup_es?: string | null;
          differential_diagnosis_en?: string | null;
          differential_diagnosis_es?: string | null;
          epidemiology_en?: string | null;
          epidemiology_es?: string | null;
          evidence_level?: Database["public"]["Enums"]["oph_evidence_level"] | null;
          follow_up_en?: string | null;
          follow_up_es?: string | null;
          icd10_codes?: string[];
          id?: string;
          is_active?: boolean;
          kol_validator_id?: string | null;
          metadata?: Json;
          name_en?: string;
          name_es?: string;
          next_review_at?: string | null;
          red_flags_en?: string | null;
          red_flags_es?: string | null;
          references_json?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_factors_en?: string | null;
          risk_factors_es?: string | null;
          slug?: string;
          snomed_codes?: string[];
          source_summary?: string | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"];
          synonyms_en?: string[];
          synonyms_es?: string[];
          treatment_overview_en?: string | null;
          treatment_overview_es?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_pathologies_anatomical_site_id_fkey";
            columns: ["anatomical_site_id"];
            isOneToOne: false;
            referencedRelation: "oph_anatomical_sites";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_pathology_classifications: {
        Row: {
          classification_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          pathology_id: string;
        };
        Insert: {
          classification_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          pathology_id: string;
        };
        Update: {
          classification_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          pathology_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_pathology_classifications_classification_id_fkey";
            columns: ["classification_id"];
            isOneToOne: false;
            referencedRelation: "oph_classifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_pathology_classifications_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_pathology_devices: {
        Row: {
          created_at: string;
          device_id: string;
          id: string;
          pathology_id: string;
          use_context: string | null;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          id?: string;
          pathology_id: string;
          use_context?: string | null;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          id?: string;
          pathology_id?: string;
          use_context?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oph_pathology_devices_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "oph_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_pathology_devices_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_pathology_guidelines: {
        Row: {
          created_at: string;
          guideline_id: string;
          id: string;
          notes: string | null;
          pathology_id: string;
        };
        Insert: {
          created_at?: string;
          guideline_id: string;
          id?: string;
          notes?: string | null;
          pathology_id: string;
        };
        Update: {
          created_at?: string;
          guideline_id?: string;
          id?: string;
          notes?: string | null;
          pathology_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_pathology_guidelines_guideline_id_fkey";
            columns: ["guideline_id"];
            isOneToOne: false;
            referencedRelation: "oph_guidelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_pathology_guidelines_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_pathology_protocols: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          pathology_id: string;
          protocol_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          pathology_id: string;
          protocol_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          pathology_id?: string;
          protocol_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_pathology_protocols_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_pathology_protocols_protocol_id_fkey";
            columns: ["protocol_id"];
            isOneToOne: false;
            referencedRelation: "oph_protocols";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_protocol_steps: {
        Row: {
          created_at: string;
          decision_point: boolean;
          id: string;
          metadata: Json;
          protocol_id: string;
          step_body_en: string;
          step_body_es: string | null;
          step_order: number;
          step_title_en: string | null;
          step_title_es: string | null;
          updated_at: string;
          warning_level: string | null;
        };
        Insert: {
          created_at?: string;
          decision_point?: boolean;
          id?: string;
          metadata?: Json;
          protocol_id: string;
          step_body_en: string;
          step_body_es?: string | null;
          step_order: number;
          step_title_en?: string | null;
          step_title_es?: string | null;
          updated_at?: string;
          warning_level?: string | null;
        };
        Update: {
          created_at?: string;
          decision_point?: boolean;
          id?: string;
          metadata?: Json;
          protocol_id?: string;
          step_body_en?: string;
          step_body_es?: string | null;
          step_order?: number;
          step_title_en?: string | null;
          step_title_es?: string | null;
          updated_at?: string;
          warning_level?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oph_protocol_steps_protocol_id_fkey";
            columns: ["protocol_id"];
            isOneToOne: false;
            referencedRelation: "oph_protocols";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_protocols: {
        Row: {
          clinical_setting: string | null;
          created_at: string;
          escalation_criteria_en: string | null;
          escalation_criteria_es: string | null;
          evidence_level: Database["public"]["Enums"]["oph_evidence_level"] | null;
          exclusion_criteria_en: string | null;
          exclusion_criteria_es: string | null;
          follow_up_en: string | null;
          follow_up_es: string | null;
          id: string;
          inclusion_criteria_en: string | null;
          inclusion_criteria_es: string | null;
          investigations_en: string | null;
          investigations_es: string | null;
          is_active: boolean;
          kol_validator_id: string | null;
          metadata: Json;
          next_review_at: string | null;
          objective_en: string | null;
          objective_es: string | null;
          pathology_id: string | null;
          patient_safety_notes_en: string | null;
          patient_safety_notes_es: string | null;
          protocol_type: Database["public"]["Enums"]["oph_protocol_type"];
          red_flags_en: string | null;
          red_flags_es: string | null;
          references_json: Json;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          status: Database["public"]["Enums"]["oph_content_status"];
          step_by_step_en: string | null;
          step_by_step_es: string | null;
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          target_audience: string | null;
          title_en: string;
          title_es: string;
          treatment_algorithm_en: string | null;
          treatment_algorithm_es: string | null;
          updated_at: string;
        };
        Insert: {
          clinical_setting?: string | null;
          created_at?: string;
          escalation_criteria_en?: string | null;
          escalation_criteria_es?: string | null;
          evidence_level?: Database["public"]["Enums"]["oph_evidence_level"] | null;
          exclusion_criteria_en?: string | null;
          exclusion_criteria_es?: string | null;
          follow_up_en?: string | null;
          follow_up_es?: string | null;
          id?: string;
          inclusion_criteria_en?: string | null;
          inclusion_criteria_es?: string | null;
          investigations_en?: string | null;
          investigations_es?: string | null;
          is_active?: boolean;
          kol_validator_id?: string | null;
          metadata?: Json;
          next_review_at?: string | null;
          objective_en?: string | null;
          objective_es?: string | null;
          pathology_id?: string | null;
          patient_safety_notes_en?: string | null;
          patient_safety_notes_es?: string | null;
          protocol_type: Database["public"]["Enums"]["oph_protocol_type"];
          red_flags_en?: string | null;
          red_flags_es?: string | null;
          references_json?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["oph_content_status"];
          step_by_step_en?: string | null;
          step_by_step_es?: string | null;
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"];
          target_audience?: string | null;
          title_en: string;
          title_es: string;
          treatment_algorithm_en?: string | null;
          treatment_algorithm_es?: string | null;
          updated_at?: string;
        };
        Update: {
          clinical_setting?: string | null;
          created_at?: string;
          escalation_criteria_en?: string | null;
          escalation_criteria_es?: string | null;
          evidence_level?: Database["public"]["Enums"]["oph_evidence_level"] | null;
          exclusion_criteria_en?: string | null;
          exclusion_criteria_es?: string | null;
          follow_up_en?: string | null;
          follow_up_es?: string | null;
          id?: string;
          inclusion_criteria_en?: string | null;
          inclusion_criteria_es?: string | null;
          investigations_en?: string | null;
          investigations_es?: string | null;
          is_active?: boolean;
          kol_validator_id?: string | null;
          metadata?: Json;
          next_review_at?: string | null;
          objective_en?: string | null;
          objective_es?: string | null;
          pathology_id?: string | null;
          patient_safety_notes_en?: string | null;
          patient_safety_notes_es?: string | null;
          protocol_type?: Database["public"]["Enums"]["oph_protocol_type"];
          red_flags_en?: string | null;
          red_flags_es?: string | null;
          references_json?: Json;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["oph_content_status"];
          step_by_step_en?: string | null;
          step_by_step_es?: string | null;
          subspecialty?: Database["public"]["Enums"]["oph_subspecialty"];
          target_audience?: string | null;
          title_en?: string;
          title_es?: string;
          treatment_algorithm_en?: string | null;
          treatment_algorithm_es?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_protocols_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_reference_links: {
        Row: {
          created_at: string;
          device_id: string | null;
          guideline_id: string | null;
          id: string;
          medication_id: string | null;
          notes: string | null;
          pathology_id: string | null;
          protocol_id: string | null;
          reference_id: string;
          relationship_type: string;
        };
        Insert: {
          created_at?: string;
          device_id?: string | null;
          guideline_id?: string | null;
          id?: string;
          medication_id?: string | null;
          notes?: string | null;
          pathology_id?: string | null;
          protocol_id?: string | null;
          reference_id: string;
          relationship_type?: string;
        };
        Update: {
          created_at?: string;
          device_id?: string | null;
          guideline_id?: string | null;
          id?: string;
          medication_id?: string | null;
          notes?: string | null;
          pathology_id?: string | null;
          protocol_id?: string | null;
          reference_id?: string;
          relationship_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oph_reference_links_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "oph_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_reference_links_guideline_id_fkey";
            columns: ["guideline_id"];
            isOneToOne: false;
            referencedRelation: "oph_guidelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_reference_links_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "oph_medications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_reference_links_pathology_id_fkey";
            columns: ["pathology_id"];
            isOneToOne: false;
            referencedRelation: "oph_pathologies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_reference_links_protocol_id_fkey";
            columns: ["protocol_id"];
            isOneToOne: false;
            referencedRelation: "oph_protocols";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oph_reference_links_reference_id_fkey";
            columns: ["reference_id"];
            isOneToOne: false;
            referencedRelation: "oph_references";
            referencedColumns: ["id"];
          },
        ];
      };
      oph_references: {
        Row: {
          abstract_summary_en: string | null;
          abstract_summary_es: string | null;
          authors: string | null;
          copyright_notes: string | null;
          created_at: string;
          doi: string | null;
          id: string;
          is_active: boolean;
          journal_or_source: string | null;
          metadata: Json;
          pmid: string | null;
          publication_year: number | null;
          source_type: Database["public"]["Enums"]["oph_guideline_source_type"] | null;
          status: Database["public"]["Enums"]["oph_content_status"];
          title: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          abstract_summary_en?: string | null;
          abstract_summary_es?: string | null;
          authors?: string | null;
          copyright_notes?: string | null;
          created_at?: string;
          doi?: string | null;
          id?: string;
          is_active?: boolean;
          journal_or_source?: string | null;
          metadata?: Json;
          pmid?: string | null;
          publication_year?: number | null;
          source_type?: Database["public"]["Enums"]["oph_guideline_source_type"] | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          title: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          abstract_summary_en?: string | null;
          abstract_summary_es?: string | null;
          authors?: string | null;
          copyright_notes?: string | null;
          created_at?: string;
          doi?: string | null;
          id?: string;
          is_active?: boolean;
          journal_or_source?: string | null;
          metadata?: Json;
          pmid?: string | null;
          publication_year?: number | null;
          source_type?: Database["public"]["Enums"]["oph_guideline_source_type"] | null;
          status?: Database["public"]["Enums"]["oph_content_status"];
          title?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      oph_subspecialties: {
        Row: {
          code: Database["public"]["Enums"]["oph_subspecialty"];
          created_at: string;
          description_en: string | null;
          description_es: string | null;
          id: string;
          is_active: boolean;
          name_en: string;
          name_es: string;
          sort_order: number | null;
          updated_at: string;
        };
        Insert: {
          code: Database["public"]["Enums"]["oph_subspecialty"];
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          id?: string;
          is_active?: boolean;
          name_en: string;
          name_es: string;
          sort_order?: number | null;
          updated_at?: string;
        };
        Update: {
          code?: Database["public"]["Enums"]["oph_subspecialty"];
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          id?: string;
          is_active?: boolean;
          name_en?: string;
          name_es?: string;
          sort_order?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      or_ai_user_roles: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["or_ai_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          role: Database["public"]["Enums"]["or_ai_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["or_ai_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      oph_kb_by_subspecialty: {
        Row: {
          case_templates: number | null;
          classifications: number | null;
          devices: number | null;
          guidelines: number | null;
          name_en: string | null;
          name_es: string | null;
          pathologies: number | null;
          protocols: number | null;
          subspecialty: Database["public"]["Enums"]["oph_subspecialty"] | null;
        };
        Relationships: [];
      };
      oph_kb_dashboard_metrics: {
        Row: {
          approved_medications: number | null;
          approved_pathologies: number | null;
          cases_missing_anonymisation: number | null;
          total_case_templates: number | null;
          total_classifications: number | null;
          total_devices: number | null;
          total_guidelines: number | null;
          total_medications: number | null;
          total_pathologies: number | null;
          total_protocols: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      approve_and_activate_source: {
        Args: { p_comment?: string; p_source_id: string };
        Returns: {
          actor_role: string | null;
          actor_user_id: string | null;
          comment: string | null;
          created_at: string;
          decision: string;
          id: string;
          metadata: Json;
          new_is_active: boolean | null;
          new_status: string | null;
          prev_is_active: boolean | null;
          prev_status: string | null;
          source_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "ai_source_audit";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      claim_admin_if_empty: {
        Args: never;
        Returns: {
          is_active: boolean;
          role: Database["public"]["Enums"]["or_ai_role"];
        }[];
      };
      get_my_roles: {
        Args: never;
        Returns: {
          role: Database["public"]["Enums"]["or_ai_role"];
        }[];
      };
      log_source_decision: {
        Args: {
          p_comment?: string;
          p_decision: string;
          p_new_active?: boolean;
          p_new_status?: string;
          p_source_id: string;
        };
        Returns: {
          actor_role: string | null;
          actor_user_id: string | null;
          comment: string | null;
          created_at: string;
          decision: string;
          id: string;
          metadata: Json;
          new_is_active: boolean | null;
          new_status: string | null;
          prev_is_active: boolean | null;
          prev_status: string | null;
          source_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "ai_source_audit";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      match_ai_chunks: {
        Args: {
          filter_language?: string;
          filter_subspecialty?: string;
          match_count?: number;
          query_embedding: string;
        };
        Returns: {
          chunk_id: string;
          content: string;
          similarity: number;
          source_author: string;
          source_id: string;
          source_language: string;
          source_subspecialty: string;
          source_title: string;
          source_type: string;
          source_year: number;
          validation_level: string;
        }[];
      };
      oph_mark_kol_verified: {
        Args: { p_id: string; p_table: string };
        Returns: undefined;
      };
      oph_set_status: {
        Args: {
          p_id: string;
          p_status: Database["public"]["Enums"]["oph_content_status"];
          p_table: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      oph_content_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "needs_update"
        | "rejected"
        | "archived";
      oph_device_category:
        | "diagnostic"
        | "imaging"
        | "laser"
        | "surgical"
        | "implant"
        | "therapeutic"
        | "monitoring"
        | "optical"
        | "software_ai"
        | "simulation_training"
        | "instrumentation"
        | "other";
      oph_evidence_level:
        | "guideline"
        | "systematic_review"
        | "randomized_trial"
        | "prospective_study"
        | "retrospective_study"
        | "case_series"
        | "case_report"
        | "expert_consensus"
        | "expert_opinion"
        | "educational_reference"
        | "not_applicable"
        | "consensus_statement"
        | "classification_criteria"
        | "clinical_guideline"
        | "regulatory_document";
      oph_guideline_source_type:
        | "clinical_guideline"
        | "preferred_practice_pattern"
        | "consensus_statement"
        | "classification_criteria"
        | "society_recommendation"
        | "regulatory_document"
        | "textbook_reference"
        | "other";
      oph_medication_class:
        | "anti_vegf"
        | "corticosteroid"
        | "antibiotic"
        | "antiviral"
        | "antifungal"
        | "anti_inflammatory_nsaid"
        | "immunomodulator"
        | "immunosuppressant"
        | "glaucoma_prostaglandin"
        | "glaucoma_beta_blocker"
        | "glaucoma_alpha_agonist"
        | "glaucoma_carbonic_anhydrase_inhibitor"
        | "glaucoma_rho_kinase_inhibitor"
        | "glaucoma_miotic"
        | "mydriatic_cycloplegic"
        | "lubricant_artificial_tear"
        | "osmotic_agent"
        | "diagnostic_dye"
        | "local_anesthetic"
        | "anti_allergic"
        | "anti_fibrotic"
        | "other";
      oph_medication_route:
        | "topical"
        | "intravitreal"
        | "subconjunctival"
        | "subtenon"
        | "intracameral"
        | "periocular"
        | "oral"
        | "intravenous"
        | "implant"
        | "other";
      oph_protocol_type:
        | "diagnostic"
        | "therapeutic"
        | "surgical"
        | "follow_up"
        | "emergency"
        | "screening"
        | "perioperative"
        | "patient_selection"
        | "complication_management"
        | "educational";
      oph_subspecialty:
        | "retina"
        | "glaucoma"
        | "cornea"
        | "ocular_surface"
        | "cataract"
        | "refractive"
        | "uveitis"
        | "oculoplastics"
        | "neuro_ophthalmology"
        | "pediatric_ophthalmology"
        | "strabismus"
        | "contactology"
        | "low_vision"
        | "ocular_oncology"
        | "ocular_trauma"
        | "emergency_ophthalmology"
        | "general_ophthalmology";
      or_ai_role: "admin" | "medical_editor" | "kol" | "verified_doctor" | "industry_user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      oph_content_status: [
        "draft",
        "pending_review",
        "approved",
        "needs_update",
        "rejected",
        "archived",
      ],
      oph_device_category: [
        "diagnostic",
        "imaging",
        "laser",
        "surgical",
        "implant",
        "therapeutic",
        "monitoring",
        "optical",
        "software_ai",
        "simulation_training",
        "instrumentation",
        "other",
      ],
      oph_evidence_level: [
        "guideline",
        "systematic_review",
        "randomized_trial",
        "prospective_study",
        "retrospective_study",
        "case_series",
        "case_report",
        "expert_consensus",
        "expert_opinion",
        "educational_reference",
        "not_applicable",
        "consensus_statement",
        "classification_criteria",
        "clinical_guideline",
        "regulatory_document",
      ],
      oph_guideline_source_type: [
        "clinical_guideline",
        "preferred_practice_pattern",
        "consensus_statement",
        "classification_criteria",
        "society_recommendation",
        "regulatory_document",
        "textbook_reference",
        "other",
      ],
      oph_medication_class: [
        "anti_vegf",
        "corticosteroid",
        "antibiotic",
        "antiviral",
        "antifungal",
        "anti_inflammatory_nsaid",
        "immunomodulator",
        "immunosuppressant",
        "glaucoma_prostaglandin",
        "glaucoma_beta_blocker",
        "glaucoma_alpha_agonist",
        "glaucoma_carbonic_anhydrase_inhibitor",
        "glaucoma_rho_kinase_inhibitor",
        "glaucoma_miotic",
        "mydriatic_cycloplegic",
        "lubricant_artificial_tear",
        "osmotic_agent",
        "diagnostic_dye",
        "local_anesthetic",
        "anti_allergic",
        "anti_fibrotic",
        "other",
      ],
      oph_medication_route: [
        "topical",
        "intravitreal",
        "subconjunctival",
        "subtenon",
        "intracameral",
        "periocular",
        "oral",
        "intravenous",
        "implant",
        "other",
      ],
      oph_protocol_type: [
        "diagnostic",
        "therapeutic",
        "surgical",
        "follow_up",
        "emergency",
        "screening",
        "perioperative",
        "patient_selection",
        "complication_management",
        "educational",
      ],
      oph_subspecialty: [
        "retina",
        "glaucoma",
        "cornea",
        "ocular_surface",
        "cataract",
        "refractive",
        "uveitis",
        "oculoplastics",
        "neuro_ophthalmology",
        "pediatric_ophthalmology",
        "strabismus",
        "contactology",
        "low_vision",
        "ocular_oncology",
        "ocular_trauma",
        "emergency_ophthalmology",
        "general_ophthalmology",
      ],
      or_ai_role: ["admin", "medical_editor", "kol", "verified_doctor", "industry_user"],
    },
  },
} as const;
