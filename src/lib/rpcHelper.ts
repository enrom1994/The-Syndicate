/**
 * RPC Helper - Generic wrapper for Supabase RPC calls
 * 
 * Features:
 * - Consistent error handling
 * - Automatic retry logic with exponential backoff
 * - Type-safe responses
 * - Centralized logging
 */

import { supabase } from '@/lib/supabase';

export interface RpcResult<T> {
    data: T | null;
    error: string | null;
}

export interface RpcOptions {
    /** Number of retry attempts (default: 0 = no retry) */
    retries?: number;
    /** Base delay in ms between retries (default: 1000) */
    retryDelay?: number;
    /** Whether to log errors to console (default: true) */
    logErrors?: boolean;
}

const DEFAULT_OPTIONS: RpcOptions = {
    retries: 0,
    retryDelay: 1000,
    logErrors: true,
};

/**
 * Call a Supabase RPC with consistent error handling and optional retry logic
 * 
 * @param rpcName - Name of the RPC function
 * @param params - Parameters to pass to the RPC
 * @param options - Optional retry and logging configuration
 * @returns Promise with data or error
 * 
 * @example
 * const { data, error } = await callRpc<{ success: boolean }>('buy_item', {
 *     player_id_input: playerId,
 *     item_id_input: itemId,
 * });
 */
export async function callRpc<T>(
    rpcName: string,
    params: Record<string, unknown> = {},
    options: RpcOptions = {}
): Promise<RpcResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: string | null = null;
    let attempts = 0;

    while (attempts <= (opts.retries ?? 0)) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.rpc as any)(rpcName, params);

            if (error) {
                lastError = error.message || 'Unknown RPC error';

                if (opts.logErrors) {
                    console.error(`[RPC] ${rpcName} failed (attempt ${attempts + 1}):`, error);
                }

                // Don't retry on auth errors or validation errors
                if (error.code === 'PGRST301' || error.code === '42501') {
                    break;
                }

                attempts++;
                if (attempts <= (opts.retries ?? 0)) {
                    const delay = (opts.retryDelay ?? 1000) * Math.pow(2, attempts - 1);
                    await sleep(delay);
                    continue;
                }
            } else {
                return { data: data as T, error: null };
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : 'Network error';

            if (opts.logErrors) {
                console.error(`[RPC] ${rpcName} exception (attempt ${attempts + 1}):`, err);
            }

            attempts++;
            if (attempts <= (opts.retries ?? 0)) {
                const delay = (opts.retryDelay ?? 1000) * Math.pow(2, attempts - 1);
                await sleep(delay);
                continue;
            }
        }
        break;
    }

    return { data: null, error: lastError };
}

/**
 * Helper to delay execution
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Standard RPC response type for actions that return success/message
 */
export interface RpcActionResult {
    success: boolean;
    message: string;
}

/**
 * Shorthand for common action RPCs that return { success, message }
 */
export async function callActionRpc(
    rpcName: string,
    params: Record<string, unknown> = {},
    options: RpcOptions = {}
): Promise<{ success: boolean; message: string }> {
    const { data, error } = await callRpc<RpcActionResult>(rpcName, params, options);

    if (error || !data) {
        return { success: false, message: error || 'Unknown error' };
    }

    return data;
}
