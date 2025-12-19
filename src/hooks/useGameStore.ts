import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
// RPC helper available for gradual adoption - provides retry logic and consistent error handling
// import { callRpc, callActionRpc } from '@/lib/rpcHelper';

// Types
export interface InventoryItem {
    id: string;
    item_id: string;
    name: string;
    icon: string | null;
    category: 'weapon' | 'equipment' | 'contraband';
    quantity: number;
    assigned_quantity: number; // How many are assigned to arm crew
    is_equipped: boolean; // Legacy - will be removed
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
    title: string; // For UI compatibility
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
    image_url?: string;
}

// Referral Types
export interface ReferralStats {
    referral_code: string;
    total_referrals: number;
    qualified_referrals: number;
    pending_referrals: number;
    referrals: {
        id: string;
        username: string;
        level: number;
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
    withdraw: (amount: number) => Promise<boolean>;

    // Business actions
    buyBusiness: (businessId: string) => Promise<boolean>;
    upgradeBusiness: (playerBusinessId: string) => Promise<boolean>;
    collectIncome: (playerBusinessId: string) => Promise<number>;

    // Inventory actions
    buyItem: (itemId: string, quantity?: number) => Promise<boolean>;
    assignEquipment: (inventoryId: string, quantity: number) => Promise<{ success: boolean; message: string }>;
    sellItem: (inventoryId: string, quantity?: number) => Promise<boolean>;
    contributeItemToFamily: (itemId: string, quantity: number) => Promise<boolean>;

    // Safe storage actions
    getSafeInfo: () => Promise<SafeInfo | null>;
    getSafePackages: () => Promise<SafePackage[]>;
    purchaseSafeSlots: (packageId: string) => Promise<{ success: boolean; message: string }>;
    moveToSafe: (inventoryId: string) => Promise<boolean>;
    moveFromSafe: (inventoryId: string) => Promise<boolean>;

    // Assignment limits based on crew
    getAssignmentLimits: () => Promise<AssignmentLimits | null>;
    getEquipmentLimits: () => { weaponSlots: number; equipmentSlots: number; equippedWeapons: number; equippedEquipment: number };

    // Crew actions
    hireCrew: (crewId: string, quantity?: number) => Promise<{ success: boolean; message: string; quantity?: number }>;

    // Achievement actions
    claimAchievement: (playerAchievementId: string) => Promise<boolean>;

    // Task actions
    completeTask: (playerTaskId: string) => Promise<boolean>;

    // Job actions (PvE)
    completeJob: (jobId: string) => Promise<{
        success: boolean;
        message?: string;
        cash_earned?: number;
        xp_earned?: number;
        leveled_up?: boolean;
        new_level?: number;
        current_streak?: number;
        streak_bonus_percent?: number;
        chain_broken?: boolean;
        can_continue_until?: string;
    }>;

    // Diamond Sink: Job Chains
    getJobChainStatus: () => Promise<{
        streak: number;
        active: boolean;
        chain_broken: boolean;
        can_continue: boolean;
        seconds_to_continue: number;
        continue_cost: number;
        bonus_percent: number;
    } | null>;
    continueJobChain: () => Promise<{ success: boolean; message: string; diamonds_spent?: number }>;

    // Diamond Sink: Rush Mode
    rushBusinessCollect: (playerBusinessId: string) => Promise<{ success: boolean; message: string; income_collected?: number; diamonds_spent?: number }>;
    rushPveCooldown: (targetId: string) => Promise<{ success: boolean; message: string; diamonds_spent?: number }>;

    // Diamond Sink: High Stakes
    getHighStakesJobs: () => Promise<any[]>;
    executeHighStakesJob: (jobId: string) => Promise<{
        success: boolean;
        result?: 'victory' | 'defeat';
        message?: string;
        cash_earned?: number;
        xp_earned?: number;
        diamonds_spent?: number;
        diamonds_lost?: number;
        leveled_up?: boolean;
        new_level?: number;
    }>;

    // Attack actions (PvP)
    performAttack: (defenderId: string) => Promise<{
        success: boolean;
        result?: 'victory' | 'defeat';
        message?: string;
        cash_stolen?: number;
        cash_lost?: number;
        respect_gained?: number;
        respect_lost?: number;
    }>;

    // Referral system
    getReferralStats: () => Promise<ReferralStats | null>;
    claimReferralMilestone: (milestoneId: string) => Promise<{ success: boolean; message: string; reward_type?: string; reward_amount?: number; reward_item_name?: string }>;
    applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;

    // Starter Pack system
    buyStarterPack: () => Promise<{ success: boolean; message: string; rewards?: any }>;
    repairBusiness: (playerBusinessId: string) => Promise<{ success: boolean; message: string; cost?: number }>;

    // Economy Safety: Lazy Upkeep
    checkPendingUpkeep: () => Promise<{ success: boolean; hours_processed: number; total_deducted: number; crew_lost: number; message: string } | null>;

    // Clear on logout
    reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    playerId: null,
    playerStats: {
        cash: 0,
        diamonds: 0,
        energy: 0,
        maxEnergy: 100,
        stamina: 0,
        maxStamina: 100,
        level: 1,
        respect: 0,
    },

    inventory: [],
    businesses: [],
    crew: [],
    achievements: [],
    tasks: [],

    jobDefinitions: [],
    businessDefinitions: [],
    crewDefinitions: [],
    itemDefinitions: [],

    isLoadingInventory: false,
    isLoadingBusinesses: false,
    isLoadingAchievements: false,
    isLoadingTasks: false,
    isLoadingDefinitions: false,

    setPlayerId: (id) => set({ playerId: id }),
    setPlayerStats: (stats) => set({ playerStats: stats }),

    // Calculate equipment limits based on crew
    getEquipmentLimits: () => {
        const { crew, inventory } = get();
        // Weapon slots = Hitmen + Enforcers
        const weaponSlots = crew
            .filter(c => c.type === 'Hitman' || c.type === 'Enforcer')
            .reduce((sum, c) => sum + c.quantity, 0);
        // Equipment slots = Bodyguards  
        const equipmentSlots = crew
            .filter(c => c.type === 'Bodyguard')
            .reduce((sum, c) => sum + c.quantity, 0);
        // Count currently equipped (using assigned_quantity - the new system)
        const equippedWeapons = inventory
            .filter(i => i.category === 'weapon' && i.assigned_quantity > 0)
            .reduce((sum, i) => sum + i.assigned_quantity, 0);
        const equippedEquipment = inventory
            .filter(i => i.category === 'equipment' && i.assigned_quantity > 0)
            .reduce((sum, i) => sum + i.assigned_quantity, 0);

        return { weaponSlots, equipmentSlots, equippedWeapons, equippedEquipment };
    },

    // Load inventory with item details
    loadInventory: async () => {
        const { playerId } = get();
        if (!playerId) return;

        set({ isLoadingInventory: true });

        try {
            const { data, error } = await supabase
                .from('player_inventory')
                .select(`
          id,
          item_id,
          quantity,
          assigned_quantity,
          is_equipped,
          location,
          safe_until,
          item_definitions (
            name,
            category,
            rarity,
            attack_bonus,
            defense_bonus,
            income_bonus,
            sell_price,
            icon
          )
        `)
                .eq('player_id', playerId);

            if (error) throw error;

            const inventory: InventoryItem[] = (data || []).map((item: any) => ({
                id: item.id,
                item_id: item.item_id,
                name: item.item_definitions?.name || 'Unknown',
                icon: item.item_definitions?.icon || null,
                category: item.item_definitions?.category || 'weapon',
                quantity: item.quantity,
                assigned_quantity: item.assigned_quantity || 0,
                is_equipped: item.is_equipped,
                location: item.location || 'inventory',
                safe_until: item.safe_until,
                rarity: item.item_definitions?.rarity || 'common',
                attack_bonus: item.item_definitions?.attack_bonus || 0,
                defense_bonus: item.item_definitions?.defense_bonus || 0,
                income_bonus: item.item_definitions?.income_bonus || 0,
                sell_price: item.item_definitions?.sell_price || 0,
            }));

            set({ inventory });
        } catch (error) {
            console.error('Failed to load inventory:', error);
        } finally {
            set({ isLoadingInventory: false });
        }
    },

    // Load owned businesses with details
    loadBusinesses: async () => {
        const { playerId } = get();
        if (!playerId) return;

        set({ isLoadingBusinesses: true });

        try {
            const { data, error } = await supabase
                .from('player_businesses')
                .select(`
          id,
          business_id,
          level,
          last_collected,
          business_definitions (
            name,
            description,
            base_income_per_hour,
            base_purchase_cost,
            upgrade_cost_multiplier,
            max_level,
            collect_cooldown_minutes,
            image_url
          )
        `)
                .eq('player_id', playerId);

            if (error) throw error;

            const businesses: OwnedBusiness[] = (data || []).map((b: any) => {
                const def = b.business_definitions;
                return {
                    id: b.id,
                    business_id: b.business_id,
                    name: def?.name || 'Unknown',
                    description: def?.description || '',
                    level: b.level,
                    max_level: def?.max_level || 10,
                    income_per_hour: Math.floor((def?.base_income_per_hour || 0) * Math.pow(1.15, b.level - 1)),
                    upgrade_cost: Math.floor((def?.base_purchase_cost || 0) * Math.pow(def?.upgrade_cost_multiplier || 1.5, b.level)),
                    last_collected: b.last_collected,
                    collect_cooldown_minutes: def?.collect_cooldown_minutes || 60,
                    image_url: def?.image_url || '',
                };
            });

            set({ businesses });
        } catch (error) {
            console.error('Failed to load businesses:', error);
        } finally {
            set({ isLoadingBusinesses: false });
        }
    },

    // Load hired crew
    loadCrew: async () => {
        const { playerId } = get();
        if (!playerId) return;

        try {
            const { data, error } = await supabase
                .from('player_crew')
                .select(`
          id,
          crew_id,
          quantity,
          crew_definitions (
            name,
            type,
            attack_bonus,
            defense_bonus,
            upkeep_per_hour
          )
        `)
                .eq('player_id', playerId);

            if (error) throw error;

            const crew: HiredCrew[] = (data || []).map((c: any) => ({
                id: c.id,
                crew_id: c.crew_id,
                name: c.crew_definitions?.name || 'Unknown',
                type: c.crew_definitions?.type || 'Enforcer',
                quantity: c.quantity,
                attack_bonus: c.crew_definitions?.attack_bonus || 0,
                defense_bonus: c.crew_definitions?.defense_bonus || 0,
                upkeep_per_hour: c.crew_definitions?.upkeep_per_hour || 0,
            }));

            set({ crew });
        } catch (error) {
            console.error('Failed to load crew:', error);
        }
    },

    // Load achievements with progress using RPC
    loadAchievements: async () => {
        const { playerId } = get();
        if (!playerId) return;

        set({ isLoadingAchievements: true });

        try {
            // Initialize achievements for player if missing
            await supabase.rpc('init_player_achievements', {
                target_player_id: playerId
            });

            // Get achievements with progress using new RPC
            const { data, error } = await supabase.rpc('get_player_achievements', {
                target_player_id: playerId
            });

            if (error) throw error;

            const achievements: PlayerAchievement[] = (data || []).map((a: any) => ({
                id: a.id,
                achievement_id: a.id,
                name: a.name,
                title: a.name, // For UI compatibility
                description: a.description,
                category: a.category,
                progress: a.progress || 0,
                target: a.target_value,
                reward_type: a.reward_type,
                reward_amount: a.reward_amount,
                is_unlocked: a.is_unlocked || false,
                is_claimed: a.is_claimed || false,
            }));

            set({ achievements });
        } catch (error) {
            console.error('Failed to load achievements:', error);
        } finally {
            set({ isLoadingAchievements: false });
        }
    },

    // Load tasks with progress from new RPC
    loadTasks: async () => {
        const { playerId } = get();
        if (!playerId) return;

        set({ isLoadingTasks: true });

        try {
            const { data, error } = await supabase.rpc('get_tasks_with_progress', {
                player_id_input: playerId
            });

            if (error) throw error;

            const tasks: PlayerTask[] = (data || []).map((t: any) => ({
                id: t.id,
                task_id: t.task_id,
                title: t.title,
                description: t.description,
                task_type: t.task_type,
                reward_type: t.reward_type,
                reward_amount: t.reward_amount,
                link: t.link,
                requirement_type: t.requirement_type,
                requirement_target: t.requirement_target || 1,
                progress: t.progress || 0,
                is_completed: t.is_completed || false,
                can_claim: t.can_claim || false,
                reset_hours: t.reset_hours,
            }));

            set({ tasks });
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            set({ isLoadingTasks: false });
        }
    },

    // Load static definitions (once)
    loadDefinitions: async () => {
        set({ isLoadingDefinitions: true });

        try {
            const [jobs, businesses, crew, items] = await Promise.all([
                supabase.from('job_definitions').select('*').order('tier'),
                supabase.from('business_definitions').select('*').order('tier'),
                supabase.from('crew_definitions').select('*'),
                supabase.from('item_definitions').select('*'),
            ]);

            set({
                jobDefinitions: jobs.data || [],
                businessDefinitions: businesses.data || [],
                crewDefinitions: crew.data || [],
                itemDefinitions: items.data || [],
            });
        } catch (error) {
            console.error('Failed to load definitions:', error);
        } finally {
            set({ isLoadingDefinitions: false });
        }
    },

    // Load all data for current player
    // Note: checkPendingUpkeep is called separately in App.tsx before this to enable toast feedback
    loadAllData: async () => {
        const { loadInventory, loadBusinesses, loadCrew, loadAchievements, loadTasks, loadDefinitions } = get();

        await Promise.all([
            loadDefinitions(),
            loadInventory(),
            loadBusinesses(),
            loadCrew(),
            loadAchievements(),
            loadTasks(),
        ]);
    },

    // Economy Safety: Check and apply pending crew upkeep on login
    checkPendingUpkeep: async () => {
        const { playerId } = get();
        if (!playerId) return null;

        try {
            const { data, error } = await supabase.rpc('apply_pending_upkeep', {
                player_id_input: playerId,
            });

            if (error) {
                console.error('Failed to check pending upkeep:', error);
                return null;
            }

            // Only log/toast if there was actual activity
            if (data && data.hours_processed > 0) {
                console.log('Lazy Upkeep Applied:', data);
                // Toast notifications will be triggered by the caller (HomePage/AuthContext)
            }

            return data as { success: boolean; hours_processed: number; total_deducted: number; crew_lost: number; message: string };
        } catch (error) {
            console.error('Error checking pending upkeep:', error);
            return null;
        }
    },

    // Currency actions using RPCs
    spendCash: async (amount, reason) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('spend_cash', {
            player_id_input: playerId,
            amount,
            reason,
        });

        if (error) {
            console.error('Failed to spend cash:', error);
            return false;
        }

        return data === true;
    },

