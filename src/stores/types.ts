/**
 * Shared types for game stores
 * Extracted from useGameStore.ts for domain separation
 */

// =====================================================
// INVENTORY & ITEMS
// =====================================================

export interface InventoryItem {
    id: string;
    item_id: string;
    name: string;
    icon: string | null;
    category: 'weapon' | 'equipment' | 'contraband';
    quantity: number;
    assigned_quantity: number;
    is_equipped: boolean;
    location: 'inventory' | 'equipped' | 'safe';
    safe_until?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
    attack_bonus: number;
    defense_bonus: number;
    income_bonus: number;
    sell_price: number;
}

export interface SafeInfo {
    total_slots: number;
    used_slots: number;
    available_slots: number;
}

export interface AssignmentLimits {
    total_crew: number;
    assigned_weapons: number;
    assigned_equipment: number;
    available_weapon_slots: number;
    available_equipment_slots: number;
    unarmed_crew: number;
    unarmored_crew: number;
}

export interface SafePackage {
    id: string;
    name: string;
    slots: number;
    price_ton: number;
}

export interface ItemDefinition {
    id: string;
    name: string;
    category: 'weapon' | 'equipment' | 'contraband';
    description: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
    attack_bonus: number;
    defense_bonus: number;
    income_bonus: number;
    sell_price: number;
    buy_price: number;
    is_purchasable: boolean;
    icon?: string;
}

// =====================================================
// BUSINESS
// =====================================================

export interface OwnedBusiness {
    id: string;
    business_id: string;
    name: string;
    description: string;
    level: number;
    max_level: number;
    income_per_hour: number;
    upgrade_cost: number;
    last_collected: string;
    collect_cooldown_minutes: number;
    image_url: string;
}

export interface BusinessDefinition {
    id: string;
    name: string;
    description: string;
    tier: number;
    base_income_per_hour: number;
    base_purchase_cost: number;
    max_level: number;
    collect_cooldown_minutes: number;
    requires_ton: boolean;
    image_url: string;
}

// =====================================================
// CREW
// =====================================================

export interface HiredCrew {
    id: string;
    crew_id: string;
    name: string;
    type: string;
    quantity: number;
    attack_bonus: number;
    defense_bonus: number;
    upkeep_per_hour: number;
}

export interface CrewDefinition {
    id: string;
    name: string;
    type: string;
    description: string;
    attack_bonus: number;
    defense_bonus: number;
    special_bonus: string | null;
    hire_cost: number;
    upkeep_per_hour: number;
    max_available: number;
}

// =====================================================
// COMBAT & JOBS
// =====================================================

export interface JobDefinition {
    id: string;
    name: string;
    description: string;
    tier: number;
    energy_cost: number;
    cash_reward: number;
    experience_reward: number;
    respect_reward: number;
    success_rate: number;
    cooldown_minutes: number;
    required_level: number;
    required_item_id?: string;
    required_item_quantity?: number;
}

// =====================================================
// ACHIEVEMENTS & TASKS
// =====================================================

export interface PlayerAchievement {
    id: string;
    achievement_id: string;
    name: string;
    title: string;
    description: string;
    category: string;
    progress: number;
    target: number;
    reward_type: 'cash' | 'diamonds';
    reward_amount: number;
    is_unlocked: boolean;
    is_claimed: boolean;
}

export interface PlayerTask {
    id: string;
    task_id: string;
    title: string;
    description: string;
    task_type: 'telegram' | 'daily' | 'weekly' | 'special' | 'ad';
    reward_type: 'cash' | 'diamonds' | 'energy';
    reward_amount: number;
    link: string | null;
    requirement_type: string | null;
    requirement_target: number;
    progress: number;
    is_completed: boolean;
    can_claim: boolean;
    reset_hours: number | null;
}

// =====================================================
// REFERRAL
// =====================================================

export interface ReferralStats {
    referral_code: string;
    total_referrals: number;
    qualified_referrals: number;
    pending_referrals: number;
    referrals: {
        id: string;
        username: string;
        level: number;
        respect: number;
        is_qualified: boolean;
        created_at: string;
    }[];
    milestones: {
        id: string;
        milestone_count: number;
        reward_type: 'cash' | 'diamonds' | 'item';
        reward_amount: number;
        reward_item_name: string | null;
        reward_item_icon: string | null;
        title: string;
        description: string;
        is_claimed: boolean;
        can_claim: boolean;
    }[];
}

// =====================================================
// PLAYER STATS (shared between stores)
// =====================================================

export interface PlayerStats {
    cash: number;
    diamonds: number;
    energy: number;
    maxEnergy: number;
    stamina: number;
    maxStamina: number;
    level: number;
    respect: number;
    bankedCash: number;
}
