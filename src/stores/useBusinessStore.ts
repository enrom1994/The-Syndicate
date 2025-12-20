/**
 * Business Store - Business ownership and income management
 * 
 * Handles: owned businesses, loading, buy, upgrade, collect, rush, repair
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { callRpc, callActionRpc } from '@/lib/rpcHelper';
import { logger } from '@/lib/logger';
import { usePlayerStore } from './usePlayerStore';
import type { OwnedBusiness, BusinessDefinition } from './types';

// =====================================================
// TYPES
// =====================================================

interface RushCollectResult {
    success: boolean;
    message: string;
    income_collected?: number;
    diamonds_spent?: number;
}

interface RepairResult {
    success: boolean;
    message: string;
    cost?: number;
}

interface BusinessState {
    businesses: OwnedBusiness[];
    businessDefinitions: BusinessDefinition[];
    isLoadingBusinesses: boolean;

    // Load
    loadBusinesses: () => Promise<void>;
    loadBusinessDefinitions: () => Promise<void>;

    // Actions
    buyBusiness: (businessId: string) => Promise<boolean>;
    upgradeBusiness: (playerBusinessId: string) => Promise<boolean>;
    collectIncome: (playerBusinessId: string) => Promise<number>;
    rushBusinessCollect: (playerBusinessId: string) => Promise<RushCollectResult>;
    repairBusiness: (playerBusinessId: string) => Promise<RepairResult>;

    // Reset
    reset: () => void;
}

// =====================================================
// STORE
// =====================================================

export const useBusinessStore = create<BusinessState>((set, get) => ({
    businesses: [],
    businessDefinitions: [],
    isLoadingBusinesses: false,

    // ===== LOAD FUNCTIONS =====

    loadBusinesses: async () => {
        const playerId = usePlayerStore.getState().playerId;
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
            logger.error('Failed to load businesses:', error);
        } finally {
            set({ isLoadingBusinesses: false });
        }
    },

    loadBusinessDefinitions: async () => {
        try {
            const { data, error } = await supabase
                .from('business_definitions')
                .select('*')
                .order('tier', { ascending: true });

            if (error) throw error;
            set({ businessDefinitions: data as BusinessDefinition[] });
        } catch (error) {
            logger.error('Failed to load business definitions:', error);
        }
    },

    // ===== ACTIONS =====

    buyBusiness: async (businessId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return false;

        const { success, message } = await callActionRpc('buy_business', {
            player_id_input: playerId,
            business_id_input: businessId,
        });

        if (success) {
            await get().loadBusinesses();
            return true;
        } else {
            logger.error('Buy business failed:', message);
            return false;
        }
    },

    upgradeBusiness: async (playerBusinessId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return false;

        const { success, message } = await callActionRpc('upgrade_business', {
            player_id_input: playerId,
            player_business_id_input: playerBusinessId,
        });

        if (success) {
            await get().loadBusinesses();
            return true;
        } else {
            logger.error('Upgrade business failed:', message);
            return false;
        }
    },

    collectIncome: async (playerBusinessId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return 0;

        const { data, error } = await callRpc<{
            success: boolean;
            message: string;
            amount?: number;
        }>('collect_business_income', {
            player_id_input: playerId,
            player_business_id_input: playerBusinessId,
        });

        if (error || !data) {
            logger.error('Failed to collect income:', error);
            return 0;
        }

        if (data.success) {
            await get().loadBusinesses();
            return data.amount || 0;
        } else {
            logger.debug('Collect income:', data.message);
            return 0;
        }
    },

    rushBusinessCollect: async (playerBusinessId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await callRpc<RushCollectResult>('rush_business_collect', {
            player_id_input: playerId,
            player_business_id_input: playerBusinessId,
        });

        if (error || !data) {
            logger.error('Failed to rush collect:', error);
            return { success: false, message: error || 'Unknown error' };
        }

        if (data.success) {
            await get().loadBusinesses();
        }

        return data;
    },

    repairBusiness: async (playerBusinessId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await callRpc<RepairResult>('repair_business', {
            repairer_id: playerId,
            target_business_id: playerBusinessId,
        });

        if (error || !data) {
            logger.error('Failed to repair business:', error);
            return { success: false, message: error || 'Unknown error' };
        }

        if (data.success) {
            await get().loadBusinesses();
        }

        return data;
    },

    // ===== RESET =====

    reset: () => set({
        businesses: [],
        businessDefinitions: [],
        isLoadingBusinesses: false,
    }),
}));
