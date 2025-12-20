/**
 * Player Store - Core player state and currency management
 * 
 * Handles: playerId, playerStats, currency actions, bank operations
 */

import { create } from 'zustand';
import { callRpc } from '@/lib/rpcHelper';
import { logger } from '@/lib/logger';
import type { PlayerStats } from './types';

// =====================================================
// TYPES
// =====================================================

interface PlayerState {
    playerId: string | null;
    playerStats: PlayerStats;

    // Actions
    setPlayerId: (id: string | null) => void;
    setPlayerStats: (stats: Partial<PlayerStats>) => void;

    // Currency (via RPCs)
    spendCash: (amount: number, reason: string) => Promise<boolean>;
    spendDiamonds: (amount: number, reason: string) => Promise<boolean>;
    useEnergy: (amount: number) => Promise<boolean>;
    useStamina: (amount: number) => Promise<boolean>;

    // Bank
    deposit: (amount: number) => Promise<boolean>;
    withdraw: (amount: number) => Promise<boolean>;

    // Reset
    reset: () => void;
}

// =====================================================
// DEFAULT STATE
// =====================================================

const defaultStats: PlayerStats = {
    cash: 0,
    diamonds: 0,
    energy: 0,
    maxEnergy: 100,
    stamina: 0,
    maxStamina: 100,
    level: 1,
    respect: 0,
    bankedCash: 0,
};

// =====================================================
// STORE
// =====================================================

export const usePlayerStore = create<PlayerState>((set, get) => ({
    playerId: null,
    playerStats: { ...defaultStats },

    setPlayerId: (id) => set({ playerId: id }),

    setPlayerStats: (stats) => set((state) => ({
        playerStats: { ...state.playerStats, ...stats }
    })),

    // ===== CURRENCY ACTIONS =====

    spendCash: async (amount, reason) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await callRpc<boolean>('spend_cash', {
            player_id_input: playerId,
            amount,
            reason,
        });

        if (error) {
            logger.error('Failed to spend cash:', error);
            return false;
        }

        return data === true;
    },

    spendDiamonds: async (amount, reason) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await callRpc<boolean>('spend_diamonds', {
            player_id_input: playerId,
            amount,
            reason,
        });

        if (error) {
            logger.error('Failed to spend diamonds:', error);
            return false;
        }

        return data === true;
    },

    useEnergy: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await callRpc<boolean>('use_energy', {
            player_id_input: playerId,
            amount,
        });

        if (error) {
            logger.error('Failed to use energy:', error);
            return false;
        }

        return data === true;
    },

    useStamina: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await callRpc<boolean>('use_stamina', {
            player_id_input: playerId,
            amount,
        });

        if (error) {
            logger.error('Failed to use stamina:', error);
            return false;
        }

        return data === true;
    },

    // ===== BANK ACTIONS =====

    deposit: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await callRpc<{ success: boolean }>('bank_deposit', {
            player_id_input: playerId,
            amount_input: amount,
        });

        if (error) {
            logger.error('Failed to deposit:', error);
            return false;
        }

        return data?.success === true;
    },

    withdraw: async (amount) => {
        const { playerId } = get();
        if (!playerId) return false;

        const { data, error } = await callRpc<{ success: boolean }>('bank_withdraw', {
            player_id_input: playerId,
            amount_input: amount,
        });

        if (error) {
            logger.error('Failed to withdraw:', error);
            return false;
        }

        return data?.success === true;
    },

    // ===== RESET =====

    reset: () => set({
        playerId: null,
        playerStats: { ...defaultStats },
    }),
}));

// Export getters for non-React usage
export const getPlayerId = () => usePlayerStore.getState().playerId;
export const getPlayerStats = () => usePlayerStore.getState().playerStats;
