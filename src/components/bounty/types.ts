/**
 * Shared types for Bounty Board components
 */

export interface NPCBounty {
    id: string;
    type: 'npc';
    target_name: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    min_reward: number;
    max_reward: number;
    respect_reward: number;
    required_level: number;
    required_rank: string;
    cooldown_hours: number;
    available_at: string | null;
    is_available: boolean;
    player_meets_rank?: boolean;
}

export interface PlayerBounty {
    id: string;
    type: 'player';
    target_player_id: string;
    target_name: string;
    target_level: number;
    target_rank?: string;
    bounty_amount: number;
    placed_by: string;
    placed_by_player_id?: string;
    expires_at: string;
    time_remaining: number;
}

export interface MyBounty {
    id: string;
    target_player_id: string;
    target_name: string;
    target_rank?: string;
    bounty_amount: number;
    status: 'active' | 'claimed' | 'expired' | 'cancelled';
    expires_at: string;
    time_remaining: number;
    claimed_by: string | null;
}

export interface SearchResult {
    id: string;
    username: string | null;
    first_name: string | null;
    level: number;
    respect: number;
    rank?: string;
    has_active_bounty: boolean;
}

// Difficulty color mapping
export const DIFFICULTY_COLORS = {
    easy: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    hard: 'text-red-400 bg-red-500/20',
} as const;

// Time formatting helper
export const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};
