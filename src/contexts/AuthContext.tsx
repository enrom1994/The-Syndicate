import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
    id: string;
    telegram_id: number;
    username: string;
    first_name: string;
    avatar_url: string | null;
    cash: number;
    banked_cash: number;
    diamonds: number;
    respect: number;
    level: number;
    experience: number;
    energy: number;
    max_energy: number;
    stamina: number;
    max_stamina: number;
    strength: number;
    defense: number;
    agility: number;
    intelligence: number;
    total_attacks: number;
    total_attacks_won: number;
    total_jobs_completed: number;
    total_kills: number;
    protection_expires_at: string | null;
    newbie_shield_expires_at: string | null;
    last_daily_claim: string | null;
    daily_streak: number;
    created_at: string;
    updated_at: string;
}

interface AuthContextType {
    player: Player | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
    refetchPlayer: () => Promise<void>;
    loginWithTelegram: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [player, setPlayer] = useState<Player | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetchPlayer = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setPlayer(null);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('players')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                console.error('Failed to fetch player:', fetchError);
                setError('Failed to load player data');
                return;
            }

            setPlayer(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching player:', err);
            setError('Failed to load player data');
        }
    }, []);

    const loginWithTelegram = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Get Telegram WebApp initData
            const tg = window.Telegram?.WebApp;
            if (!tg?.initData) {
                // Development fallback - create mock player
                console.warn('No Telegram WebApp detected - using development mode');
                setPlayer({
                    id: 'dev-player',
                    telegram_id: 123456789,
                    username: 'DevPlayer',
                    first_name: 'Developer',
                    avatar_url: null,
                    cash: 50000,
                    banked_cash: 0,
                    diamonds: 50,
                    respect: 0,
                    level: 1,
                    experience: 0,
                    energy: 100,
                    max_energy: 100,
                    stamina: 50,
                    max_stamina: 50,
                    strength: 10,
                    defense: 10,
                    agility: 10,
                    intelligence: 10,
                    total_attacks: 0,
                    total_attacks_won: 0,
                    total_jobs_completed: 0,
                    total_kills: 0,
                    protection_expires_at: null,
                    newbie_shield_expires_at: null,
                    last_daily_claim: null,
                    daily_streak: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                setIsLoading(false);
                return;
            }

            // Call Telegram auth Edge Function
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const response = await fetch(`${supabaseUrl}/functions/v1/telegram-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData: tg.initData }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Authentication failed');
            }

            const { token, player: playerData } = await response.json();

            // Set the session in Supabase
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: token,
                refresh_token: token, // Using same token for refresh
            });

            if (sessionError) {
                throw new Error('Failed to set session');
            }

            setPlayer(playerData);
            setError(null);
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial auth check and login
    useEffect(() => {
        const initAuth = async () => {
            // Check for existing session
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Session exists, fetch player data
                await refetchPlayer();
                setIsLoading(false);
            } else {
                // No session, try Telegram login
                await loginWithTelegram();
            }
        };

        initAuth();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await refetchPlayer();
            } else if (event === 'SIGNED_OUT') {
                setPlayer(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [loginWithTelegram, refetchPlayer]);

    const value: AuthContextType = {
        player,
        isLoading,
        isAuthenticated: !!player,
        error,
        refetchPlayer,
        loginWithTelegram,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
