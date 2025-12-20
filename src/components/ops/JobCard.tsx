import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RankBadge, RankName, RANK_THRESHOLDS, getRankFromRespect } from '@/components/RankBadge';
import { useGameStore, JobDefinition } from '@/hooks/useGameStore';

interface JobCardProps {
    job: JobDefinition;
    isProcessing: boolean;
    delay?: number;
    onExecute: () => void;
    streakBonus?: number;
    playerRespect?: number; // NEW - respect-based
    playerEnergy?: number;
}

export const JobCard = ({
    job,
    isProcessing,
    delay = 0,
    onExecute,
    streakBonus = 0,
    playerRespect = 0,
    playerEnergy = 0
}: JobCardProps) => {
    // Access store for inventory checking
    const { inventory, itemDefinitions } = useGameStore();

    const bonusCash = streakBonus > 0 ? Math.round(job.cash_reward * (1 + streakBonus / 100)) : job.cash_reward;
    const bonusRespect = streakBonus > 0 ? Math.round((job.respect_reward || 0) * (1 + streakBonus / 100)) : (job.respect_reward || 0);

    // Check item requirements
    let meetsItemReq = true;
    let requiredItemName = '';
    let ownedItemQty = 0;

    if (job.required_item_id && job.required_item_quantity) {
        const itemDef = itemDefinitions.find(d => d.id === job.required_item_id);
        requiredItemName = itemDef?.name || 'Unknown Item';

        const invItem = inventory.find(i => i.item_id === job.required_item_id);
        ownedItemQty = invItem ? invItem.quantity : 0;

        if (ownedItemQty < job.required_item_quantity) {
            meetsItemReq = false;
        }
    }

    // Get required rank - derive from required_level if required_rank not set
    const getRequiredRank = (): RankName => {
        // If the job has required_rank set, use it
        if ((job as any).required_rank) {
            return (job as any).required_rank as RankName;
        }
        // Otherwise derive from level (backwards compatibility)
        if (job.required_level >= 30) return 'Boss';
        if (job.required_level >= 15) return 'Underboss';
        if (job.required_level >= 8) return 'Caporegime';
        if (job.required_level >= 5) return 'Soldier';
        if (job.required_level >= 3) return 'Enforcer';
        return 'Street Thug';
    };

    const requiredRank = getRequiredRank();
    const meetsRankReq = playerRespect >= RANK_THRESHOLDS[requiredRank];
    const hasEnoughEnergy = playerEnergy >= job.energy_cost;
    const canExecute = meetsRankReq && hasEnoughEnergy && meetsItemReq && !isProcessing;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`noir-card p-4 ${!meetsRankReq ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{job.name}</h3>
                    <p className="text-xs text-muted-foreground">{job.description}</p>
                </div>

                <div className="flex flex-col items-end gap-1">
                    {/* Rank Badge */}
                    {requiredRank !== 'Street Thug' && (
                        <div className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${meetsRankReq
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            <RankBadge rank={requiredRank} size="sm" />
                        </div>
                    )}
                </div>
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/cash.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Cash</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-green-400">${bonusCash.toLocaleString()}</span>
                        {streakBonus > 0 && (
                            <span className="text-[10px] text-orange-400">+{streakBonus}%</span>
                        )}
                    </div>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/respect.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Respect</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-cyan-400">+{bonusRespect}</span>
                        {streakBonus > 0 && (
                            <span className="text-[10px] text-orange-400">+{streakBonus}%</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Requirements Row */}
            <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground bg-muted/20 rounded p-2">
                    <div className={`flex items-center gap-1 ${hasEnoughEnergy ? '' : 'text-red-400'}`}>
                        <img src="/images/icons/energy.png" alt="" className="w-3.5 h-3.5" />
                        <span>{job.energy_cost}</span>
                    </div>
                    {requiredRank !== 'Street Thug' && (
                        <>
                            <span className="text-muted-foreground/50">•</span>
                            <div className={`flex items-center gap-1 ${meetsRankReq ? '' : 'text-red-400'}`}>
                                <RankBadge rank={requiredRank} size="sm" />
                                <span>{requiredRank}+</span>
                            </div>
                        </>
                    )}
                </div>

                {job.required_item_id && job.required_item_quantity && (
                    <div className={`flex items-center justify-between text-xs px-2 py-1.5 rounded border ${meetsItemReq
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                        <span className="flex items-center gap-1">
                            <img src="/images/icons/inventory.png" alt="" className="w-3 h-3" />
                            Requires: {requiredItemName}
                        </span>
                        <span className="font-bold">
                            {ownedItemQty}/{job.required_item_quantity}
                        </span>
                    </div>
                )}
            </div>

            <Button
                className={`w-full text-xs ${canExecute ? 'btn-gold' : ''}`}
                onClick={onExecute}
                disabled={!canExecute}
                variant={canExecute ? 'default' : 'outline'}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : !meetsRankReq ? (
                    `Requires ${requiredRank} Rank`
                ) : !hasEnoughEnergy ? (
                    'Not Enough Energy'
                ) : !meetsItemReq ? (
                    `Need ${job.required_item_quantity}x ${requiredItemName}`
                ) : (
                    'Execute Job'
                )}
            </Button>
        </motion.div>
    );
};

export default JobCard;
