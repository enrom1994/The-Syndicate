import { useState, useEffect } from 'react';

/**
 * Hook for stamina regeneration display
 * Stamina regenerates at 1 point per 4 minutes (240000ms)
 */
export const useStaminaRegen = (initialStamina: number, maxStamina: number, regenRateMs: number = 240000) => {
    const [stamina, setStamina] = useState(initialStamina);
    const [nextRegen, setNextRegen] = useState<number>(Date.now() + regenRateMs);
    const [tick, setTick] = useState(0); // Force re-render every second

    // Sync stamina when initialStamina changes (e.g., from refetch)
    useEffect(() => {
        setStamina(initialStamina);
    }, [initialStamina]);

    useEffect(() => {
        if (stamina >= maxStamina) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now >= nextRegen) {
                setStamina(prev => Math.min(prev + 1, maxStamina));
                setNextRegen(now + regenRateMs);
            }
            // Tick every second to update the countdown display
            setTick(t => t + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [stamina, maxStamina, nextRegen, regenRateMs]);

    const timeToNext = Math.max(0, nextRegen - Date.now());
    const minutes = Math.floor(timeToNext / 60000);
    const seconds = Math.floor((timeToNext % 60000) / 1000);
    const formattedTime = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

    return {
        stamina,
        setStamina,
        formattedTime: stamina >= maxStamina ? 'Full' : formattedTime,
        progress: (stamina / maxStamina) * 100
    };
};
