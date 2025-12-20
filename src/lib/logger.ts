/**
 * Logger utility for development-only logging
 * 
 * In production builds (import.meta.env.PROD), debug logs are completely silent.
 * Error logs always show to help diagnose issues.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('[Auth] User signed in:', userId);
 *   logger.error('[RPC] Failed to call:', error);
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Debug log - only shows in development
     */
    debug: (...args: unknown[]): void => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Info log - only shows in development
     */
    info: (...args: unknown[]): void => {
        if (isDev) {
            console.info(...args);
        }
    },

    /**
     * Warning log - only shows in development
     */
    warn: (...args: unknown[]): void => {
        if (isDev) {
            console.warn(...args);
        }
    },

    /**
     * Error log - always shows (helps diagnose production issues)
     */
    error: (...args: unknown[]): void => {
        console.error(...args);
    },
};

export default logger;
