import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface UseRealtimeOptions {
    onPlayerUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onAttackReceived?: (payload: RealtimePostgresChangesPayload<any>) => void;
    enabled?: boolean;
}

/**
 * Hook to subscribe to real-time database changes
 * Automatically subscribes to player data changes for the current user
 */
export const useRealtime = ({
    onPlayerUpdate,
    onAttackReceived,
    enabled = true,
}: UseRealtimeOptions = {}) => {
    const { player, refetchPlayer } = useAuth();

    useEffect(() => {
        if (!enabled || !player?.id) return;

        // Subscribe to player changes (for balance updates, etc.)
        const playerChannel = supabase
            .channel(`player-${player.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'players',
                    filter: `id=eq.${player.id}`,
                },
                (payload) => {
                    logger.debug('Player updated:', payload);
                    if (onPlayerUpdate) {
                        onPlayerUpdate(payload);
                    }
                    // Refetch player data to update UI
                    refetchPlayer();
                }
            )
            .subscribe();

        // Subscribe to attack log for notifications
        const attackChannel = supabase
            .channel(`attacks-${player.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'attack_log',
                    filter: `defender_id=eq.${player.id}`,
                },
                (payload) => {
                    logger.debug('Attack received:', payload);
                    if (onAttackReceived) {
                        onAttackReceived(payload);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(playerChannel);
            supabase.removeChannel(attackChannel);
        };
    }, [enabled, player?.id, onPlayerUpdate, onAttackReceived, refetchPlayer]);
};

/**
 * Hook to subscribe to family chat messages
 */
export const useFamilyChat = (familyId: string | null, onNewMessage?: (message: any) => void) => {
    useEffect(() => {
        if (!familyId) return;

        const channel = supabase
            .channel(`family-chat-${familyId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'family_messages',
                    filter: `family_id=eq.${familyId}`,
                },
                (payload) => {
                    if (onNewMessage) {
                        onNewMessage(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [familyId, onNewMessage]);
};

/**
 * Hook to subscribe to leaderboard updates (for live rankings)
 */
export const useLeaderboardRealtime = (onUpdate?: () => void) => {
    useEffect(() => {
        // Subscribe to player changes that affect leaderboard
        const channel = supabase
            .channel('leaderboard-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'players',
                },
                () => {
                    // Debounce the updates to avoid too many refreshes
                    if (onUpdate) {
                        onUpdate();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [onUpdate]);
};
