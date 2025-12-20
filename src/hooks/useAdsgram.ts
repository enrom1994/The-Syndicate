/**
 * useAdsgram - Adsgram Rewarded Ads Hook
 * 
 * Handles Adsgram SDK initialization and ad display for Telegram Mini Apps.
 * Rewards are granted via backend SSV (Server-Side Verification) only.
 * SDK callbacks are for UX feedback only, not payment authority.
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';

// Adsgram SDK types (minimal subset for rewarded ads)
interface AdController {
    show: () => Promise<{ done: boolean; description: string; state: 'load' | 'render' | 'playing' | 'destroy'; error: boolean }>;
    addEventListener: (event: string, callback: () => void) => void;
    removeEventListener: (event: string, callback: () => void) => void;
}

interface AdsgramSDK {
    init: (config: { blockId: string; debug?: boolean }) => AdController;
}

declare global {
    interface Window {
        Adsgram?: AdsgramSDK;
    }
}

interface UseAdsgramOptions {
    onReward?: () => void;      // UX callback only - not payment authority
    onStart?: () => void;
    onClose?: () => void;
    onError?: (error: Error) => void;
}

interface UseAdsgramReturn {
    showAd: () => Promise<boolean>;
    isLoading: boolean;
    isShowing: boolean;
    isAvailable: boolean;
    error: string | null;
}

export function useAdsgram(options: UseAdsgramOptions = {}): UseAdsgramReturn {
    const { onReward, onStart, onClose, onError } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [isShowing, setIsShowing] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const adControllerRef = useRef<AdController | null>(null);
    const blockId = import.meta.env.VITE_ADSGRAM_BLOCK_ID;

    // Check if we're in Telegram Mini App environment
    const isTelegramMiniApp = typeof window !== 'undefined' &&
        window.Telegram?.WebApp !== undefined;

    // Initialize SDK on mount
    useEffect(() => {
        if (!isTelegramMiniApp) {
            setError('Ads only available in Telegram');
            setIsAvailable(false);
            return;
        }

        if (!blockId) {
            logger.warn('[useAdsgram] VITE_ADSGRAM_BLOCK_ID not configured');
            setError('Ad configuration missing');
            setIsAvailable(false);
            return;
        }

        // Check if Adsgram SDK is loaded
        if (!window.Adsgram) {
            // SDK should be loaded via script tag - wait a bit and retry
            const checkInterval = setInterval(() => {
                if (window.Adsgram) {
                    clearInterval(checkInterval);
                    initializeAds();
                }
            }, 500);

            // Give up after 5 seconds
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.Adsgram) {
                    logger.warn('[useAdsgram] Adsgram SDK not loaded');
                    setError('Ad SDK not available');
                    setIsAvailable(false);
                }
            }, 5000);

            return () => {
                clearInterval(checkInterval);
                clearTimeout(timeout);
            };
        } else {
            initializeAds();
        }

        function initializeAds() {
            try {
                adControllerRef.current = window.Adsgram!.init({
                    blockId,
                    debug: import.meta.env.MODE === 'development',
                });
                setIsAvailable(true);
                setError(null);
                logger.debug('[useAdsgram] SDK initialized successfully');
            } catch (err) {
                logger.error('[useAdsgram] Failed to initialize SDK:', err);
                setError('Failed to initialize ads');
                setIsAvailable(false);
            }
        }
    }, [isTelegramMiniApp, blockId]);

    // Show rewarded ad
    const showAd = useCallback(async (): Promise<boolean> => {
        if (!adControllerRef.current) {
            logger.warn('[useAdsgram] SDK not initialized');
            const err = new Error('Ad SDK not initialized');
            onError?.(err);
            return false;
        }

        if (isShowing) {
            logger.warn('[useAdsgram] Ad already showing');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            setIsShowing(true);
            onStart?.();

            const result = await adControllerRef.current.show();

            if (result.done && !result.error) {
                // User completed the ad - trigger UX callback
                // NOTE: This is NOT payment authority - backend SSV handles rewards
                logger.debug('[useAdsgram] Ad completed successfully');
                onReward?.();
                return true;
            } else {
                // User closed early or error occurred
                logger.debug('[useAdsgram] Ad closed or errored:', result.description);
                onClose?.();
                return false;
            }
        } catch (err) {
            logger.error('[useAdsgram] Error showing ad:', err);
            const error = err instanceof Error ? err : new Error('Unknown ad error');
            setError(error.message);
            onError?.(error);
            return false;
        } finally {
            setIsLoading(false);
            setIsShowing(false);
        }
    }, [isShowing, onReward, onStart, onClose, onError]);

    return {
        showAd,
        isLoading,
        isShowing,
        isAvailable,
        error,
    };
}
