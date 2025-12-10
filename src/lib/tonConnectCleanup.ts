/**
 * TON Connect Cleanup Utility
 * 
 * Clears TON Connect localStorage data when a different Telegram user
 * opens the app to prevent wallet sharing between users.
 */

// Keys used by TON Connect SDK that need to be cleared on user switch
const TON_CONNECT_KEYS = [
    'ton-connect-storage_bridge-connection',
    'ton-connect-ui_last-selected-wallet-info',
    'ton-connect-storage_http-bridge-gateway',
    'ton-connect-ui_preferred-wallet',
];

// Key we use to track the last known Telegram user
const USER_ID_KEY = 'ton-connect-user-id';

/**
 * Check if the current Telegram user differs from the last known user.
 * If so, clear all TON Connect storage to prevent wallet sharing.
 * 
 * @param currentTelegramId - The current Telegram user's ID
 * @returns true if cleanup was performed (different user detected)
 */
export function cleanupTonConnectForUser(currentTelegramId: number | string): boolean {
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    const currentIdString = String(currentTelegramId);

    if (storedUserId && storedUserId !== currentIdString) {
        // Different user detected - clear all TON Connect data
        console.log('[TonConnect] User switch detected:', storedUserId, '->', currentIdString);
        console.log('[TonConnect] Clearing stale wallet connection data...');

        TON_CONNECT_KEYS.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                console.log(`[TonConnect] Removing key: ${key}`);
                localStorage.removeItem(key);
            }
        });

        // Update stored user ID
        localStorage.setItem(USER_ID_KEY, currentIdString);
        return true;
    }

    // Same user or first time - just store the ID
    if (!storedUserId) {
        console.log('[TonConnect] First user login, storing ID:', currentIdString);
    }
    localStorage.setItem(USER_ID_KEY, currentIdString);
    return false;
}

/**
 * Get the current stored user ID (for debugging)
 */
export function getStoredTonConnectUserId(): string | null {
    return localStorage.getItem(USER_ID_KEY);
}

/**
 * Force clear all TON Connect data (useful for logout scenarios)
 */
export function forceCleanupTonConnect(): void {
    console.log('[TonConnect] Force clearing all wallet data...');
    TON_CONNECT_KEYS.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(USER_ID_KEY);
}
