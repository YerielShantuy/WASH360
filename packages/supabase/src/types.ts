// Generated placeholder — run `supabase gen types typescript` to regenerate from live DB.
// Must satisfy @supabase/postgrest-js GenericSchema shape (Tables include Relationships[]).

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          total_points: number;
          streak_count: number;
          streak_last_date: string | null;
          level: number;
          role: "user" | "venue_owner" | "council" | "admin";
          region: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          total_points?: number;
          streak_count?: number;
          streak_last_date?: string | null;
          level?: number;
          role: "user" | "venue_owner" | "council" | "admin";
          region?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };

      modules: {
        Row: {
          id: string;
          location: unknown; // PostGIS geography point
          venue_name: string;
          venue_type: string;
          installed_at: string;
          status: "online" | "offline" | "maintenance";
          last_tap_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["modules"]["Row"], "installed_at"> & {
          installed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["modules"]["Insert"]>;
        Relationships: [];
      };

      module_owners: {
        Row: {
          module_id: string;
          user_id: string;
          granted_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["module_owners"]["Row"], "granted_at"> & {
          granted_at?: string;
        };
        Update: never;
        Relationships: [];
      };

      handwash_sessions: {
        Row: {
          id: string;
          user_id: string;
          module_id: string | null;
          technique_score: number;
          coverage_score: number | null;
          total_points: number;
          session_type: "module" | "streak";
          duration_seconds: number;
          cooldown_active: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["handwash_sessions"]["Row"],
          "id" | "created_at" | "cooldown_active"
        > & { cooldown_active?: boolean };
        Update: Partial<Database["public"]["Tables"]["handwash_sessions"]["Insert"]>;
        Relationships: [];
      };

      water_quality_tests: {
        Row: {
          id: string;
          user_id: string;
          module_id: string | null;
          location: unknown;
          location_public: unknown;
          ph: number | null;
          nitrates: number | null;
          hardness: number | null;
          turbidity: number | null;
          quality_score: number;
          photo_path: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["water_quality_tests"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["water_quality_tests"]["Insert"]>;
        Relationships: [];
      };

      water_quality_checks: {
        Row: {
          id: string;
          module_id: string;
          location: unknown;
          last_checked_at: string;
          last_checked_by: string;
          quality_score: number;
        };
        Insert: Omit<Database["public"]["Tables"]["water_quality_checks"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["water_quality_checks"]["Insert"]>;
        Relationships: [];
      };

      bingo_zones: {
        Row: {
          id: string;
          name: string;
          polygon: unknown; // PostGIS geography polygon
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bingo_zones"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["bingo_zones"]["Insert"]>;
        Relationships: [];
      };

      bingo_cards: {
        Row: {
          id: string;
          user_id: string;
          zone_id: string;
          started_at: string;
          completed_at: string | null;
          cells: unknown; // JSON array of BingoCellState
          extra_submissions_count: number;
        };
        Insert: Omit<
          Database["public"]["Tables"]["bingo_cards"]["Row"],
          "id" | "started_at"
        > & { started_at?: string };
        Update: Partial<Database["public"]["Tables"]["bingo_cards"]["Insert"]>;
        Relationships: [];
      };

      bingo_submissions: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          category: string;
          photo_path: string;
          photo_hash: string;
          ml_confidence: number;
          item_count: number;
          is_extra: boolean;
          status: "pending" | "verified" | "rejected";
          points_awarded: number;
          location: unknown;
          created_at: string;
          synced_at: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["bingo_submissions"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["bingo_submissions"]["Insert"]>;
        Relationships: [];
      };

      drain_reports: {
        Row: {
          id: string;
          user_id: string;
          report_type: "flood" | "clogged_drain";
          severity: "low" | "medium" | "high";
          description: string | null;
          photo_path: string;
          location: unknown;
          status: "pending" | "acknowledged" | "resolved";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["drain_reports"]["Row"],
          "id" | "created_at" | "status"
        > & { status?: "pending" | "acknowledged" | "resolved" };
        Update: Partial<Database["public"]["Tables"]["drain_reports"]["Insert"]>;
        Relationships: [];
      };

      cleanup_events: {
        Row: {
          id: string;
          title: string;
          org_name: string;
          description: string;
          event_date: string;
          location: unknown;
          max_participants: number | null;
          created_by: string;
          status: "pending" | "approved" | "cancelled";
          banner_url: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["cleanup_events"]["Row"],
          "id" | "status" | "created_at"
        > & { status?: "pending" | "approved" | "cancelled" };
        Update: Partial<Database["public"]["Tables"]["cleanup_events"]["Insert"]>;
        Relationships: [];
      };

      event_participants: {
        Row: {
          event_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["event_participants"]["Row"],
          "joined_at"
        > & { joined_at?: string };
        Update: never;
        Relationships: [];
      };

      points_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          source: "handwash" | "bingo" | "event" | "water_test" | "report";
          reference_id: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["points_transactions"]["Row"],
          "id" | "created_at"
        >;
        Update: never;
        Relationships: [];
      };

      friendships: {
        Row: {
          user_a: string;
          user_b: string;
          status: "pending" | "accepted";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["friendships"]["Row"],
          "created_at" | "status"
        > & { status?: "pending" | "accepted" };
        Update: Partial<Pick<Database["public"]["Tables"]["friendships"]["Row"], "status">>;
        Relationships: [];
      };

      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon_url: string | null;
          condition: unknown; // JSONB
        };
        Insert: Omit<Database["public"]["Tables"]["badges"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
        Relationships: [];
      };

      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["user_badges"]["Row"],
          "earned_at"
        > & { earned_at?: string };
        Update: never;
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      check_handwash_cooldown: {
        Args: { p_user_id: string; p_module_id: string };
        Returns: boolean;
      };
      is_water_quality_due: {
        Args: { p_module_id: string };
        Returns: boolean;
      };
      award_points: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_source: "handwash" | "bingo" | "event" | "water_test" | "report";
          p_reference: string;
        };
        Returns: void;
      };
      extend_streak: {
        Args: { p_user_id: string };
        Returns: void;
      };
      get_modules_nearby: {
        Args: { lat: number; lng: number; radius_meters?: number };
        Returns: Database["public"]["Tables"]["modules"]["Row"][];
      };
      get_bingo_zones_nearby: {
        Args: { lat: number; lng: number; radius_meters?: number };
        Returns: Database["public"]["Tables"]["bingo_zones"]["Row"][];
      };
      coarsen_location: {
        Args: { pt: unknown; grid_meters?: number };
        Returns: unknown;
      };
    };

    Enums: {
      user_role: "user" | "venue_owner" | "council" | "admin";
      session_type: "module" | "streak";
      module_status: "online" | "offline" | "maintenance";
      bingo_sub_status: "pending" | "verified" | "rejected";
      event_status: "pending" | "approved" | "cancelled";
      report_type: "flood" | "clogged_drain";
      report_status: "pending" | "acknowledged" | "resolved";
      report_severity: "low" | "medium" | "high";
      friendship_status: "pending" | "accepted";
      points_source: "handwash" | "bingo" | "event" | "water_test" | "report";
    };
  };
};
