/**
 * Combat Store - Jobs (PvE) and Attacks (PvP) management
 * 
 * Handles: job completion, PvP attacks, job chains, high stakes jobs, PvE cooldowns
 */

import { create } from 'zustand';
import { callRpc } from '@/lib/rpcHelper';
import { logger } from '@/lib/logger';
import { usePlayerStore } from './usePlayerStore';
import type { JobDefinition } from './types';

// =====================================================
// TYPES
// =====================================================

export interface JobResult {
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
}

export interface AttackResult {
    success: boolean;
    result?: 'victory' | 'defeat';
    message?: string;
    cash_stolen?: number;
    cash_lost?: number;
    respect_gained?: number;
    respect_lost?: number;
}

export interface JobChainStatus {
    streak: number;
    active: boolean;
    chain_broken: boolean;
    can_continue: boolean;
    seconds_to_continue: number;
    continue_cost: number;
    bonus_percent: number;
}

export interface HighStakesResult {
    success: boolean;
    result?: 'victory' | 'defeat';
    message?: string;
    cash_earned?: number;
    xp_earned?: number;
    diamonds_spent?: number;
    diamonds_lost?: number;
    leveled_up?: boolean;
    new_level?: number;
}

interface CombatState {
    jobDefinitions: JobDefinition[];
    isLoadingDefinitions: boolean;

    // Job Actions
    loadJobDefinitions: () => Promise<void>;
    completeJob: (jobId: string) => Promise<JobResult>;
    getJobChainStatus: () => Promise<JobChainStatus | null>;
    continueJobChain: () => Promise<{ success: boolean; message: string; diamonds_spent?: number }>;

    // High Stakes
    getHighStakesJobs: () => Promise<any[]>;
    executeHighStakesJob: (jobId: string) => Promise<HighStakesResult>;

    // PvE Cooldown
    rushPveCooldown: (targetId: string) => Promise<{ success: boolean; message: string; diamonds_spent?: number }>;

    // PvP (basic - full PvP logic remains in useGameStore for now)
    performAttack: (defenderId: string) => Promise<AttackResult>;

    // Reset
    reset: () => void;
}

// =====================================================
// STORE
// =====================================================

export const useCombatStore = create<CombatState>((set, get) => ({
    jobDefinitions: [],
    isLoadingDefinitions: false,

    // ===== LOAD =====

    loadJobDefinitions: async () => {
        set({ isLoadingDefinitions: true });
        try {
            const { data, error } = await callRpc<JobDefinition[]>('get_job_definitions', {});

            if (error || !data) {
                // Fallback: try direct table access
                const { supabase } = await import('@/lib/supabase');
                const { data: tableData, error: tableError } = await supabase
                    .from('job_definitions')
                    .select('*')
                    .order('tier', { ascending: true });

                if (!tableError && tableData) {
                    set({ jobDefinitions: tableData as JobDefinition[] });
                }
            } else {
                set({ jobDefinitions: data });
            }
        } catch (error) {
            logger.error('Failed to load job definitions:', error);
        } finally {
            set({ isLoadingDefinitions: false });
        }
    },

    // ===== JOB ACTIONS =====

    completeJob: async (jobId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await callRpc<JobResult>('complete_job', {
            player_id_input: playerId,
            job_id_input: jobId,
        });

        if (error || !data) {
            logger.error('Failed to complete job:', error);
            return { success: false, message: error || 'Unknown error' };
        }

        return data;
    },

    getJobChainStatus: async () => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return null;

        const { data, error } = await callRpc<JobChainStatus>('get_job_chain_status', {
            player_id_input: playerId,
        });

        if (error || !data) {
            logger.error('Failed to get job chain status:', error);
            return null;
        }

        return data;
    },

    continueJobChain: async () => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await callRpc<{ success: boolean; message: string; diamonds_spent?: number }>('continue_job_chain', {
            player_id_input: playerId,
        });

        if (error || !data) {
            logger.error('Failed to continue job chain:', error);
            return { success: false, message: error || 'Unknown error' };
        }

        return data;
    },

    // ===== HIGH STAKES =====

    getHighStakesJobs: async () => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return [];

        const { data, error } = await callRpc<any[]>('get_high_stakes_jobs', {
            viewer_id: playerId,
        });

        if (error || !data) {
            logger.error('Failed to get high stakes jobs:', error);
            return [];
        }

        return data;
    },

    executeHighStakesJob: async (jobId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await callRpc<HighStakesResult>('execute_high_stakes_job', {
            player_id_input: playerId,
            job_id_input: jobId,
        });

        if (error || !data) {
            logger.error('Failed to execute high stakes job:', error);
            return { success: false, message: error || 'Unknown error' };
        }

        return data;
    },

    // ===== PVE COOLDOWN =====

    rushPveCooldown: async (targetId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await callRpc<{ success: boolean; message: string; diamonds_spent?: number }>('rush_pve_cooldown', {
            player_id_input: playerId,
            target_id_input: targetId,
        });

        if (error || !data) {
            logger.error('Failed to rush PvE cooldown:', error);
            return { success: false, message: error || 'Unknown error' };
        }

        return data;
    },

    // ===== PVP (BASIC) =====

    performAttack: async (defenderId) => {
        const playerId = usePlayerStore.getState().playerId;
        if (!playerId) return { success: false, message: 'Not logged in' };

        const { data, error } = await callRpc<AttackResult>('perform_attack', {
            attacker_id_input: playerId,
            defender_id_input: defenderId,
        });

        if (error || !data) {
            logger.error('Failed to perform attack:', error);
            return { success: false, message: error || 'Unknown error' };
        }

        return data;
    },

    // ===== RESET =====

    reset: () => set({
        jobDefinitions: [],
        isLoadingDefinitions: false,
    }),
}));
