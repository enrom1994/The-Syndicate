export interface Database {
    public: {
      Tables: {
        players: {
          Row: {
            id: string;
            telegram_id: number;
            username: string;
            wallet_address: string | null;
            cash: number;
            respect: number;
            level: number;
            experience: number;
            energy: number;
            max_energy: number;
            last_energy_update: string;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            telegram_id: number;
            username: string;
            wallet_address?: string | null;
            cash?: number;
            respect?: number;
            level?: number;
            experience?: number;
            energy?: number;
            max_energy?: number;
            last_energy_update?: string;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            telegram_id?: number;
            username?: string;
            wallet_address?: string | null;
            cash?: number;
            respect?: number;
            level?: number;
            experience?: number;
            energy?: number;
            max_energy?: number;
            last_energy_update?: string;
            created_at?: string;
            updated_at?: string;
          };
        };
        businesses: {
          Row: {
            id: string;
            player_id: string;
            business_type: string;
            level: number;
            income_rate: number;
            last_collected: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            player_id: string;
            business_type: string;
            level?: number;
            income_rate?: number;
            last_collected?: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            player_id?: string;
            business_type?: string;
            level?: number;
            income_rate?: number;
            last_collected?: string;
            created_at?: string;
          };
        };
        missions: {
          Row: {
            id: string;
            name: string;
            description: string;
            required_level: number;
            energy_cost: number;
            cash_reward: number;
            respect_reward: number;
            experience_reward: number;
            success_rate: number;
            mission_type: string;
          };
          Insert: {
            id?: string;
            name: string;
            description: string;
            required_level?: number;
            energy_cost?: number;
            cash_reward?: number;
            respect_reward?: number;
            experience_reward?: number;
            success_rate?: number;
            mission_type?: string;
          };
          Update: {
            id?: string;
            name?: string;
            description?: string;
            required_level?: number;
            energy_cost?: number;
            cash_reward?: number;
            respect_reward?: number;
            experience_reward?: number;
            success_rate?: number;
            mission_type?: string;
          };
        };
        player_missions: {
          Row: {
            id: string;
            player_id: string;
            mission_id: string;
            completed_at: string;
            success: boolean;
          };
          Insert: {
            id?: string;
            player_id: string;
            mission_id: string;
            completed_at?: string;
            success?: boolean;
          };
          Update: {
            id?: string;
            player_id?: string;
            mission_id?: string;
            completed_at?: string;
            success?: boolean;
          };
        };
      };
    };
  }
  