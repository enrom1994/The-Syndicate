import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

// Season start date: 14 days from initial deployment
// This is set once and doesn't change on page reload
const SEASON_START_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

interface CountdownTime {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
}

const calculateTimeRemaining = (targetDate: Date): CountdownTime => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
};

export const SeasonBanner = () => {
    const [countdown, setCountdown] = useState<CountdownTime>(() => calculateTimeRemaining(SEASON_START_DATE));

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(calculateTimeRemaining(SEASON_START_DATE));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num: number): string => num.toString().padStart(2, '0');

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-4 mb-4"
        >
            {/* Main Banner with blur effect */}
            <div className="relative overflow-hidden rounded-lg border border-primary/30">
                {/* Blurred background layer */}
                <div
                    className="absolute inset-0 bg-gradient-to-r from-muted/40 via-primary/20 to-muted/40"
                    style={{ filter: 'blur(8px)' }}
                />

                {/* Dark overlay for contrast */}
                <div className="absolute inset-0 bg-black/50" />

                {/* Content overlay */}
                <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center">
                    {countdown.isExpired ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h3 className="font-cinzel font-bold text-xl text-primary tracking-wider">
                                Season Starting…
                            </h3>
                        </motion.div>
                    ) : (
                        <>
                            <h3 className="font-cinzel font-bold text-lg text-primary tracking-wider mb-3">
                                Season Begins Soon
                            </h3>

                            {/* Countdown Timer */}
                            <div className="flex items-center gap-1 mb-3">
                                <Clock className="w-4 h-4 text-muted-foreground mr-1" />
                                <div className="flex items-center gap-1 font-inter font-bold text-lg text-foreground">
                                    <span className="bg-muted/30 px-2 py-1 rounded">{formatNumber(countdown.days)}</span>
                                    <span className="text-muted-foreground">d</span>
                                    <span className="bg-muted/30 px-2 py-1 rounded">{formatNumber(countdown.hours)}</span>
                                    <span className="text-muted-foreground">h</span>
                                    <span className="bg-muted/30 px-2 py-1 rounded">{formatNumber(countdown.minutes)}</span>
                                    <span className="text-muted-foreground">m</span>
                                    <span className="bg-muted/30 px-2 py-1 rounded text-sm">{formatNumber(countdown.seconds)}</span>
                                    <span className="text-muted-foreground text-sm">s</span>
                                </div>
                            </div>

                            {/* Subtext */}
                            <p className="text-xs text-muted-foreground italic">
                                Prepare your Family.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

interface EnergyBarProps {
    energy: number;
    maxEnergy: number;
    regenTime?: string;
}

export const EnergyBar = ({ energy, maxEnergy, regenTime = '2m 30s' }: EnergyBarProps) => {
    const energyPercent = (energy / maxEnergy) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="noir-card p-2.5"
        >
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <img src="/images/icons/energy.png" alt="Energy" className="w-4 h-4 object-contain" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Energy</span>
                </div>
                <span className="font-inter font-medium text-xs text-orange-400">{energy}/{maxEnergy}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${energyPercent}%` }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-orange-400 rounded-full"
                />
            </div>
            {energy < maxEnergy && (
                <p className="text-[9px] text-muted-foreground mt-1 text-right">+1 in {regenTime}</p>
            )}
        </motion.div>
    );
};

interface StaminaBarProps {
    stamina: number;
    maxStamina: number;
    regenTime?: string;
}

export const StaminaBar = ({ stamina, maxStamina, regenTime = '4m 00s' }: StaminaBarProps) => {
    const staminaPercent = (stamina / maxStamina) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="noir-card p-2.5"
        >
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <img src="/images/icons/stamina.png" alt="Stamina" className="w-4 h-4 object-contain" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Stamina</span>
                </div>
                <span className="font-inter font-medium text-xs text-cyan-400">{stamina}/{maxStamina}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${staminaPercent}%` }}
                    transition={{ duration: 1, delay: 0.85 }}
                    className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-cyan-400 rounded-full"
                />
            </div>
            {stamina < maxStamina && (
                <p className="text-[9px] text-muted-foreground mt-1 text-right">+1 in {regenTime}</p>
            )}
        </motion.div>
    );
};

