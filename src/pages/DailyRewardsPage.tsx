import { motion } from 'framer-motion';
import { Gift, Calendar, Star, CheckCircle2, Lock, ChevronRight, Flame, Crown, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardDiamonds } from '@/components/RewardAnimation';

interface DayReward {
    day: number;
    reward_type: 'cash' | 'diamonds' | 'energy' | 'item';
    reward_amount: number;
    reward_display: string;
}

interface DayRewardProps {
    day: number;
    reward: string;
    rewardType: 'cash' | 'diamonds' | 'energy' | 'item';
    claimed: boolean;
    current: boolean;
    locked: boolean;
    isProcessing?: boolean;
    onClaim?: () => void;
}

const rewardIcons = {
    cash: <GameIcon type="cash" className="w-8 h-8" />,
    diamonds: <GameIcon type="diamond" className="w-12 h-12" />,
    energy: <Gift className="w-6 h-6 text-yellow-400" />,
    item: <Crown className="w-6 h-6 text-purple-400" />,
};

const DayRewardComponent = ({ day, reward, rewardType, claimed, current, locked, isProcessing, onClaim }: DayRewardProps) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: day * 0.05 }}
        className={`shrink-0 w-20 noir-card p-3 text-center relative
            ${current ? 'ring-2 ring-primary bg-primary/10' : ''} 
            ${claimed ? 'opacity-50' : ''}
            ${locked ? 'opacity-40' : ''}`}
    >
        {/* Day label */}
        <div className={`text-[10px] font-bold mb-2 ${current ? 'text-primary' : 'text-muted-foreground'}`}>
            DAY {day}
        </div>

        {/* Icon */}
        <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center
            ${claimed ? 'bg-green-500/20' : locked ? 'bg-muted/30' : 'bg-muted/50'}`}>
            {claimed ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : locked ? (
                <Lock className="w-5 h-5 text-muted-foreground" />
            ) : (
                rewardIcons[rewardType]
            )}
        </div>

        {/* Reward text */}
        <p className={`font-cinzel text-xs font-bold ${claimed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {reward}
        </p>

        {/* Claim button for current day */}
        {current && !claimed && (
            <Button
                className="btn-gold text-[10px] px-2 py-1 h-6 mt-2 w-full"
                onClick={onClaim}
                disabled={isProcessing}
            >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
            </Button>
        )}

        {/* Claimed badge */}
        {claimed && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
        )}
    </motion.div>
);

const DailyRewardsPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();

    const [isProcessing, setIsProcessing] = useState(false);
    const [dailyRewardDefinitions, setDailyRewardDefinitions] = useState<DayReward[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Get streak from player data
    const currentStreak = player?.login_streak ?? 1;
    const lastClaimDate = player?.last_daily_claim ? new Date(player.last_daily_claim) : null;
    const today = new Date();
    const canClaimToday = !lastClaimDate ||
        lastClaimDate.toDateString() !== today.toDateString();

    useEffect(() => {
        loadDailyRewards();
    }, []);

    const loadDailyRewards = async () => {
        try {
            const { data, error } = await supabase
                .from('daily_reward_definitions')
                .select('*')
                .order('day_number', { ascending: true });

            if (error) throw error;

            const rewards = data?.map(d => ({
                day: d.day_number,
                reward_type: d.reward_type as 'cash' | 'diamonds' | 'energy' | 'item',
                reward_amount: d.reward_amount,
                reward_display: d.reward_type === 'cash'
                    ? `$${(d.reward_amount / 1000).toFixed(0)}K`
                    : d.reward_type === 'diamonds'
                        ? `${d.reward_amount} 💎`
                        : d.reward_type === 'energy'
                            ? `${d.reward_amount} ⚡`
                            : 'Mystery Reward',
            })) || [];

            setDailyRewardDefinitions(rewards);
        } catch (error) {
            console.error('Error loading daily rewards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaimDaily = async () => {
        if (!player || !canClaimToday) return;

        setIsProcessing(true);

        try {
            const currentDay = (currentStreak % 7) || 7;
            const reward = dailyRewardDefinitions.find(r => r.day === currentDay);

            if (!reward) {
                throw new Error('Reward not found');
            }

            // Update player's streak and last claim date
            const { error } = await supabase
                .from('players')
                .update({
                    login_streak: currentStreak + 1,
                    last_daily_claim: new Date().toISOString(),
                })
                .eq('id', player.id);

            if (error) throw error;

            // Give the reward
            if (reward.reward_type === 'cash') {
                await supabase.rpc('increment_cash', {
                    player_id_input: player.id,
                    amount: reward.reward_amount,
                });
                rewardCash(reward.reward_amount);
            } else if (reward.reward_type === 'diamonds') {
                await supabase.rpc('increment_diamonds', {
                    player_id_input: player.id,
                    amount: reward.reward_amount,
                });
                rewardDiamonds(reward.reward_amount);
            } else if (reward.reward_type === 'energy') {
                await supabase
                    .from('players')
                    .update({ energy: Math.min(player.energy + reward.reward_amount, player.max_energy) })
                    .eq('id', player.id);
            }

            haptic.success();
            await refetchPlayer();

            toast({
                title: 'Reward Claimed!',
                description: `You received ${reward.reward_display}!`,
            });
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            haptic.error();
            toast({
                title: 'Error',
                description: 'Failed to claim reward. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Generate display data for the week
    const weeklyRewards = dailyRewardDefinitions.slice(0, 6).map((reward) => ({
        day: reward.day,
        reward: reward.reward_display,
        rewardType: reward.reward_type,
        claimed: reward.day < (currentStreak % 7 || 7) || !canClaimToday && reward.day === (currentStreak % 7 || 7),
    }));

    // Day 7 bonus
    const weeklyBonus = dailyRewardDefinitions.find(r => r.day === 7) || {
        day: 7,
        reward_display: 'Rare Item',
        reward_type: 'item' as const,
    };
    const hasClaimed7 = currentStreak >= 7 && !canClaimToday;

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
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/home.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Daily Rewards</h1>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            {currentStreak} day streak
                        </p>
                    </div>
                </motion.div>

                {/* Weekly Login - Streak Progress */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mb-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-cinzel text-sm font-semibold text-foreground">Weekly Login</h2>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Scroll <ChevronRight className="w-3 h-3" />
                        </span>
                    </div>

                    {/* Horizontal Scrollable Days */}
                    <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                            {weeklyRewards.map((reward) => (
                                <DayRewardComponent
                                    key={reward.day}
                                    day={reward.day}
                                    reward={reward.reward}
                                    rewardType={reward.rewardType}
                                    claimed={reward.claimed}
                                    current={reward.day === ((currentStreak % 7) || 7) && canClaimToday}
                                    locked={reward.day > ((currentStreak % 7) || 7)}
                                    isProcessing={isProcessing}
                                    onClaim={handleClaimDaily}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Day 7 - Featured Weekly Bonus */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-6"
                >
                    <div className={`noir-card p-4 relative overflow-hidden ${(currentStreak % 7 || 7) === 7 && canClaimToday ? 'ring-2 ring-primary' : ''}`}>
                        {/* Background glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-primary/10 to-purple-500/10" />

                        <div className="relative flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0
                                ${(currentStreak % 7 || 7) === 7 ? 'bg-gradient-gold' : 'bg-muted/30'}`}>
                                {(currentStreak % 7 || 7) === 7 ? (
                                    <Crown className="w-8 h-8 text-primary-foreground" />
                                ) : (
                                    <Lock className="w-6 h-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded">
                                        DAY 7 BONUS
                                    </span>
                                    {hasClaimed7 && (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    )}
                                </div>
                                <h3 className="font-cinzel font-bold text-lg text-foreground">
                                    {weeklyBonus.reward_display}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {(currentStreak % 7 || 7) === 7 && canClaimToday
                                        ? 'Weekly bonus unlocked!'
                                        : `${7 - (currentStreak % 7 || 7)} more day${7 - (currentStreak % 7 || 7) > 1 ? 's' : ''} to unlock`}
                                </p>
                            </div>
                            {(currentStreak % 7 || 7) === 7 && canClaimToday && !hasClaimed7 && (
                                <Button
                                    className="btn-gold shrink-0"
                                    onClick={handleClaimDaily}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim'}
                                </Button>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(Math.min((currentStreak % 7) || 7, 7) / 7) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                                className="h-full rounded-full bg-gradient-gold"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="noir-card p-4 text-center"
                >
                    <p className="text-xs text-muted-foreground">
                        Login every day to keep your streak going and earn bigger rewards!
                    </p>
                </motion.div>
            </div>
        </MainLayout>
    );
};

export default DailyRewardsPage;