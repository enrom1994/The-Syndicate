import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Copy,
    Share2,
    Check,
    Gift,
    Loader2,
    ChevronDown,
    ChevronUp,
    Crown,
    Star,
    Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/GameIcon';
import { useGameStore, ReferralStats } from '@/hooks/useGameStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardDiamonds } from '@/components/RewardAnimation';

interface ReferralSectionProps {
    compact?: boolean; // For ProfilePage (compact view)
}

export const ReferralSection = ({ compact = false }: ReferralSectionProps) => {
    const { toast } = useToast();
    const { refetchPlayer } = useAuth();
    const { getReferralStats, claimReferralMilestone } = useGameStore();

    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [showReferrals, setShowReferrals] = useState(false);

    // Telegram Bot username and Mini App short name
    const BOT_USERNAME = 'The_Syndicate_Game_Bot';
    const APP_SHORT_NAME = 'Syndicate';

    const loadStats = async () => {
        setIsLoading(true);
        const data = await getReferralStats();
        setStats(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadStats();
    }, []);

    const getReferralLink = () => {
        if (!stats?.referral_code) return '';
        // Use startapp parameter for Telegram Mini App deep links
        return `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${stats.referral_code}`;
    };

    const handleCopy = async () => {
        const link = getReferralLink();
        if (!link) return;

        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            haptic.success();
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({
                title: 'Copy Failed',
                description: 'Could not copy to clipboard',
                variant: 'destructive',
            });
        }
    };

    const handleShare = () => {
        const link = getReferralLink();
        if (!link) return;

        haptic.light();

        // Use Telegram WebApp share if available
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.openTelegramLink) {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me in TON Mafia! 🔫💰')}`;
            tg.openTelegramLink(shareUrl);
        } else {
            // Fallback to Web Share API
            if (navigator.share) {
                navigator.share({
                    title: 'TON Mafia',
                    text: 'Join me in TON Mafia! 🔫💰',
                    url: link,
                });
            } else {
                handleCopy();
            }
        }
    };

    const handleClaim = async (milestoneId: string) => {
        haptic.medium();
        setClaimingId(milestoneId);

        const result = await claimReferralMilestone(milestoneId);

        if (result.success) {
            haptic.success();

            // Trigger reward animation
            if (result.reward_type === 'cash' && result.reward_amount) {
                rewardCash(result.reward_amount);
            } else if (result.reward_type === 'diamonds' && result.reward_amount) {
                rewardDiamonds(result.reward_amount);
            }

            toast({
                title: 'Milestone Claimed!',
                description: result.message,
            });

            await Promise.all([refetchPlayer(), loadStats()]);
        } else {
            haptic.error();
            toast({
                title: 'Claim Failed',
                description: result.message,
                variant: 'destructive',
            });
        }

        setClaimingId(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const nextMilestone = stats.milestones.find(m => !m.is_claimed && !m.can_claim);
    const claimableMilestones = stats.milestones.filter(m => m.can_claim && !m.is_claimed);

    // Compact view for ProfilePage
    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="noir-card p-3"
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-cinzel text-sm font-semibold">Referrals</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <span className="text-green-400 font-bold">{stats.qualified_referrals}</span>
                        <span className="text-muted-foreground">/ {stats.total_referrals} friends</span>
                    </div>
                </div>

                {/* Code & Share Row */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-muted/30 rounded-sm px-2 py-1 flex items-center justify-between">
                        <span className="font-mono text-xs text-primary">{stats.referral_code}</span>
                        <button onClick={handleCopy} className="p-1">
                            {copied ? (
                                <Check className="w-3 h-3 text-green-400" />
                            ) : (
                                <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                        </button>
                    </div>
                    <Button size="sm" className="btn-gold h-7 px-2" onClick={handleShare}>
                        <Share2 className="w-3 h-3" />
                    </Button>
                </div>

                {/* Claimable Badge */}
                {claimableMilestones.length > 0 && (
                    <div className="flex items-center gap-2 bg-green-500/10 rounded-sm p-1.5">
                        <Gift className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400 font-semibold">
                            {claimableMilestones.length} reward{claimableMilestones.length > 1 ? 's' : ''} available!
                        </span>
                    </div>
                )}
            </motion.div>
        );
    }

    // Full view for TasksPage
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="noir-card p-4 mb-6"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                    <Users className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1">
                    <h2 className="font-cinzel text-sm font-bold text-foreground">Invite Friends</h2>
                    <p className="text-xs text-muted-foreground">
                        Earn rewards when friends reach Level 3
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center bg-muted/20 rounded-sm p-2">
                    <p className="font-cinzel font-bold text-lg text-primary">{stats.total_referrals}</p>
                    <p className="text-[10px] text-muted-foreground">Invited</p>
                </div>
                <div className="text-center bg-muted/20 rounded-sm p-2">
                    <p className="font-cinzel font-bold text-lg text-green-400">{stats.qualified_referrals}</p>
                    <p className="text-[10px] text-muted-foreground">Qualified</p>
                </div>
                <div className="text-center bg-muted/20 rounded-sm p-2">
                    <p className="font-cinzel font-bold text-lg text-yellow-400">{stats.pending_referrals}</p>
                    <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
            </div>

            {/* Referral Code & Share */}
            <div className="bg-muted/30 rounded p-3 mb-4">
                <p className="text-[10px] text-muted-foreground mb-1">Your Referral Code</p>
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/30 rounded px-3 py-2">
                        <span className="font-mono text-lg text-primary font-bold">{stats.referral_code}</span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-10"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                        size="sm"
                        className="btn-gold h-10"
                        onClick={handleShare}
                    >
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Milestones */}
            <div className="mb-4">
                <h3 className="font-cinzel text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Trophy className="w-3 h-3 text-primary" />
                    Milestones
                </h3>
                <div className="space-y-2">
                    {stats.milestones.map((milestone) => (
                        <div
                            key={milestone.id}
                            className={`flex items-center gap-3 p-2 rounded ${milestone.is_claimed
                                ? 'bg-muted/10 opacity-50'
                                : milestone.can_claim
                                    ? 'bg-green-500/10 border border-green-500/30'
                                    : 'bg-muted/20'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${milestone.is_claimed
                                ? 'bg-green-500/20'
                                : milestone.can_claim
                                    ? 'bg-green-500/30'
                                    : 'bg-muted/30'
                                }`}>
                                {milestone.is_claimed ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                ) : milestone.milestone_count >= 50 ? (
                                    <Crown className="w-4 h-4 text-primary" />
                                ) : milestone.milestone_count >= 25 ? (
                                    <Star className="w-4 h-4 text-yellow-400" />
                                ) : (
                                    <Gift className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-cinzel text-xs font-semibold">{milestone.title}</span>
                                    <div className="flex items-center gap-1">
                                        {milestone.reward_type === 'cash' && (
                                            <>
                                                <GameIcon type="cash" className="w-3 h-3" />
                                                <span className="text-xs text-green-400">${(milestone.reward_amount / 1000).toFixed(0)}K</span>
                                            </>
                                        )}
                                        {milestone.reward_type === 'diamonds' && (
                                            <>
                                                <GameIcon type="diamond" className="w-3 h-3" />
                                                <span className="text-xs text-cyan-400">{milestone.reward_amount}</span>
                                            </>
                                        )}
                                        {milestone.reward_type === 'item' && milestone.reward_item_icon && (
                                            <>
                                                <img src={milestone.reward_item_icon} alt="" className="w-4 h-4 object-contain" />
                                                <span className="text-xs text-purple-400">x{milestone.reward_amount}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    {milestone.milestone_count} friend{milestone.milestone_count > 1 ? 's' : ''} •{' '}
                                    {milestone.is_claimed ? 'Claimed' : `${stats.qualified_referrals}/${milestone.milestone_count}`}
                                </p>
                            </div>

                            {milestone.can_claim && !milestone.is_claimed && (
                                <Button
                                    size="sm"
                                    className="btn-gold h-7 px-2 text-[10px]"
                                    disabled={claimingId === milestone.id}
                                    onClick={() => handleClaim(milestone.id)}
                                >
                                    {claimingId === milestone.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        'Claim'
                                    )}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Referrals Toggle */}
            {stats.referrals.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowReferrals(!showReferrals)}
                        className="flex items-center justify-between w-full text-xs text-muted-foreground py-1"
                    >
                        <span>Recent Referrals ({stats.referrals.length})</span>
                        {showReferrals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                        {showReferrals && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-1 mt-2">
                                    {stats.referrals.slice(0, 10).map((ref) => (
                                        <div
                                            key={ref.id}
                                            className="flex items-center justify-between bg-muted/10 rounded px-2 py-1"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${ref.is_qualified ? 'bg-green-400' : 'bg-yellow-400'}`} />
                                                <span className="text-xs">{ref.username}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                Lv.{ref.level} {ref.is_qualified ? '✓' : '(pending)'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Next milestone progress */}
            {nextMilestone && (
                <div className="mt-4 pt-3 border-t border-muted/20">
                    <p className="text-[10px] text-muted-foreground text-center">
                        Next: <span className="text-primary">{nextMilestone.title}</span> •
                        {nextMilestone.milestone_count - stats.qualified_referrals} more needed
                    </p>
                </div>
            )}
        </motion.div>
    );
};
