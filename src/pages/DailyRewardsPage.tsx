import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Calendar, Star, CheckCircle2, Lock, ChevronRight, Flame, Crown, Loader2, AlertTriangle, Timer, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardDiamonds, rewardEnergy } from '@/components/RewardAnimation';
import { TON_RECEIVING_ADDRESS, toNanoTon } from '@/lib/ton-config';

interface DayReward {
    day: number;
    reward_type: 'cash' | 'diamonds' | 'energy' | 'item';
    reward_amount: number;
    reward_display: string;
}

interface DailyStatus {
    current_streak: number;
    current_day: number;
    can_claim: boolean;
    hours_until_next: number;
    streak_restorable: boolean;
    lost_streak: number;
    hours_to_restore: number;
    next_milestone: {
        days: number;
        reward_type: string;
        reward_amount: number;
        description: string;
    } | null;
}

const rewardIcons = {
    cash: <GameIcon type="cash" className="w-6 h-6" />,
    diamonds: <GameIcon type="diamond" className="w-6 h-6" />,
    energy: <img src="/images/icons/energy.png" alt="Energy" className="w-6 h-6" />,
    item: <Crown className="w-6 h-6 text-purple-400" />,
};

interface DayCardProps {
    day: number;
    reward: DayReward;
    status: 'claimed' | 'current' | 'locked';
    isProcessing: boolean;
    onClaim: () => void;
}

const DayCard = ({ day, reward, status, isProcessing, onClaim }: DayCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: day * 0.05 }}
        className={`noir-card p-3 text-center relative
            ${status === 'current' ? 'ring-2 ring-primary bg-primary/10' : ''}
            ${status === 'claimed' ? 'opacity-60' : ''}
            ${status === 'locked' ? 'opacity-40' : ''}`}
    >
        <div className={`text-[10px] font-bold mb-2 ${status === 'current' ? 'text-primary' : 'text-muted-foreground'}`}>
            DAY {day}
        </div>

        <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center
            ${status === 'claimed' ? 'bg-green-500/20' : status === 'locked' ? 'bg-muted/30' : 'bg-muted/50'}`}>
            {status === 'claimed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : status === 'locked' ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
            ) : (
                rewardIcons[reward.reward_type]
            )}
        </div>

        <p className={`font-cinzel text-xs font-bold ${status === 'claimed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {reward.reward_display}
        </p>

        {status === 'current' && (
            <Button
                className="btn-gold text-[10px] px-2 py-1 h-6 mt-2 w-full"
                onClick={onClaim}
                disabled={isProcessing}
            >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
            </Button>
        )}

        {status === 'claimed' && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
        )}
    </motion.div>
);

const DailyRewardsPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const [tonConnectUI] = useTonConnectUI();

    const [isProcessing, setIsProcessing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [dailyRewards, setDailyRewards] = useState<DayReward[]>([]);
    const [status, setStatus] = useState<DailyStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showStreakSaver, setShowStreakSaver] = useState(false);

    useEffect(() => {
        if (player?.id) {
            loadData();
        }
    }, [player?.id]);

    const loadData = async () => {
        try {
            // Load reward definitions
            const { data: rewards } = await supabase
                .from('daily_reward_definitions')
                .select('*')
                .order('day_number', { ascending: true });

            if (rewards) {
                setDailyRewards(rewards.map(d => ({
                    day: d.day_number,
                    reward_type: d.reward_type as 'cash' | 'diamonds' | 'energy' | 'item',
                    reward_amount: d.reward_amount,
                    reward_display: d.reward_type === 'cash'
                        ? `$${(d.reward_amount / 1000).toFixed(0)}K`
                        : d.reward_type === 'diamonds'
                            ? `${d.reward_amount} Diamonds`
                            : d.reward_type === 'energy'
                                ? `${d.reward_amount} Energy`
                                : 'Mystery',
                })));
            }

            // Load status
            const { data: statusData } = await supabase.rpc('get_daily_reward_status', {
                target_player_id: player!.id
            });

            if (statusData) {
                setStatus(statusData as DailyStatus);
                // Show streak saver popup if applicable
                if (statusData.streak_restorable && statusData.lost_streak > 3) {
                    setShowStreakSaver(true);
                }
            }
        } catch (error) {
            console.error('Error loading daily rewards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaim = async () => {
        if (!player || !status?.can_claim) return;

        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('claim_daily_reward', {
                target_player_id: player.id
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();

                // Show reward animation
                if (data.reward_type === 'cash') {
                    rewardCash(data.reward_amount);
                } else if (data.reward_type === 'diamonds') {
                    rewardDiamonds(data.reward_amount);
                } else if (data.reward_type === 'energy') {
                    rewardEnergy(data.reward_amount);
                }

                // Show milestone bonus if any
                if (data.milestone_bonus) {
                    setTimeout(() => {
                        toast({
                            title: `🎉 ${data.milestone_bonus.description}!`,
                            description: `Streak milestone: +${data.milestone_bonus.amount} ${data.milestone_bonus.type}`,
                        });
                        if (data.milestone_bonus.type === 'diamonds') {
                            rewardDiamonds(data.milestone_bonus.amount);
                        } else if (data.milestone_bonus.type === 'cash') {
                            rewardCash(data.milestone_bonus.amount);
                        }
                    }, 1500);
                }

                toast({
                    title: 'Reward Claimed!',
                    description: `Day ${data.day}: ${dailyRewards.find(r => r.day === data.day)?.reward_display}`,
                });

                await refetchPlayer();
                await loadData();
            } else {
                throw new Error(data?.message || 'Failed to claim');
            }
        } catch (error: any) {
            console.error('Claim error:', error);
            haptic.error();
            toast({
                title: 'Error',
                description: error.message || 'Failed to claim reward',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestoreStreak = async () => {
        if (!player || !status?.streak_restorable) return;

        // Check wallet
        if (!tonConnectUI.wallet) {
            tonConnectUI.openModal();
            return;
        }

        setIsRestoring(true);
        try {
            // Send TON payment
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600,
                messages: [{
                    address: TON_RECEIVING_ADDRESS,
                    amount: toNanoTon(0.5).toString(),
                }]
            };

            await tonConnectUI.sendTransaction(transaction);

            // Restore streak
            const { data, error } = await supabase.rpc('restore_streak', {
                target_player_id: player.id
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({
                    title: '🔥 Streak Restored!',
                    description: `Your ${data.restored_streak} day streak is back!`,
                });
                setShowStreakSaver(false);
                await refetchPlayer();
                await loadData();
            }
        } catch (error) {
            console.error('Restore error:', error);
            toast({
                title: 'Transaction Cancelled',
                description: 'Streak was not restored.',
                variant: 'destructive',
            });
        } finally {
            setIsRestoring(false);
        }
    };

    const getStatus = (day: number): 'claimed' | 'current' | 'locked' => {
        if (!status) return 'locked';
        if (day < status.current_day) return 'claimed';
        if (day === status.current_day && status.can_claim) return 'current';
        return 'locked';
    };

    if (isAuthLoading || isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/home.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <img src="/images/icons/daily.png" alt="Daily" className="w-12 h-12 object-contain" />
                    <div className="flex-1">
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Daily Rewards</h1>
                        <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-bold text-orange-400">{status?.current_streak || 0} day streak</span>
                        </div>
                    </div>
                </motion.div>

                {/* Streak Saver Alert */}
                <AnimatePresence>
                    {showStreakSaver && status?.streak_restorable && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                        >
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-cinzel font-bold text-red-400 mb-1">
                                        Streak Lost! 😢
                                    </h3>
                                    <p className="text-xs text-red-200/80 mb-2">
                                        You missed a day and lost your <strong>{status.lost_streak} day streak</strong>!
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-red-200/60 mb-3">
                                        <Timer className="w-3 h-3" />
                                        <span>Restore available for {Math.floor(status.hours_to_restore)}h {Math.floor((status.hours_to_restore % 1) * 60)}m</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            className="btn-gold flex-1"
                                            onClick={handleRestoreStreak}
                                            disabled={isRestoring}
                                        >
                                            {isRestoring ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <GameIcon type="ton" className="w-4 h-4 mr-1" />
                                                    0.5 TON - Restore
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowStreakSaver(false)}
                                            className="text-xs"
                                        >
                                            Skip
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Days Grid */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6"
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3">7-Day Cycle</h2>
                    <div className="grid grid-cols-4 gap-2">
                        {dailyRewards.slice(0, 7).map((reward) => (
                            <DayCard
                                key={reward.day}
                                day={reward.day}
                                reward={reward}
                                status={getStatus(reward.day)}
                                isProcessing={isProcessing}
                                onClaim={handleClaim}
                            />
                        ))}
                        {/* Day 7 special card takes full width on second row */}
                    </div>
                </motion.div>

                {/* Next Milestone */}
                {status?.next_milestone && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-4"
                    >
                        <div className="noir-card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
                                    <Star className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-primary uppercase tracking-wider">Next Milestone</p>
                                    <h3 className="font-cinzel font-bold text-foreground">
                                        Day {status.next_milestone.days}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {status.next_milestone.description}: +{status.next_milestone.reward_amount} {status.next_milestone.reward_type}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-primary">
                                        {status.next_milestone.days - status.current_streak}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">days left</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(status.current_streak / status.next_milestone.days) * 100}%` }}
                                    className="h-full bg-gradient-gold rounded-full"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Timer until next claim */}
                {!status?.can_claim && status?.hours_until_next && status.hours_until_next > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="noir-card p-4 text-center"
                    >
                        <Timer className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Next reward available in</p>
                        <p className="font-cinzel text-lg font-bold text-foreground">
                            {Math.floor(status.hours_until_next)}h {Math.floor((status.hours_until_next % 1) * 60)}m
                        </p>
                    </motion.div>
                )}
            </div>
        </MainLayout>
    );
};

export default DailyRewardsPage;