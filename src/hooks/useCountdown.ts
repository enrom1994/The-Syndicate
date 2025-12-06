import { useState, useEffect, useCallback } from 'react';

interface CountdownResult {
    timeLeft: number;
    formatted: string;
    isExpired: boolean;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

/**
 * Hook for countdown timer with auto-update every second
 * @param targetTime - Target timestamp (ms) or duration in seconds
 * @param isTimestamp - If true, targetTime is treated as a timestamp. If false, as duration from now.
 */
export const useCountdown = (targetTime: number, isTimestamp = true): CountdownResult => {
    const calculateTimeLeft = useCallback(() => {
        const target = isTimestamp ? targetTime : Date.now() + targetTime * 1000;
        const difference = target - Date.now();
        return Math.max(0, Math.floor(difference / 1000));
    }, [targetTime, isTimestamp]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

    useEffect(() => {
        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            if (newTimeLeft <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    // Format based on duration
    let formatted: string;
    if (days > 0) {
        formatted = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        formatted = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        formatted = `${minutes}m ${seconds}s`;
    } else {
        formatted = `${seconds}s`;
    }

    return {
        timeLeft,
        formatted,
        isExpired: timeLeft <= 0,
        days,
        hours,
        minutes,
        seconds,
    };
};

/**
 * Format a duration in seconds to a readable string
 */
export const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return '0s';

    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

/**
 * Calculate time until next energy regeneration
 */
export const useEnergyRegen = (
    currentEnergy: number,
    maxEnergy: number,
    regenRateSeconds: number = 300 // 5 minutes per energy point
) => {
    const needsRegen = currentEnergy < maxEnergy;
    const secondsUntilNext = needsRegen ? regenRateSeconds : 0;
    const secondsUntilFull = needsRegen
        ? (maxEnergy - currentEnergy) * regenRateSeconds
        : 0;

    const [countdown, setCountdown] = useState(secondsUntilNext);

    useEffect(() => {
        if (!needsRegen) {
            setCountdown(0);
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Reset to full regen time (would trigger energy +1 in real app)
                    return regenRateSeconds;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [needsRegen, regenRateSeconds]);

    return {
        needsRegen,
        nextRegenIn: formatDuration(countdown),
        fullRegenIn: formatDuration(secondsUntilFull),
    };
};
