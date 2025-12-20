import { motion } from 'framer-motion';
import { Clock, Loader2, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RankBadge, RankName } from '@/components/RankBadge';
import type { PveTarget } from './types';

interface PveTargetCardProps {
    target: PveTarget;
    isProcessing: boolean;
    delay?: number;
    onAttack: () => void;
}

export const PveTargetCard = ({
    target,
    isProcessing,
    delay = 0,
    onAttack
}: PveTargetCardProps) => {
    const difficultyColor = {
        easy: 'text-green-500 border-green-500/30',
        medium: 'text-yellow-500 border-yellow-500/30',
        hard: 'text-orange-500 border-orange-500/30',
        expert: 'text-red-500 border-red-500/30',
    }[target.difficulty] || 'text-gray-500';

    const formatCooldown = (seconds: number) => {
        if (seconds <= 0) return '';
        const mins = Math.ceil(seconds / 60);
        return `${mins}m`;
    };

    // Get required rank (fallback to Street Thug if not set)
    const requiredRank = (target.required_rank || 'Street Thug') as RankName;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card p-4"
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{target.name}</h3>
                    <p className="text-xs text-muted-foreground">{target.description}</p>
                </div>
                <span className={`text-xs font-medium uppercase px-2 py-0.5 border rounded ${difficultyColor}`}>
                    {target.difficulty}
                </span>
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/cash.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Cash</span>
                    </div>
                    <p className="font-bold text-green-400">${target.cash_reward.toLocaleString()}</p>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/respect.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Respect</span>
                    </div>
                    <p className="font-bold text-cyan-400">+{target.respect_reward}</p>
                </div>
            </div>

            {/* Requirements Row - Now with Rank */}
            <div className="flex items-center justify-center gap-3 mb-3 text-xs text-muted-foreground bg-muted/20 rounded p-2">
                <div className="flex items-center gap-1">
                    <img src="/images/icons/stamina.png" alt="" className="w-3.5 h-3.5" />
                    <span>{target.stamina_cost}</span>
                </div>
                {requiredRank !== 'Street Thug' && (
                    <>
                        <span className="text-muted-foreground/50">•</span>
                        <div className="flex items-center gap-1">
                            <RankBadge rank={requiredRank} size="sm" />
                            <span>{requiredRank}+</span>
                        </div>
                    </>
                )}
            </div>

            <Button
                className="w-full btn-gold text-xs"
                onClick={onAttack}
                disabled={isProcessing || !target.is_available || !target.player_meets_level}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : !target.player_meets_level ? (
                    `Requires ${requiredRank} Rank`
                ) : !target.is_available ? (
                    <>
                        <Clock className="w-4 h-4 mr-1" />
                        {formatCooldown(target.cooldown_remaining_seconds)}
                    </>
                ) : (
                    <>
                        <Skull className="w-4 h-4 mr-1" />
                        Attack
                    </>
                )}
            </Button>
        </motion.div>
    );
};

export default PveTargetCard;
