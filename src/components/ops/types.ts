/**
 * Shared types for Operations (Ops) page components
 */

export interface TargetPlayer {
    id: string;
    username: string;
    cash: number;
    defense: number;
    attack: number;
    has_made_man?: boolean;
    has_shield?: boolean;
    has_npp?: boolean;
    on_cooldown?: boolean;
    cooldown_remaining?: number;
}

export interface PveTarget {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    required_level: number; // DEPRECATED - use required_rank
    required_rank?: string; // 'Street Thug' | 'Enforcer' | 'Soldier' | etc.
    stamina_cost: number;
    base_strength: number;
    cash_reward: number;
    xp_reward: number;
    respect_reward: number;
    base_success_rate: number;
    cooldown_minutes: number;
    is_available: boolean;
    cooldown_remaining_seconds: number;
    player_meets_level: boolean; // Now based on rank
}

export interface PvpAttackType {
    id: string;
    name: string;
    description: string;
    stamina_cost: number;
    requires_crew: boolean;
    requires_consumables: boolean;
    consumable_item_name: string | null;
    consumable_qty: number;
    steals_cash: boolean;
    steals_vault: boolean;
    steals_contraband: boolean;
    steals_respect: boolean;
    kills_crew: boolean;
    cash_steal_percent: number;
    vault_steal_percent: number;
}

export interface RevengeTarget {
    attack_log_id: string;
    attacker_id: string;
    attacker_name: string;
    attacked_at: string;
    hours_remaining: number;
    attacker_has_shield: boolean;
    attacker_has_npp: boolean;
    has_made_man?: boolean;
    on_cooldown?: boolean;
    cooldown_remaining?: number;
}

export interface HighStakesJob {
    id: string;
    name: string;
    description: string;
    entry_cost_diamonds: number;
    energy_cost: number;
    cash_reward: number;
    xp_reward: number;
    respect_reward?: number;
    success_rate: number;
    required_level: number; // DEPRECATED - use required_rank
    required_rank?: string; // 'Street Thug' | 'Enforcer' | 'Soldier' | etc.
    cooldown_minutes: number;
    is_available: boolean;
    cooldown_remaining_seconds: number;
    player_meets_level: boolean; // Now based on rank
}
