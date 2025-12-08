import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// Types
export interface InventoryItem {
    id: string;
    item_id: string;
    name: string;
    category: 'weapon' | 'equipment' | 'contraband';
    quantity: number;
    is_equipped: boolean;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
    attack_bonus: number;
    defense_bonus: number;
    income_bonus: number;
    sell_price: number;
}

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

export interface PlayerAchievement {
    id: string;
    achievement_id: string;
    name: string;
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
    is_completed: boolean;
}

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
}

interface GameState {
    // Player data (synced from AuthContext)
    playerId: string | null;
    playerStats: {
        cash: number;
        diamonds: number;
        energy: number;
        maxEnergy: number;
        stamina: number;
        maxStamina: number;
        level: number;
        respect: number;
    };

    // Loaded data
    inventory: InventoryItem[];
    businesses: OwnedBusiness[];
    crew: HiredCrew[];
    achievements: PlayerAchievement[];
    tasks: PlayerTask[];

    // Static definitions (loaded once)
    jobDefinitions: JobDefinition[];
    businessDefinitions: BusinessDefinition[];
    crewDefinitions: CrewDefinition[];
    itemDefinitions: ItemDefinition[];

    // Loading states
    isLoadingInventory: boolean;
    isLoadingBusinesses: boolean;
    isLoadingAchievements: boolean;
    isLoadingTasks: boolean;
    isLoadingDefinitions: boolean;

    // Actions
    setPlayerId: (id: string | null) => void;
    setPlayerStats: (stats: GameState['playerStats']) => void;

    // Data loading
    loadInventory: () => Promise<void>;
    loadBusinesses: () => Promise<void>;
    loadCrew: () => Promise<void>;
    loadAchievements: () => Promise<void>;
    loadTasks: () => Promise<void>;
    loadDefinitions: () => Promise<void>;
    loadAllData: () => Promise<void>;

    // Currency actions
    spendCash: (amount: number, reason: string) => Promise<boolean>;
    spendDiamonds: (amount: number, reason: string) => Promise<boolean>;

    // Energy/Stamina
    useEnergy: (amount: number) => Promise<boolean>;
    useStamina: (amount: number) => Promise<boolean>;

    // Bank
    deposit: (amount: number) => Promise<boolean>;

        const achievement = achievements.find(a => a.id === playerAchievementId);
if (!achievement || !achievement.is_unlocked || achievement.is_claimed) return false;

// Credit reward
if (achievement.reward_type === 'cash') {
    await supabase.rpc('increment_cash', {
        player_id_input: playerId,
        amount: achievement.reward_amount,
        source: 'achievement',
    });
} else {
    await supabase.rpc('increment_diamonds', {
        player_id_input: playerId,
        amount: achievement.reward_amount,
        source: 'achievement',
    });
}

// Mark as claimed
await supabase
    .from('player_achievements')
    .update({ is_claimed: true, claimed_at: new Date().toISOString() })
    .eq('id', playerAchievementId);

await loadAchievements();
return true;
    },

// Task actions
completeTask: async (playerTaskId) => {
    const { playerId, tasks, loadTasks } = get();
    if (!playerId) return false;

    const task = tasks.find(t => t.id === playerTaskId);
    if (!task || task.is_completed) return false;

    const { data, error } = await supabase.rpc('complete_task', {
        player_id_input: playerId,
        task_id_input: task.task_id,
    });

    if (error) {
        console.error('Failed to complete task:', error);
        return false;
    }

    const result = data as { success: boolean; message: string };

    if (result.success) {
        await loadTasks();
        return true;
    } else {
        console.error('Complete task failed:', result.message);
        return false;
    }
},

    reset: () => set({
        playerId: null,
        inventory: [],
        businesses: [],
        crew: [],
        achievements: [],
        tasks: [],
    }),
}));
