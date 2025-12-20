import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MyBounty, formatTimeRemaining } from './types';

interface MyBountyCardProps {
    bounty: MyBounty;
    index: number;
    isProcessing: boolean;
    onCancel: (bounty: MyBounty) => void;
}

export const MyBountyCard = ({
    bounty,
    index,
    isProcessing,
    onCancel
}: MyBountyCardProps) => {
    const statusStyles = {
        active: '',
        claimed: 'border-l-2 border-green-500',
        expired: 'opacity-50',
        cancelled: 'opacity-50',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`noir-card p-4 ${statusStyles[bounty.status]}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{bounty.target_name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-primary font-bold">${bounty.bounty_amount.toLocaleString()}</span>
                        {bounty.status === 'active' && (
                            <span className="text-muted-foreground">• {formatTimeRemaining(bounty.time_remaining)}</span>
                        )}
                    </div>
                    {bounty.claimed_by && (
                        <p className="text-[10px] text-green-400 mt-1">Claimed by: {bounty.claimed_by}</p>
                    )}
                </div>

                {bounty.status === 'active' && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => onCancel(bounty)}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                )}
                {bounty.status === 'claimed' && (
                    <span className="text-green-400 text-xs font-bold">CLAIMED</span>
                )}
                {bounty.status === 'expired' && (
                    <span className="text-muted-foreground text-xs">EXPIRED</span>
                )}
                {bounty.status === 'cancelled' && (
                    <span className="text-muted-foreground text-xs">CANCELLED</span>
                )}
            </div>
        </motion.div>
    );
};

export default MyBountyCard;
