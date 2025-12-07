import { useState, useEffect } from 'react';

export const useEnergyRegen = (initialEnergy: number, maxEnergy: number, regenRateMs: number = 60000) => {
    const [energy, setEnergy] = useState(initialEnergy);
    const [nextRegen, setNextRegen] = useState<number>(Date.now() + regenRateMs);

    useEffect(() => {
        if (energy >= maxEnergy) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now >= nextRegen) {
                setEnergy(prev => Math.min(prev + 1, maxEnergy));
                setNextRegen(now + regenRateMs);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [energy, maxEnergy, nextRegen, regenRateMs]);

    const timeToNext = Math.max(0, nextRegen - Date.now());
    const minutes = Math.floor(timeToNext / 60000);
    const seconds = Math.floor((timeToNext % 60000) / 1000);
    const formattedTime = `${minutes}m ${seconds}s`;

    return {
        energy,
        setEnergy,
        formattedTime: energy >= maxEnergy ? 'Full' : formattedTime,
        progress: (energy / maxEnergy) * 100
    };
};
