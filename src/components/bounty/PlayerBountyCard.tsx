import { motion } from 'framer-motion';
import { User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/GameIcon';
import { PlayerBounty, formatTimeRemaining } from './types';

interface PlayerBountyCardProps {
    bounty: PlayerBounty;
    index: number;
    isProcessing: boolean;
    currentPlayerId?: string;
    onHunt: (bounty: PlayerBounty) => void;
}

export const PlayerBountyCard = ({
    bounty,
    index,
    isProcessing,
    currentPlayerId,
    onHunt
}: PlayerBountyCardProps) => {
    const isOwnBounty = bounty.placed_by_player_id === currentPlayerId;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="noir-card p-4"
        >
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{bounty.target_name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Lvl {bounty.target_level}</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeRemaining(bounty.time_remaining)}
                        </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Posted by: {bounty.placed_by}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="font-cinzel font-bold text-lg text-primary flex items-center gap-1">
                        <GameIcon type="cash" className="w-5 h-5" />
                        {bounty.bounty_amount.toLocaleString()}
                    </p>
                    <Button
                        size="sm"
                        className="btn-gold text-[10px] mt-1"
                        onClick={() => onHunt(bounty)}
                        disabled={isProcessing || isOwnBounty}
                    >
                        {isOwnBounty ? 'Yours' : 'Hunt'}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default PlayerBountyCard;
