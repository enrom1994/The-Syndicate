import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/hooks/useGameStore';

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
                useGameStore.getState().setPlayerId(null);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('players')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                console.error('Error refetching player:', fetchError);
                return;
            }

            if (data) {
                setPlayer(data);
                // Also sync to GameStore
                useGameStore.getState().setPlayerStats({
                    cash: data.cash,
                    diamonds: data.diamonds,
                    energy: data.energy,
                    maxEnergy: data.max_energy,
                    stamina: data.stamina,
                    maxStamina: data.max_stamina,
                    level: data.level,
                    respect: data.respect
                });
            }

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

            // Debug logging
            console.log('[Auth] Telegram WebApp:', !!tg);
            console.log('[Auth] initData present:', !!tg?.initData);
            console.log('[Auth] initData length:', tg?.initData?.length || 0);
            console.log('[Auth] initDataUnsafe.user:', tg?.initDataUnsafe?.user);

            if (!tg?.initData || tg.initData.length === 0) {
                // Development fallback - create mock player
                console.warn('[Auth] No Telegram initData - using development mode');
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
            console.log('[Auth] Calling Edge Function via supabase.functions.invoke...');

            // Use supabase.functions.invoke for automatic header handling (including Auth)
            const { data, error: invokeError } = await supabase.functions.invoke('telegram-auth', {
                body: { initData: tg.initData }
            });

            if (invokeError) {
                console.error('[Auth] Function invocation error:', invokeError);
                console.log('[Auth] Error details:', JSON.stringify(invokeError));
                throw invokeError;
            }

            console.log('[Auth] Edge Function success. Player Data:', data.player);
            console.log('[Auth] Player Cash from Function:', data.player?.cash);

            const { token, player: playerData } = data;

            // Set the session in Supabase
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: token,
                refresh_token: token,
            });

            if (sessionError) {
                // Only log if it's NOT the expected "Auth session missing" or 403 error we get in this dev mode
                const isExpectedError = sessionError.message?.includes('Auth session missing') ||
                    sessionError.message?.includes('403') ||
                    JSON.stringify(sessionError).includes('403');

                if (!isExpectedError) {
                    console.warn('[Auth] Session warning:', sessionError);
                }
            }

            setPlayer(playerData);

            // Sync to GameStore
            console.log('[Auth] Syncing to GameStore. Cash:', playerData.cash);
            useGameStore.getState().setPlayerId(playerData.id);
            useGameStore.getState().setPlayerStats({
                cash: playerData.cash,
                diamonds: playerData.diamonds,
                energy: playerData.energy,
                maxEnergy: playerData.max_energy,
                stamina: playerData.stamina,
                maxStamina: playerData.max_stamina,
                level: playerData.level,
                respect: playerData.respect
            });

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
            console.log('[Auth] Event:', event, 'Session:', !!session);
            if (event === 'SIGNED_IN' && session) {
                await refetchPlayer();
            } else if (event === 'SIGNED_OUT') {
                setPlayer(null);
            } else if (event === 'TOKEN_REFRESHED' && session) {
                // Token was refreshed - refetch player to ensure data is current
                await refetchPlayer();
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
