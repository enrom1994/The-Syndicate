import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/hooks/useGameStore';
import { logger } from '@/lib/logger';

// Session refresh interval (30 minutes)
const SESSION_REFRESH_INTERVAL = 30 * 60 * 1000;

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
    auto_collect_businesses: boolean;
    created_at: string;
    updated_at: string;
    starter_pack_claimed: boolean | null;
    founder_bonus_claimed?: boolean | null;
    injured_crew?: number;
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
    const [sessionValid, setSessionValid] = useState(false);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastLoginTimeRef = useRef<number>(0);

    const refetchPlayer = useCallback(async () => {
        logger.debug('[Auth] refetchPlayer called');
        try {
            let userId: string | null = null;

            // First try to get user from auth
            const { data: { user } } = await supabase.auth.getUser();

            if (user?.id) {
                logger.debug('[Auth] getUser result: User found');
                userId = user.id;
            } else {
                // Fallback: use existing player ID if we have one
                // This handles cases where session expired but we still have player data
                const currentPlayerId = player?.id || useGameStore.getState().playerId;
                if (currentPlayerId) {
                    logger.debug('[Auth] No auth user, falling back to stored player ID:', currentPlayerId);
                    userId = currentPlayerId;
                } else {
                    logger.debug('[Auth] No user in refetchPlayer and no stored player ID');
                    return;
                }
            }

            const { data, error: fetchError } = await supabase
                .from('players')
                .select('*')
                .eq('id', userId)
                .single();

            if (fetchError) {
                logger.error('[Auth] Error refetching player:', fetchError);
                return;
            }

            if (data) {
                logger.debug('[Auth] Player data fetched, cash:', data.cash, 'diamonds:', data.diamonds);
                setPlayer(data as Player);
                setSessionValid(true);
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
            logger.error('[Auth] Error in refetchPlayer:', err);
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
            logger.debug('[Auth] Telegram WebApp:', !!tg);
            logger.debug('[Auth] initData present:', !!tg?.initData);
            logger.debug('[Auth] initData length:', tg?.initData?.length || 0);
            logger.debug('[Auth] initDataUnsafe.user:', tg?.initDataUnsafe?.user);

            if (!tg?.initData || tg.initData.length === 0) {
                // No Telegram data - reject authentication
                logger.error('[Auth] No Telegram initData - authentication rejected');
                setError('This app must be opened from Telegram');
                setIsLoading(false);
                return;
            }

            // Call Telegram auth Edge Function
            logger.debug('[Auth] Calling Edge Function via supabase.functions.invoke...');

            // Use supabase.functions.invoke for automatic header handling (including Auth)
            const { data, error: invokeError } = await supabase.functions.invoke('telegram-auth', {
                body: { initData: tg.initData }
            });

            if (invokeError) {
                logger.error('[Auth] Function invocation error:', invokeError);
                logger.debug('[Auth] Error details:', JSON.stringify(invokeError));
                throw invokeError;
            }

            logger.debug('[Auth] Edge Function success. Player Data:', data.player);
            logger.debug('[Auth] Player Cash from Function:', data.player?.cash);

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
                    logger.warn('[Auth] Session warning:', sessionError);
                }
            }

            setPlayer(playerData);

            // Sync to GameStore
            logger.debug('[Auth] Syncing to GameStore. Cash:', playerData.cash);
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

            setSessionValid(true);
            lastLoginTimeRef.current = Date.now();
            setError(null);
        } catch (err: any) {
            logger.error('Login error:', err);
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
            logger.debug('[Auth] Event:', event, 'Session:', !!session, 'Time:', new Date().toISOString());

            if (event === 'SIGNED_IN' && session) {
                logger.debug('[Auth] SIGNED_IN - refreshing player');
                setSessionValid(true);
                await refetchPlayer();
            } else if (event === 'SIGNED_OUT') {
                logger.debug('[Auth] SIGNED_OUT detected');
                // IMPORTANT: Don't clear player data immediately!
                // Our custom JWT doesn't support Supabase's native refresh.
                // Instead, try to re-authenticate with Telegram.
                const tg = window.Telegram?.WebApp;
                if (tg?.initData && tg.initData.length > 0) {
                    logger.debug('[Auth] Telegram available - re-authenticating instead of signing out');
                    setSessionValid(false);
                    // Trigger re-authentication without clearing player state
                    try {
                        await loginWithTelegram();
                    } catch (err) {
                        logger.error('[Auth] Re-auth failed, clearing player:', err);
                        setPlayer(null);
                        setSessionValid(false);
                    }
                } else {
                    // Only clear if we're truly signing out (no Telegram available)
                    logger.debug('[Auth] No Telegram - clearing player');
                    setPlayer(null);
                    setSessionValid(false);
                }
            } else if (event === 'TOKEN_REFRESHED' && session) {
                logger.debug('[Auth] TOKEN_REFRESHED - session still valid');
                setSessionValid(true);
                // Token was refreshed - refetch player to ensure data is current
                await refetchPlayer();
            } else if (event === 'INITIAL_SESSION') {
                logger.debug('[Auth] INITIAL_SESSION - session present:', !!session);
                if (session) {
                    setSessionValid(true);
                    await refetchPlayer();
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [loginWithTelegram, refetchPlayer]);

    // Session refresh effect - re-authenticate before token expires
    useEffect(() => {
        // Clear any existing timer
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
        }

        // Only start refresh timer if we have a valid session
        if (sessionValid && player) {
            logger.debug('[Auth] Starting session refresh timer (30 min interval)');

            refreshTimerRef.current = setInterval(async () => {
                const timeSinceLastLogin = Date.now() - lastLoginTimeRef.current;
                logger.debug('[Auth] Checking session age:', Math.round(timeSinceLastLogin / 60000), 'minutes');

                // Re-authenticate if more than 25 minutes have passed
                // (5 min buffer before the 30 min mark)
                if (timeSinceLastLogin > 25 * 60 * 1000) {
                    logger.debug('[Auth] Session nearing expiry - re-authenticating...');
                    try {
                        // Don't show loading state during background refresh
                        await loginWithTelegram();
                        logger.debug('[Auth] Session refreshed successfully');
                    } catch (err) {
                        logger.error('[Auth] Failed to refresh session:', err);
                    }
                }
            }, 60 * 1000); // Check every minute
        }

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [sessionValid, player, loginWithTelegram]);

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
