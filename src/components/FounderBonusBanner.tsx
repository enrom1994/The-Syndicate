import { motion } from 'framer-motion';
import { Gift, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';

/**
 * Banner shown to existing users who haven't claimed their founder bonus yet.
 * Only appears if player.founder_bonus_claimed is false.
 */
export const FounderBonusBanner = () => {
    const { player, refetchPlayer } = useAuth();
    const { toast } = useToast();
    const [isClaiming, setIsClaiming] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Don't show if already claimed or player not loaded
    if (!player || player.founder_bonus_claimed === true || dismissed) {
        return null;
    }

    const handleClaim = async () => {
        setIsClaiming(true);
        haptic.medium();

        try {
            const { data, error } = await supabase.rpc('claim_founder_bonus' as any);

            console.log('[FounderBonus] RPC response:', { data, error });

            if (error) throw error;

            // Handle the response - backend returns jsonb with success/error fields
            const response = data as any;

            if (response?.success === true) {
                haptic.success();
                toast({
                    title: '💎 Founder Bonus Claimed!',
                    description: `You received ${response.diamonds_awarded || 50} diamonds!`,
                });
                await refetchPlayer();
            } else if (response?.already_claimed === true) {
                // Already claimed - just refresh and hide banner
                toast({
                    title: 'Already Claimed',
                    description: 'You have already received your founder bonus.',
                });
                await refetchPlayer();
            } else if (response?.error) {
                // Backend returned an error message
                toast({
                    title: 'Claim Failed',
                    description: response.error,
                    variant: 'destructive',
                });
            } else {
                // Unexpected response format - log and show error
                console.error('[FounderBonus] Unexpected response format:', response);
                toast({
                    title: 'Error',
                    description: 'Something went wrong. Please try again.',
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            console.error('Founder bonus claim error:', error);
            toast({
                title: 'Error',
                description: error?.message || 'Failed to claim bonus. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 my-3"
        >
            <div className="relative overflow-hidden rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-900/30 via-amber-800/20 to-amber-900/30 p-4">
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-shimmer"
                    style={{ animation: 'shimmer 2s infinite' }} />

                {/* Close button */}
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute top-2 right-2 p-1 text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="relative flex items-center gap-3">
                    {/* Icon */}
                    <div className="shrink-0 w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <img
                            src="/images/icons/diamond.png"
                            alt="Diamonds"
                            className="w-8 h-8 object-contain"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <Gift className="w-4 h-4 text-amber-400" />
                            <h3 className="font-cinzel font-bold text-sm text-amber-200">
                                Founder Bonus
                            </h3>
                            <Sparkles className="w-3 h-3 text-amber-400" />
                        </div>
                        <p className="text-xs text-amber-200/70 mt-0.5">
                            Claim <span className="text-amber-400 font-bold">50 FREE Diamonds</span> as a thank you for being an early player!
                        </p>
                    </div>

                    {/* Claim button */}
                    <Button
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="shrink-0 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs px-4 py-2"
                    >
                        {isClaiming ? (
                            <span className="animate-pulse">...</span>
                        ) : (
                            'CLAIM'
                        )}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};