    spendDiamonds: async (amount, reason) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('spend_diamonds', {
            player_id_input: playerId,
            amount,
            reason,
        });

        if (error) {
            console.error('Failed to spend diamonds:', error);
            return false;
        }

        return data === true;
    },

    useEnergy: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('use_energy', {
            player_id_input: playerId,
            amount,
        });

        if (error) {
            console.error('Failed to use energy:', error);
            return false;
        }

        return data === true;
    },

    useStamina: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('use_stamina', {
            player_id_input: playerId,
            amount,
        });

        if (error) {
            console.error('Failed to use stamina:', error);
            return false;
        }

        return data === true;
    },

    deposit: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('bank_deposit', {
            player_id_input: playerId,
            amount_input: amount,
        });

        if (error) {
            console.error('Failed to deposit:', error);
            return false;
        }

        return (data as any)?.success === true;
    },


    withdraw: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('bank_withdraw', {
            player_id_input: playerId,
            amount_input: amount,
        });

        if (error) {
            console.error('Failed to withdraw:', error);
            return false;
        }

        return (data as any)?.success === true;
    },


    // Business actions - use RPC for SECURITY DEFINER bypass
    buyBusiness: async (businessId) => {
        const { playerId, loadBusinesses } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('buy_business', {
            player_id_input: playerId,
            business_id_input: businessId,
        });

        if (error) {
            console.error('Failed to buy business:', error);
            return false;
        }

        const result = data as { success: boolean; message: string };

        if (result.success) {
            await loadBusinesses();
            return true;
        } else {
            console.error('Buy business failed:', result.message);
            return false;
        }
    },

    upgradeBusiness: async (playerBusinessId) => {
        const { playerId, loadBusinesses } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('upgrade_business', {
            player_id_input: playerId,
            player_business_id_input: playerBusinessId,
        });

        if (error) {
            console.error('Failed to upgrade business:', error);
            return false;
        }

        const result = data as { success: boolean; message: string };

        if (result.success) {
            await loadBusinesses();
            return true;
        } else {
            console.error('Upgrade business failed:', result.message);
            return false;
        }
    },

    collectIncome: async (playerBusinessId) => {
        const { playerId, loadBusinesses } = get();
        if (!playerId) return 0;

        const { data, error } = await supabase.rpc('collect_business_income', {
            player_id_input: playerId,
            player_business_id_input: playerBusinessId,
        });

        if (error) {
            console.error('Failed to collect income:', error);
            return 0;
        }

        const result = data as {
            success: boolean;
            message: string;
            amount?: number;
        };

        if (result.success) {
            await loadBusinesses();
            return result.amount || 0;
        } else {
            console.log('Collect income:', result.message);
            return 0;
        }
    },

    // Inventory actions
    buyItem: async (itemId, quantity = 1) => {
        const { playerId, loadInventory } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('buy_item', {
            player_id_input: playerId,
            item_id_input: itemId,
            quantity_input: quantity,
        });

        if (error) {
            console.error('Failed to buy item:', error);
            return false;
        }

        const result = data as { success: boolean; message: string };

        if (result.success) {
            await loadInventory();
            return true;
        } else {
            console.error('Buy item failed:', result.message);
            return false;
        }
    },

    // Assign equipment quantity to arm crew (new assignment system)
    assignEquipment: async (inventoryId, quantity) => {
        const { playerId, loadInventory } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('assign_equipment', {
            player_id_input: playerId,
            inventory_id_input: inventoryId,
            assign_count: quantity,
        });

        if (error) {
            console.error('Failed to assign equipment:', error);
            return { success: false, message: error.message };
        }

        const result = data as { success: boolean; message: string };

        if (result.success) {
            await loadInventory();
        }

        return result;
    },

    // Get assignment limits from backend
    getAssignmentLimits: async () => {
        const { playerId } = get();
        if (!playerId) return null;

        const { data, error } = await supabase.rpc('get_assignment_limits', {
            player_id_input: playerId,
        });

        if (error) {
            console.error('Failed to get assignment limits:', error);
            return null;
        }

        return data as AssignmentLimits;
    },


    sellItem: async (inventoryId, quantity = 1) => {
        const { playerId, inventory, loadInventory } = get();
        if (!playerId) return false;

        const item = inventory.find(i => i.id === inventoryId);
        if (!item) return false;

        // Use the new sell_item RPC
        const { data, error } = await supabase.rpc('sell_item', {
            player_id_input: playerId,
            item_id_input: item.item_id,
            quantity_input: quantity,
        });

        if (error) {
            console.error('Failed to sell item:', error);
            return false;
        }

        const result = data as { success: boolean; message: string; cash_received?: number };

        if (result.success) {
            await loadInventory();
            return true;
        }

        console.error('Sell item failed:', result.message);
        return false;
    },

    contributeItemToFamily: async (itemId, quantity) => {
        const { playerId, loadInventory } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('contribute_item_to_family', {
            player_id_input: playerId,
            item_id_input: itemId,
            quantity_input: quantity
        });

        if (error) {
            console.error('Failed to contribute item to family:', error);
            return false;
        }

        const result = data as { success: boolean; message: string };

        if (result.success) {
            await loadInventory();
            // Trigger family refresh if possible, or let FamilyPage handle it
            return true;
        } else {
            console.error('Contribute item failed:', result.message);
            return false;
        }
    },

    // Safe storage actions
    getSafeInfo: async () => {
        const { playerId } = get();
        if (!playerId) return null;

        const { data, error } = await supabase.rpc('get_safe_info', {
            player_id_input: playerId,
        });

        if (error) {
            console.error('Failed to get safe info:', error);
            return null;
        }

        return data as SafeInfo;
    },

    getSafePackages: async () => {
        const { data, error } = await supabase.rpc('get_safe_packages');

        if (error) {
            console.error('Failed to get safe packages:', error);
            return [];
        }

        return (data || []) as SafePackage[];
    },

    purchaseSafeSlots: async (packageId) => {
        const { playerId } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('purchase_safe_slots', {
            player_id_input: playerId,
            package_id_input: packageId,
        });

        if (error) {
            console.error('Failed to purchase safe slots:', error);
            return { success: false, message: error.message };
        }

        const result = data as { success: boolean; message: string };
        return result;
    },

    moveToSafe: async (inventoryId) => {
        const { playerId, loadInventory } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('move_item_to_safe', {
            player_id_input: playerId,
            inventory_id_input: inventoryId,
        });

        if (error) {
            console.error('Failed to move item to safe:', error);
            return false;
        }

        const result = data as { success: boolean; message: string };

        if (result.success) {
            await loadInventory();
            return true;
        } else {
            console.error('Move to safe failed:', result.message);
            return false;
        }
    },

    moveFromSafe: async (inventoryId) => {
        const { playerId, loadInventory } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('move_item_from_safe', {
            player_id_input: playerId,
            inventory_id_input: inventoryId,
        });

        if (error) {
            console.error('Failed to move item from safe:', error);
            return false;
        }

        const result = data as { success: boolean; message: string };

        if (result.success) {
            await loadInventory();
            return true;
        } else {
            console.error('Move from safe failed:', result.message);
            return false;
        }
    },

    // Crew actions
    hireCrew: async (crewId, quantity = 1) => {
        const { playerId, loadCrew } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('hire_crew', {
            player_id_input: playerId,
            crew_id_input: crewId,
            quantity_input: quantity,
        });

        if (error) {
            console.error('Failed to hire crew:', error);
            return { success: false, message: error.message };
        }

        const result = data as { success: boolean; message: string; quantity?: number };

        if (result.success) {
            await loadCrew();
        }

        return result;
    },

    // Achievement actions using RPC
    claimAchievement: async (achievementId) => {
        const { playerId, loadAchievements } = get();
        if (!playerId) return false;

        try {
            const { data, error } = await supabase.rpc('claim_achievement', {
                claimer_id: playerId,
                target_achievement_id: achievementId,
            });

            if (error) throw error;

            if (data?.success) {
                await loadAchievements();
                return true;
            } else {
                console.error('Claim achievement failed:', data?.message);
                return false;
            }
        } catch (error) {
            console.error('Failed to claim achievement:', error);
            return false;
        }
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

    // Job actions (PvE with leveling)
    completeJob: async (jobId) => {
        const { playerId } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('complete_job', {
            player_id_input: playerId,
            job_id_input: jobId,
        });

        if (error) {
            console.error('Failed to complete job:', error);
            return { success: false, message: error.message };
        }

        return data as {
            success: boolean;
            message?: string;
            cash_earned?: number;
            xp_earned?: number;
            leveled_up?: boolean;
            new_level?: number;
            current_streak?: number;
            streak_bonus_percent?: number;
            chain_broken?: boolean;
            can_continue_until?: string;
        };
    },

    // Attack actions (PvP)
    performAttack: async (defenderId) => {
        const { playerId } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('perform_attack', {
            attacker_id_input: playerId,
            defender_id_input: defenderId,
        });

        if (error) {
            console.error('Failed to perform attack:', error);
            return { success: false, message: error.message };
        }

        return data as {
            success: boolean;
            result?: 'victory' | 'defeat';
            message?: string;
            cash_stolen?: number;
            cash_lost?: number;
            respect_gained?: number;
            respect_lost?: number;
        };
    },

    // Diamond Sink: Job Chain Status
    getJobChainStatus: async () => {
        const { playerId } = get();
        if (!playerId) return null;

        const { data, error } = await supabase.rpc('get_job_chain_status', {
            player_id_input: playerId,
        });

        if (error) {
            console.error('Failed to get job chain status:', error);
            return null;
        }

        return data;
    },

    // Diamond Sink: Continue Job Chain (15 diamonds)
    continueJobChain: async () => {
        const { playerId } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('continue_job_chain', {
            player_id_input: playerId,
        });

        if (error) {
            console.error('Failed to continue job chain:', error);
            return { success: false, message: error.message };
        }

        return data as { success: boolean; message: string; diamonds_spent?: number };
    },

    // Diamond Sink: Rush Business Collect (5 diamonds)
    rushBusinessCollect: async (playerBusinessId) => {
        const { playerId, loadBusinesses } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('rush_business_collect', {
            player_id_input: playerId,
            player_business_id_input: playerBusinessId,
        });

        if (error) {
            console.error('Failed to rush collect:', error);
            return { success: false, message: error.message };
        }

        if (data?.success) {
            await loadBusinesses();
        }

        return data as { success: boolean; message: string; income_collected?: number; diamonds_spent?: number };
    },

    // Diamond Sink: Rush PvE Cooldown (3 diamonds)
    rushPveCooldown: async (targetId) => {
        const { playerId } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('rush_pve_cooldown', {
            player_id_input: playerId,
            target_id_input: targetId,
        });

        if (error) {
            console.error('Failed to rush cooldown:', error);
            return { success: false, message: error.message };
        }

        return data as { success: boolean; message: string; diamonds_spent?: number };
    },

    // Diamond Sink: Get High Stakes Jobs
    getHighStakesJobs: async () => {
        const { playerId } = get();
        if (!playerId) return [];

        const { data, error } = await supabase.rpc('get_high_stakes_jobs', {
            viewer_id: playerId,
        });

        if (error) {
            console.error('Failed to get high stakes jobs:', error);
            return [];
        }

        return data || [];
    },

    // Diamond Sink: Execute High Stakes Job
    executeHighStakesJob: async (jobId) => {
        const { playerId } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('execute_high_stakes_job', {
            player_id_input: playerId,
            job_id_input: jobId,
        });

        if (error) {
            console.error('Failed to execute high stakes job:', error);
            return { success: false, message: error.message };
        }

        return data as {
            success: boolean;
            result?: 'victory' | 'defeat';
            message?: string;
            cash_earned?: number;
            xp_earned?: number;
            diamonds_spent?: number;
            diamonds_lost?: number;
            leveled_up?: boolean;
            new_level?: number;
        };
    },

    // Referral system
    getReferralStats: async () => {
        const { playerId } = get();
        if (!playerId) return null;

        const { data, error } = await supabase.rpc('get_referral_stats', {
            player_id_input: playerId,
        });

        if (error) {
            console.error('Failed to get referral stats:', error);
            return null;
        }

        return data as ReferralStats;
    },

    claimReferralMilestone: async (milestoneId) => {
        const { playerId } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('claim_referral_milestone', {
            player_id_input: playerId,
            milestone_id_input: milestoneId,
        });

        if (error) {
            console.error('Failed to claim referral milestone:', error);
            return { success: false, message: error.message };
        }

        return data as { success: boolean; message: string; reward_type?: string; reward_amount?: number; reward_item_name?: string };
    },

    applyReferralCode: async (code) => {
        const { playerId } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('apply_referral_code', {
            new_player_id: playerId,
            code_input: code,
        });

        if (error) {
            console.error('Failed to apply referral code:', error);
            return { success: false, message: error.message };
        }

        return data as { success: boolean; message: string };
    },

    // Starter Pack System
    buyStarterPack: async () => {
        const { playerId, loadBusinesses, loadInventory, loadAchievements } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('buy_starter_pack', {
            buyer_id: playerId,
        });

        if (error) {
            console.error('Failed to buy starter pack:', error);
            return { success: false, message: error.message };
        }

        const result = data as { success: boolean; message: string; rewards?: any };

        // Reload relevant data if purchase successful
        if (result.success) {
            await Promise.all([
                loadBusinesses(),
                loadInventory(),
                loadAchievements(),
            ]);
        }

        return result;
    },

    repairBusiness: async (playerBusinessId) => {
        const { playerId, loadBusinesses } = get();
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await supabase.rpc('repair_business', {
            repairer_id: playerId,
            target_business_id: playerBusinessId,
        });

        if (error) {
            console.error('Failed to repair business:', error);
            return { success: false, message: error.message };
        }

        const result = data as { success: boolean; message: string; cost?: number };

        // Reload businesses if repair successful
        if (result.success) {
            await loadBusinesses();
        }

        return result;
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
