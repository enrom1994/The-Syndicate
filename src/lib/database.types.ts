// Database types generated for TON Mafia Supabase schema
// NOTE: Regenerate this file after running migrations using Supabase CLI:
// npx supabase gen types typescript --project-id giwolutowfkvkcxlcwus > src/lib/database.types.ts

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          telegram_id: number;
          username: string | null;
          first_name: string | null;
          avatar_url: string | null;
          cash: number;
          banked_cash: number;
          diamonds: number;
          respect: number;
          level: number;
          experience: number;
          energy: number;
          max_energy: number;
          last_energy_update: string;
          stamina: number;
          max_stamina: number;
          last_stamina_update: string;
          strength: number;
          defense: number;
          agility: number;
          intelligence: number;
          total_attacks: number;
          total_attacks_won: number;
          total_jobs_completed: number;
          total_kills: number;
          protection_expires_at: string | null;
          newbie_shield_expires_at: string | null;
          last_daily_claim: string | null;
          daily_streak: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          telegram_id: number;
          username?: string | null;
          first_name?: string | null;
          avatar_url?: string | null;
          cash?: number;
          banked_cash?: number;
          diamonds?: number;
          respect?: number;
          level?: number;
          experience?: number;
          energy?: number;
          max_energy?: number;
          last_energy_update?: string;
          stamina?: number;
          max_stamina?: number;
          last_stamina_update?: string;
          strength?: number;
          defense?: number;
          agility?: number;
          intelligence?: number;
          total_attacks?: number;
          total_attacks_won?: number;
          total_jobs_completed?: number;
          total_kills?: number;
          protection_expires_at?: string | null;
          newbie_shield_expires_at?: string | null;
          last_daily_claim?: string | null;
          daily_streak?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: number;
          username?: string | null;
          first_name?: string | null;
          avatar_url?: string | null;
          cash?: number;
          banked_cash?: number;
          diamonds?: number;
          respect?: number;
          level?: number;
          experience?: number;
          energy?: number;
          max_energy?: number;
          last_energy_update?: string;
          stamina?: number;
          max_stamina?: number;
          last_stamina_update?: string;
          strength?: number;
          defense?: number;
          agility?: number;
          intelligence?: number;
          total_attacks?: number;
          total_attacks_won?: number;
          total_jobs_completed?: number;
          total_kills?: number;
          protection_expires_at?: string | null;
          newbie_shield_expires_at?: string | null;
          last_daily_claim?: string | null;
          daily_streak?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_inventory: {
        Row: {
          id: string;
          player_id: string;
          item_id: string;
          quantity: number;
          is_equipped: boolean;
          acquired_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          item_id: string;
          quantity?: number;
          is_equipped?: boolean;
          acquired_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          item_id?: string;
          quantity?: number;
          is_equipped?: boolean;
          acquired_at?: string;
        };
      };
      player_crew: {
        Row: {
          id: string;
          player_id: string;
          crew_id: string;
          quantity: number;
          hired_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          crew_id: string;
          quantity?: number;
          hired_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          crew_id?: string;
          quantity?: number;
          hired_at?: string;
        };
      };
      player_businesses: {
        Row: {
          id: string;
          player_id: string;
          business_id: string;
          level: number;
          last_collected: string;
          purchased_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          business_id: string;
          level?: number;
          last_collected?: string;
          purchased_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          business_id?: string;
          level?: number;
          last_collected?: string;
          purchased_at?: string;
        };
      };
      player_achievements: {
        Row: {
          id: string;
          player_id: string;
          achievement_id: string;
          progress: number;
          is_unlocked: boolean;
          is_claimed: boolean;
          unlocked_at: string | null;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          player_id: string;
          achievement_id: string;
          progress?: number;
          is_unlocked?: boolean;
          is_claimed?: boolean;
          unlocked_at?: string | null;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          player_id?: string;
          achievement_id?: string;
          progress?: number;
          is_unlocked?: boolean;
          is_claimed?: boolean;
          unlocked_at?: string | null;
          claimed_at?: string | null;
        };
      };
      player_tasks: {
        Row: {
          id: string;
          player_id: string;
          task_id: string;
          is_completed: boolean;
          completed_at: string | null;
          last_reset: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          task_id: string;
          is_completed?: boolean;
          completed_at?: string | null;
          last_reset?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          task_id?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          last_reset?: string;
        };
      };
      player_daily_rewards: {
        Row: {
          id: string;
          player_id: string;
          current_streak: number;
          last_claim_date: string | null;
          days_claimed: number[];
          week_start_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          current_streak?: number;
          last_claim_date?: string | null;
          days_claimed?: number[];
          week_start_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          current_streak?: number;
          last_claim_date?: string | null;
          days_claimed?: number[];
          week_start_date?: string | null;
          created_at?: string;
        };
      };
      player_boosters: {
        Row: {
          id: string;
          player_id: string;
          booster_type: string;
          expires_at: string;
          activated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          booster_type: string;
          expires_at: string;
          activated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          booster_type?: string;
          expires_at?: string;
          activated_at?: string;
        };
      };
      families: {
        Row: {
          id: string;
          name: string;
          tag: string | null;
          description: string | null;
          boss_id: string | null;
          treasury: number;
          territory_count: number;
          total_respect: number;
          is_recruiting: boolean;
          min_level_required: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tag?: string | null;
          description?: string | null;
          boss_id?: string | null;
          treasury?: number;
          territory_count?: number;
          total_respect?: number;
          is_recruiting?: boolean;
          min_level_required?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tag?: string | null;
          description?: string | null;
          boss_id?: string | null;
          treasury?: number;
          territory_count?: number;
          total_respect?: number;
          is_recruiting?: boolean;
          min_level_required?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          player_id: string;
          role: string;
          contribution: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          player_id: string;
          role?: string;
          contribution?: number;
          joined_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          player_id?: string;
          role?: string;
          contribution?: number;
          joined_at?: string;
        };
      };
      item_definitions: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          rarity: string;
          attack_bonus: number;
          defense_bonus: number;
          income_bonus: number;
          respect_bonus: number;
          sell_price: number;
          buy_price: number;
          is_purchasable: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          rarity: string;
          attack_bonus?: number;
          defense_bonus?: number;
          income_bonus?: number;
          respect_bonus?: number;
          sell_price?: number;
          buy_price?: number;
          is_purchasable?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          description?: string | null;
          rarity?: string;
          attack_bonus?: number;
          defense_bonus?: number;
          income_bonus?: number;
          respect_bonus?: number;
          sell_price?: number;
          buy_price?: number;
          is_purchasable?: boolean;
          created_at?: string;
        };
      };
      crew_definitions: {
        Row: {
          id: string;
          name: string;
          type: string;
          description: string | null;
          attack_bonus: number;
          defense_bonus: number;
          special_bonus: string | null;
          hire_cost: number;
          upkeep_per_hour: number;
          max_available: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          description?: string | null;
          attack_bonus?: number;
          defense_bonus?: number;
          special_bonus?: string | null;
          hire_cost: number;
          upkeep_per_hour: number;
          max_available?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          description?: string | null;
          attack_bonus?: number;
          defense_bonus?: number;
          special_bonus?: string | null;
          hire_cost?: number;
          upkeep_per_hour?: number;
          max_available?: number;
          created_at?: string;
        };
      };
      business_definitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          tier: number;
          base_income_per_hour: number;
          base_purchase_cost: number;
          upgrade_cost_multiplier: number;
          max_level: number;
          collect_cooldown_minutes: number;
          requires_ton: boolean;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          tier: number;
          base_income_per_hour: number;
          base_purchase_cost: number;
          upgrade_cost_multiplier?: number;
          max_level?: number;
          collect_cooldown_minutes?: number;
          requires_ton?: boolean;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          tier?: number;
          base_income_per_hour?: number;
          base_purchase_cost?: number;
          upgrade_cost_multiplier?: number;
          max_level?: number;
          collect_cooldown_minutes?: number;
          requires_ton?: boolean;
          image_url?: string | null;
          created_at?: string;
        };
      };
      job_definitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          tier: number;
          energy_cost: number;
          cash_reward: number;
          experience_reward: number;
          respect_reward: number;
          success_rate: number;
          cooldown_minutes: number;
          required_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          tier: number;
          energy_cost: number;
          cash_reward: number;
          experience_reward: number;
          respect_reward?: number;
          success_rate: number;
          cooldown_minutes?: number;
          required_level?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          tier?: number;
          energy_cost?: number;
          cash_reward?: number;
          experience_reward?: number;
          respect_reward?: number;
          success_rate?: number;
          cooldown_minutes?: number;
          required_level?: number;
          created_at?: string;
        };
      };
      achievement_definitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          target_value: number;
          reward_type: string;
          reward_amount: number;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          target_value: number;
          reward_type: string;
          reward_amount: number;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          target_value?: number;
          reward_type?: string;
          reward_amount?: number;
          icon?: string | null;
          created_at?: string;
        };
      };
      task_definitions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          task_type: string;
          reward_type: string;
          reward_amount: number;
          link: string | null;
          is_active: boolean;
          reset_hours: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          task_type: string;
          reward_type: string;
          reward_amount: number;
          link?: string | null;
          is_active?: boolean;
          reset_hours?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          task_type?: string;
          reward_type?: string;
          reward_amount?: number;
          link?: string | null;
          is_active?: boolean;
          reset_hours?: number | null;
          created_at?: string;
        };
      };
      daily_reward_definitions: {
        Row: {
          id: string;
          day_number: number;
          reward_type: string;
          reward_amount: number;
          reward_item_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          day_number: number;
          reward_type: string;
          reward_amount: number;
          reward_item_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          day_number?: number;
          reward_type?: string;
          reward_amount?: number;
          reward_item_id?: string | null;
          created_at?: string;
        };
      };
      attack_log: {
        Row: {
          id: string;
          attacker_id: string;
          defender_id: string;
          attacker_won: boolean;
          cash_transferred: number;
          respect_gained: number;
          respect_lost: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          attacker_id: string;
          defender_id: string;
          attacker_won: boolean;
          cash_transferred?: number;
          respect_gained?: number;
          respect_lost?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          attacker_id?: string;
          defender_id?: string;
          attacker_won?: boolean;
          cash_transferred?: number;
          respect_gained?: number;
          respect_lost?: number;
          created_at?: string;
        };
      };
      job_log: {
        Row: {
          id: string;
          player_id: string;
          job_id: string;
          success: boolean;
          cash_earned: number;
          experience_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          job_id: string;
          success: boolean;
          cash_earned?: number;
          experience_earned?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          job_id?: string;
          success?: boolean;
          cash_earned?: number;
          experience_earned?: number;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          player_id: string;
          transaction_type: string;
          currency: string;
          amount: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          transaction_type: string;
          currency: string;
          amount: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          transaction_type?: string;
          currency?: string;
          amount?: number;
          description?: string | null;
          created_at?: string;
        };
      };
      ad_views: {
        Row: {
          id: string;
          player_id: string;
          ad_network_id: string;
          reward_amount: number;
          reward_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          ad_network_id: string;
          reward_amount: number;
          reward_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          ad_network_id?: string;
          reward_amount?: number;
          reward_type?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      increment_cash: {
        Args: {
          player_id_input: string;
          amount: number;
          source: string;
        };
        Returns: void;
      };
      increment_diamonds: {
        Args: {
          player_id_input: string;
          amount: number;
          source: string;
        };
        Returns: void;
      };
      spend_cash: {
        Args: {
          player_id_input: string;
          amount: number;
          reason: string;
        };
        Returns: boolean;
      };
      spend_diamonds: {
        Args: {
          player_id_input: string;
          amount: number;
          reason: string;
        };
        Returns: boolean;
      };
      bank_deposit: {
        Args: {
          player_id_input: string;
          amount: number;
        };
        Returns: boolean;
      };
      bank_withdraw: {
        Args: {
          player_id_input: string;
          amount: number;
        };
        Returns: boolean;
      };
      use_energy: {
        Args: {
          player_id_input: string;
          amount: number;
        };
        Returns: boolean;
      };
      use_stamina: {
        Args: {
          player_id_input: string;
          amount: number;
        };
        Returns: boolean;
      };
      regenerate_energy: {
        Args: {
          player_id_input: string;
        };
        Returns: void;
      };
      regenerate_stamina: {
        Args: {
          player_id_input: string;
        };
        Returns: void;
      };
      get_leaderboard: {
        Args: {
          leaderboard_type: string;
          limit_count?: number;
        };
        Returns: {
          rank: number;
          player_id: string;
          username: string;
          value: number;
        }[];
      };
      calculate_net_worth: {
        Args: {
          player_id_input: string;
        };
        Returns: number;
      };
    };
  };
}