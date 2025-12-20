import { motion } from 'framer-motion';
import { Skull, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/GameIcon';
import { RankBadge, RankName, RANK_THRESHOLDS } from '@/components/RankBadge';
import { NPCBounty, DIFFICULTY_COLORS } from './types';

interface NPCBountyCardProps {
    bounty: NPCBounty;
    index: number;
    isProcessing: boolean;
    playerRespect: number;
    onHunt: (bounty: NPCBounty) => void;
}

// Helper to format cooldown remaining
const formatCooldown = (availableAt: string | null): string => {
    if (!availableAt) return 'Cooldown';
    const now = new Date();
    const available = new Date(availableAt);
    const diffMs = available.getTime() - now.getTime();

    if (diffMs <= 0) return 'Ready';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

export const NPCBountyCard = ({
    bounty,
    index,
    isProcessing,
    playerRespect,
    onHunt
}: NPCBountyCardProps) => {
    const requiredRank = (bounty.required_rank || 'Street Thug') as RankName;
    const meetsRankReq = bounty.player_meets_rank !== undefined ? bounty.player_meets_rank : true;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`noir-card p-4 ${!bounty.is_available ? 'opacity-50' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                    <Skull className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-cinzel font-semibold text-sm text-foreground">{bounty.target_name}</h3>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-sm ${DIFFICULTY_COLORS[bounty.difficulty]}`}>
                            {bounty.difficulty.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{bounty.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {requiredRank !== 'Street Thug' && (
                            <span className="flex items-center gap-1">
                                <RankBadge rank={requiredRank} size="sm" />
                                {requiredRank}+
                            </span>
                        )}
                        <span>+{bounty.respect_reward} Respect</span>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="font-cinzel font-bold text-sm text-primary flex items-center gap-1">
                        <GameIcon type="cash" className="w-4 h-4" />
                        {bounty.min_reward.toLocaleString()}-{bounty.max_reward.toLocaleString()}
                    </p>
                    {bounty.is_available ? (
                        <Button
                            size="sm"
                            className="btn-gold text-[10px] mt-1"
                            onClick={() => onHunt(bounty)}
                            disabled={isProcessing || !meetsRankReq}
                        >
                            Hunt
                        </Button>
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatCooldown(bounty.available_at)}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default NPCBountyCard;

