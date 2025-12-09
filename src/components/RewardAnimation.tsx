import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { haptic } from '@/lib/haptics';
import { GameIcon } from './GameIcon';

type RewardType = 'cash' | 'diamonds' | 'energy' | 'item';

interface Particle {
    id: number;
    x: number;
    y: number;
    type: RewardType;
    amount: string;
}

const rewardIcons: Record<RewardType, React.ReactNode> = {
    cash: <GameIcon type="cash" className="w-8 h-8" />,
    diamonds: <GameIcon type="diamond" className="w-12 h-12" />,
    energy: <img src="/images/icons/energy.png" alt="Energy" className="w-6 h-6 object-contain" />,
    item: <Gift className="w-6 h-6 text-purple-400" />,
};

const rewardColors: Record<RewardType, string> = {
    cash: 'text-green-400',
    diamonds: 'text-blue-400',
    energy: 'text-yellow-400',
    item: 'text-purple-400',
};

interface FloatingRewardProps {
    particle: Particle;
    onComplete: (id: number) => void;
}

const FloatingReward = ({ particle, onComplete }: FloatingRewardProps) => (
    <motion.div
        initial={{ opacity: 0, scale: 0, x: particle.x, y: particle.y }}
        animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 1, 0.5],
            x: particle.x,
            y: [particle.y, particle.y - 60, particle.y - 120],
        }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        onAnimationComplete={() => onComplete(particle.id)}
        className="fixed pointer-events-none z-50 flex items-center gap-2"
        style={{ left: 0, top: 0 }}
    >
        <div className="bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg border border-border/50">
            {rewardIcons[particle.type]}
            <span className={`font-cinzel font-bold text-sm ${rewardColors[particle.type]}`}>
                +{particle.amount}
            </span>
        </div>
    </motion.div>
);

// Global reward emitter
let rewardIdCounter = 0;
const listeners: Set<(particle: Particle) => void> = new Set();

export const emitReward = (type: RewardType, amount: string, x?: number, y?: number) => {
    const particle: Particle = {
        id: ++rewardIdCounter,
        x: x ?? window.innerWidth / 2,
        y: y ?? window.innerHeight / 2,
        type,
        amount,
    };

    // Trigger haptic
    haptic.success();

    listeners.forEach(listener => listener(particle));
};

// Convenience functions
export const rewardCash = (amount: string | number, x?: number, y?: number) => {
    const formatted = typeof amount === 'number'
        ? amount >= 1000000 ? `$${(amount / 1000000).toFixed(1)}M`
            : amount >= 1000 ? `$${(amount / 1000).toFixed(0)}K`
                : `$${amount}`
        : amount;
    emitReward('cash', formatted, x, y);
};

export const rewardDiamonds = (amount: number, x?: number, y?: number) => {
    emitReward('diamonds', `${amount} 💎`, x, y);
};

export const rewardEnergy = (amount: number, x?: number, y?: number) => {
    emitReward('energy', `${amount} ⚡`, x, y);
};

/**
 * RewardAnimationProvider - Wrap your app with this to enable reward animations
 */
export const RewardAnimationProvider = ({ children }: { children: React.ReactNode }) => {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const handleNewParticle = (particle: Particle) => {
            setParticles(prev => [...prev, particle]);
        };

        listeners.add(handleNewParticle);
        return () => {
            listeners.delete(handleNewParticle);
        };
    }, []);

    const handleComplete = useCallback((id: number) => {
        setParticles(prev => prev.filter(p => p.id !== id));
    }, []);

    return (
        <>
            {children}
            <AnimatePresence>
                {particles.map(particle => (
                    <FloatingReward
                        key={particle.id}
                        particle={particle}
                        onComplete={handleComplete}
                    />
                ))}
            </AnimatePresence>
        </>
    );
};