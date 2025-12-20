import { motion } from 'framer-motion';
import { Clock, Loader2, Star, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RankBadge, RankName } from '@/components/RankBadge';
import type { HighStakesJob } from './types';

interface HighStakesCardProps {
    job: HighStakesJob;
    isProcessing: boolean;
    delay?: number;
    onExecute: () => void;
}

export const HighStakesCard = ({ job, isProcessing, delay = 0, onExecute }: HighStakesCardProps) => {
    const formatCooldown = (seconds: number) => {
        if (seconds <= 0) return '';
        const mins = Math.floor(seconds / 60);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}m`;
    };

    // Get required rank (fallback to Street Thug if not set)
    const requiredRank = (job.required_rank || 'Street Thug') as RankName;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card p-4 border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/10 to-orange-900/5"
        >
            {/* Premium Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                            <Star className="w-3.5 h-3.5 text-yellow-100" />
                        </div>
                        <h3 className="font-cinzel font-bold text-sm text-primary">{job.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{job.description}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600/30 to-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 rounded-full text-xs">
                    <img src="/images/icons/diamond.png" alt="" className="w-4 h-4" />
                    <span className="text-cyan-400 font-bold">{job.entry_cost_diamonds}</span>
                </div>
            </div>

            {/* Rewards Grid with Enhanced Styling */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="bg-green-500/15 border border-green-500/30 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/cash.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Reward</span>
                    </div>
                    <p className="font-bold text-green-400">${job.cash_reward.toLocaleString()}</p>
                </div>
                <div className="bg-cyan-500/15 border border-cyan-500/30 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/respect.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Respect</span>
                    </div>
                    <p className="font-bold text-cyan-400">+{job.respect_reward || job.xp_reward || 0}</p>
                </div>
                <div className="bg-red-500/15 border border-red-500/30 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Target className="w-3 h-3 text-red-400" />
                        <span className="text-muted-foreground text-[10px]">Success</span>
                    </div>
                    <p className="font-bold text-red-400">{job.success_rate}%</p>
                </div>
            </div>

            {/* Requirements Row - Now with Rank */}
            <div className="flex items-center justify-center gap-3 mb-3 text-xs text-muted-foreground bg-muted/20 rounded p-2">
                <div className="flex items-center gap-1">
                    <img src="/images/icons/energy.png" alt="" className="w-3.5 h-3.5" />
                    <span>{job.energy_cost}</span>
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
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-xs font-bold"
                onClick={onExecute}
                disabled={isProcessing || !job.is_available || !job.player_meets_level}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : !job.player_meets_level ? (
                    `Requires ${requiredRank} Rank`
                ) : !job.is_available ? (
                    <>
                        <Clock className="w-4 h-4 mr-1" />
                        {formatCooldown(job.cooldown_remaining_seconds)}
                    </>
                ) : (
                    <>
                        <img src="/images/icons/diamond.png" alt="" className="w-4 h-4 mr-1" />
                        Enter ({job.entry_cost_diamonds})
                    </>
                )}
            </Button>
        </motion.div>
    );
};

export default HighStakesCard;
