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
    withdraw: (amount: number) => Promise<boolean>;

    // Business actions
    buyBusiness: (businessId: string) => Promise<boolean>;
    upgradeBusiness: (playerBusinessId: string) => Promise<boolean>;
    collectIncome: (playerBusinessId: string) => Promise<number>;

    // Inventory actions
    buyItem: (itemId: string, quantity?: number) => Promise<boolean>;
    equipItem: (inventoryId: string) => Promise<boolean>;
    unequipItem: (inventoryId: string) => Promise<boolean>;
    sellItem: (inventoryId: string, quantity?: number) => Promise<boolean>;

    // Crew actions
    hireCrew: (crewId: string) => Promise<boolean>;

    // Achievement actions
    claimAchievement: (playerAchievementId: string) => Promise<boolean>;

    // Task actions
    completeTask: (playerTaskId: string) => Promise<boolean>;

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
          is_equipped,
          item_definitions (
            name,
            category,
            rarity,
            attack_bonus,
            defense_bonus,
            income_bonus,
            sell_price
          )
        `)
                .eq('player_id', playerId);

            if (error) throw error;

            const inventory: InventoryItem[] = (data || []).map((item: any) => ({
                id: item.id,
                item_id: item.item_id,
                name: item.item_definitions?.name || 'Unknown',
                category: item.item_definitions?.category || 'weapon',
                quantity: item.quantity,
                is_equipped: item.is_equipped,
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

    // Load achievements with progress
    loadAchievements: async () => {
        const { playerId } = get();
        if (!playerId) return;

        set({ isLoadingAchievements: true });

        try {
            // Get all achievement definitions with player progress
            const { data: defs } = await supabase
                .from('achievement_definitions')
                .select('*');

            const { data: progress } = await supabase
                .from('player_achievements')
                .select('*')
                .eq('player_id', playerId);

            const progressMap = new Map((progress || []).map((p: any) => [p.achievement_id, p]));

            const achievements: PlayerAchievement[] = (defs || []).map((def: any) => {
                const p = progressMap.get(def.id) || {};
                return {
                    id: p.id || def.id,
                    achievement_id: def.id,
                    name: def.name,
                    description: def.description,
                    category: def.category,
                    progress: p.progress || 0,
                    target: def.target_value,
                    reward_type: def.reward_type,
                    reward_amount: def.reward_amount,
                    is_unlocked: p.is_unlocked || false,
                    is_claimed: p.is_claimed || false,
                };
            });

            set({ achievements });
        } catch (error) {
            console.error('Failed to load achievements:', error);
        } finally {
            set({ isLoadingAchievements: false });
        }
    },

    // Load tasks with completion status
    loadTasks: async () => {
        const { playerId } = get();
        if (!playerId) return;

        set({ isLoadingTasks: true });

        try {
            const { data: defs } = await supabase
                .from('task_definitions')
                .select('*')
                .eq('is_active', true);

            const { data: completed } = await supabase
                .from('player_tasks')
                .select('*')
                .eq('player_id', playerId);

            const completedMap = new Map((completed || []).map((t: any) => [t.task_id, t]));

            const tasks: PlayerTask[] = (defs || []).map((def: any) => {
                const t = completedMap.get(def.id) || {};
                return {
                    id: t.id || def.id,
                    task_id: def.id,
                    title: def.title,
                    description: def.description,
                    task_type: def.task_type,
                    reward_type: def.reward_type,
                    reward_amount: def.reward_amount,
                    link: def.link,
                    is_completed: t.is_completed || false,
                };
            });

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
            amount,
        });

        if (error) {
            console.error('Failed to deposit:', error);
            return false;
        }

        return data === true;
    },

    withdraw: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('bank_withdraw', {
            player_id_input: playerId,
            amount,
        });

        if (error) {
            console.error('Failed to withdraw:', error);
            return false;
        }

        return data === true;
    },

    // Business actions
    buyBusiness: async (businessId) => {
        const { playerId, businessDefinitions, spendCash, loadBusinesses } = get();
        if (!playerId) return false;

        const def = businessDefinitions.find(b => b.id === businessId);
        if (!def) return false;

        // Spend cash first
        const success = await spendCash(def.base_purchase_cost, 'business_purchase');
        if (!success) return false;

        // Insert the business
        const { error } = await supabase
            .from('player_businesses')
            .insert({
                player_id: playerId,
                business_id: businessId,
                level: 1,
            });

        if (error) {
            console.error('Failed to buy business:', error);
            return false;
        }

        await loadBusinesses();
        return true;
    },

    upgradeBusiness: async (playerBusinessId) => {
        const { businesses, spendCash, loadBusinesses } = get();

        const business = businesses.find(b => b.id === playerBusinessId);
        if (!business || business.level >= business.max_level) return false;

        // Spend cash
        const success = await spendCash(business.upgrade_cost, 'business_upgrade');
        if (!success) return false;

        // Upgrade the business
        const { error } = await supabase
            .from('player_businesses')
            .update({ level: business.level + 1 })
            .eq('id', playerBusinessId);

        if (error) {
            console.error('Failed to upgrade business:', error);
            return false;
        }

        await loadBusinesses();
        return true;
    },

    collectIncome: async (playerBusinessId) => {
        const { playerId, businesses, loadBusinesses } = get();
        if (!playerId) return 0;

        const business = businesses.find(b => b.id === playerBusinessId);
        if (!business) return 0;

        // Calculate time-based income
        const lastCollected = new Date(business.last_collected);
        const now = new Date();
        const hoursPassed = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);
        const income = Math.floor(business.income_per_hour * hoursPassed);

        if (income <= 0) return 0;

        // Credit the income
        await supabase.rpc('increment_cash', {
            player_id_input: playerId,
            amount: income,
            source: 'business_income',
        });

        // Update last collected
        await supabase
            .from('player_businesses')
            .update({ last_collected: now.toISOString() })
            .eq('id', playerBusinessId);

        await loadBusinesses();
        return income;
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

    equipItem: async (inventoryId) => {
        const { loadInventory } = get();

        const { error } = await supabase
            .from('player_inventory')
            .update({ is_equipped: true })
            .eq('id', inventoryId);

        if (error) {
            console.error('Failed to equip item:', error);
            return false;
        }

        await loadInventory();
        return true;
    },

    unequipItem: async (inventoryId) => {
        const { loadInventory } = get();

        const { error } = await supabase
            .from('player_inventory')
            .update({ is_equipped: false })
            .eq('id', inventoryId);

        if (error) {
            console.error('Failed to unequip item:', error);
            return false;
        }

        await loadInventory();
        return true;
    },

    sellItem: async (inventoryId, quantity = 1) => {
        const { playerId, inventory, loadInventory } = get();
        if (!playerId) return false;

        const item = inventory.find(i => i.id === inventoryId);
        if (!item) return false;

        const sellAmount = item.sell_price * quantity;

        // Credit the cash
        await supabase.rpc('increment_cash', {
            player_id_input: playerId,
            amount: sellAmount,
            source: 'item_sale',
        });

        // Update or delete inventory item
        if (quantity >= item.quantity) {
            await supabase.from('player_inventory').delete().eq('id', inventoryId);
        } else {
            await supabase
                .from('player_inventory')
                .update({ quantity: item.quantity - quantity })
                .eq('id', inventoryId);
        }

        await loadInventory();
        return true;
    },

    // Crew actions
    hireCrew: async (crewId) => {
        const { playerId, loadCrew } = get();
        if (!playerId) return false;

        const { data, error } = await supabase.rpc('hire_crew', {
            player_id_input: playerId,
            crew_id_input: crewId,
        });

        if (error) {
            console.error('Failed to hire crew:', error);
            return false;
        }

        const result = data as { success: boolean; message: string };

        if (result.success) {
            await loadCrew();
            return true;
        } else {
            console.error('Hire crew failed:', result.message);
            return false;
        }
    },

    // Achievement actions
    claimAchievement: async (playerAchievementId) => {
        const { playerId, achievements, loadAchievements } = get();
        if (!playerId) return false;

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
