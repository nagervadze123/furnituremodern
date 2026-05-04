// Hand-written Supabase Database types for the tables this app
// touches. Lightweight alternative to running `supabase gen types`
// — generate proper types from your schema once you have a project
// connected, and replace this file.
//
// Why this exists: without a Database generic, Supabase infers
// `Insert<>`, `Update<>` and `Upsert<>` as `never`, which makes
// every write produce a TypeScript error.

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          name_ka: string;
          name_en: string;
          description_ka: string;
          description_en: string;
          intro_ka: string;
          intro_en: string;
          is_featured_in_nav: boolean;
          is_deleted: boolean;
          deleted_at: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_ka: string;
          name_en: string;
          description_ka?: string;
          description_en?: string;
          intro_ka?: string;
          intro_en?: string;
          is_featured_in_nav?: boolean;
          is_deleted?: boolean;
          deleted_at?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      category_slug_history: {
        Row: {
          id: string;
          category_id: string;
          old_slug: string;
          changed_at: string;
          changed_by: string | null;
        };
        Insert: {
          id?: string;
          category_id: string;
          old_slug: string;
          changed_at?: string;
          changed_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["category_slug_history"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "category_slug_history_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          category_id: string;
          name_ka: string;
          name_en: string;
          description_ka: string;
          description_en: string;
          price: number;
          currency: string;
          is_featured: boolean;
          is_published: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          category_id: string;
          name_ka: string;
          name_en: string;
          description_ka?: string;
          description_en?: string;
          price: number;
          currency?: string;
          is_featured?: boolean;
          is_published?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          storage_path: string;
          alt_ka: string;
          alt_en: string;
          sort_order: number;
          is_primary: boolean;
          // Phase 5 Task 4: stock-photo attribution columns. NULL on
          // operator-uploaded real product photos; populated on
          // stock placeholders sourced from Unsplash / Pexels.
          source: "unsplash" | "pexels" | null;
          source_url: string | null;
          photographer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          storage_path: string;
          alt_ka?: string;
          alt_en?: string;
          sort_order?: number;
          is_primary?: boolean;
          source?: "unsplash" | "pexels" | null;
          source_url?: string | null;
          photographer?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_images"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      product_slug_history: {
        Row: {
          id: string;
          product_id: string;
          old_slug: string;
          changed_at: string;
          changed_by: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          old_slug: string;
          changed_at?: string;
          changed_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_slug_history"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "product_slug_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      not_found_log: {
        Row: {
          id: string;
          path: string;
          locale: string | null;
          referrer: string | null;
          ip_hash: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          path: string;
          locale?: string | null;
          referrer?: string | null;
          ip_hash?: string | null;
          occurred_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["not_found_log"]["Insert"]
        >;
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          user_id: string;
          role: "admin" | "editor";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: "admin" | "editor";
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["admin_users"]["Insert"]
        >;
        Relationships: [];
      };
      redirects: {
        Row: {
          id: string;
          from_path: string;
          to_path: string;
          status_code: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_path: string;
          to_path: string;
          status_code?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["redirects"]["Insert"]>;
        Relationships: [];
      };
      analytics_event: {
        Row: {
          id: string;
          event: string;
          path: string;
          locale: string | null;
          referrer: string | null;
          ip_hash: string | null;
          user_agent: string | null;
          props: Record<string, unknown>;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          event: string;
          path: string;
          locale?: string | null;
          referrer?: string | null;
          ip_hash?: string | null;
          user_agent?: string | null;
          props?: Record<string, unknown>;
          occurred_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["analytics_event"]["Insert"]
        >;
        Relationships: [];
      };
      web_vitals: {
        Row: {
          id: string;
          metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB";
          value: number;
          rating: "good" | "needs-improvement" | "poor";
          path: string;
          locale: string | null;
          navigation_type: string | null;
          ip_hash: string | null;
          user_agent: string | null;
          device_type: "mobile" | "tablet" | "desktop" | null;
          effective_connection_type: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB";
          value: number;
          rating: "good" | "needs-improvement" | "poor";
          path: string;
          locale?: string | null;
          navigation_type?: string | null;
          ip_hash?: string | null;
          user_agent?: string | null;
          device_type?: "mobile" | "tablet" | "desktop" | null;
          effective_connection_type?: string | null;
          occurred_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["web_vitals"]["Insert"]
        >;
        Relationships: [];
      };
      csp_violations: {
        Row: {
          id: string;
          disposition: "enforce" | "report";
          document_uri: string;
          referrer: string | null;
          violated_directive: string;
          effective_directive: string | null;
          original_policy: string | null;
          blocked_uri: string | null;
          source_file: string | null;
          line_number: number | null;
          column_number: number | null;
          script_sample: string | null;
          status_code: number | null;
          ip_hash: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          disposition: "enforce" | "report";
          document_uri: string;
          referrer?: string | null;
          violated_directive: string;
          effective_directive?: string | null;
          original_policy?: string | null;
          blocked_uri?: string | null;
          source_file?: string | null;
          line_number?: number | null;
          column_number?: number | null;
          script_sample?: string | null;
          status_code?: number | null;
          ip_hash?: string | null;
          occurred_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["csp_violations"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      // Admin RUM tile aggregate. Read-only — Supabase exposes views
      // only in the Row map. SECURITY INVOKER + admin-only RLS on
      // web_vitals means non-admin clients see zero rows.
      web_vitals_p75_7d: {
        Row: {
          metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB";
          p75: number;
          samples: number;
          last_occurred_at: string;
        };
        Relationships: [];
      };
    };
    // is_admin() lives in the `private` schema (not exposed via the
    // Data API) and is invoked from RLS policies only — so it does
    // not appear in the public Functions map.
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
