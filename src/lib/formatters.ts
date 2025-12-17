/**
 * Shared formatting utilities for time, currency, and display values
 */

/**
 * Format cooldown time in human-readable format
 * @param seconds - Remaining time in seconds
 * @returns Formatted string like "2h 14m" or "45m"
 */
export const formatCooldownTime = (seconds: number): string => {
    if (seconds <= 0) return '';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
};

/**
 * Format cooldown duration from minutes
 * @param minutes - Duration in minutes
 * @returns Formatted string like "2h" or "30m"
 */
export const formatCooldownMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
};

/**
 * Format large cash values in readable format
 * @param value - Cash amount
 * @returns Formatted string like "$1.5M" or "$500K"
 */
export const formatCash = (value: number): string => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
};

/**
 * Format net worth for compact display
 * @param cash - Cash amount
 * @returns Formatted string like "$1.5M"
 */
export const formatNetWorth = (cash: number): string => {
    if (cash >= 1000000) return `$${(cash / 1000000).toFixed(1)}M`;
    if (cash >= 1000) return `$${(cash / 1000).toFixed(1)}K`;
    return `$${cash}`;
};

/**
 * Calculate remaining time from a timestamp
 * @param lastTime - ISO timestamp of last action
 * @param cooldownMinutes - Total cooldown in minutes
 * @returns Remaining time in minutes
 */
export const getTimeRemainingMinutes = (lastTime: string, cooldownMinutes: number): number => {
    const lastDate = new Date(lastTime);
    const now = new Date();
    const minutesPassed = (now.getTime() - lastDate.getTime()) / (1000 * 60);
    return Math.max(0, cooldownMinutes - minutesPassed);
};

/**
 * Get cooldown remaining as formatted string
 * @param lastTime - ISO timestamp of last action
 * @param cooldownMinutes - Total cooldown in minutes
 * @returns Formatted string like "1h 30m" or empty string if ready
 */
export const getCooldownRemaining = (lastTime: string | undefined, cooldownMinutes: number): string => {
    if (!lastTime) return '';
    const remaining = getTimeRemainingMinutes(lastTime, cooldownMinutes);
    if (remaining <= 0) return '';
    const hours = Math.floor(remaining / 60);
    const mins = Math.floor(remaining % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
};
