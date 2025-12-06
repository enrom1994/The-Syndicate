import { motion } from 'framer-motion';
import { Gift, Calendar, Star, CheckCircle2, Lock, ChevronRight, Flame, Crown } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';

interface DayRewardProps {
    day: number;
    reward: string;
    rewardType: 'cash' | 'diamonds' | 'energy' | 'item';
    claimed: boolean;
    current: boolean;
    locked: boolean;
    onClaim?: () => void;
}

const rewardIcons = {
    cash: <GameIcon type="cash" className="w-8 h-8" />,
    diamonds: <GameIcon type="diamond" className="w-8 h-8" />,
    energy: <Gift className="w-6 h-6 text-yellow-400" />,
    item: <Crown className="w-6 h-6 text-purple-400" />,
};

const DayReward = ({ day, reward, rewardType, claimed, current, locked, onClaim }: DayRewardProps) => (
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
            >
                Claim
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

interface MissionProps {
    title: string;
    description: string;
    progress: number;
    target: number;
    reward: string;
    completed: boolean;
    delay?: number;
    onClaim?: () => void;
}

const Mission = ({ title, description, progress, target, reward, completed, delay = 0, onClaim }: MissionProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className={`noir-card p-4 ${completed ? 'border-l-2 border-green-500' : ''}`}
    >
        <div className="flex items-start justify-between mb-2">
            <div>
                <h3 className="font-cinzel font-semibold text-sm text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <span className="text-xs text-primary font-bold">{reward}</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress / target) * 100}%` }}
                    transition={{ duration: 0.5, delay: delay + 0.2 }}
                    className={`h-full rounded-full ${completed ? 'bg-green-500' : 'bg-gradient-gold'}`}
                />
            </div>
            <span className="text-xs text-muted-foreground">{progress}/{target}</span>
            {completed && (
                <Button
                    size="sm"
                    className="btn-gold text-[10px] h-6 px-2"
                    onClick={onClaim}
                >
                    Claim
                </Button>
            )}
        </div>
    </motion.div>
);

const DailyRewardsPage = () => {
    const { toast } = useToast();
    const [currentStreak, setCurrentStreak] = useState(4);

    const weeklyRewards = [
        { day: 1, reward: '$5K', rewardType: 'cash' as const, claimed: true },
        { day: 2, reward: '10 💎', rewardType: 'diamonds' as const, claimed: true },
        { day: 3, reward: '$10K', rewardType: 'cash' as const, claimed: true },
        { day: 4, reward: '50 ⚡', rewardType: 'energy' as const, claimed: false },
        { day: 5, reward: '25 💎', rewardType: 'diamonds' as const, claimed: false },
        { day: 6, reward: '$25K', rewardType: 'cash' as const, claimed: false },
    ];

    // Day 7 is special - shown as a featured card
    const weeklyBonus = {
        day: 7,
        reward: 'Rare Item',
        rewardType: 'item' as const,
        claimed: false,
    };

    const dailyMissions = [
        { title: 'Complete 5 Jobs', description: 'Do any 5 PvE jobs', progress: 3, target: 5, reward: '$2,500', completed: false },
        { title: 'Attack 3 Players', description: 'Win 3 PvP attacks', progress: 3, target: 3, reward: '5 💎', completed: true },
        { title: 'Collect Income', description: 'Collect from all businesses', progress: 4, target: 4, reward: '$5,000', completed: true },
        { title: 'Train Stats', description: 'Train any stat 1 time', progress: 0, target: 1, reward: '10 Energy', completed: false },
    ];

    const handleClaimDaily = () => {
        toast({
            title: 'Reward Claimed!',
            description: 'You received 50 Energy!',
        });
        setCurrentStreak(5);
    };

    const handleClaimMission = (title: string, reward: string) => {
        toast({
            title: 'Mission Complete!',
            description: `You earned ${reward}!`,
        });
    };

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
                                <DayReward
                                    key={reward.day}
                                    {...reward}
                                    current={reward.day === currentStreak}
                                    locked={reward.day > currentStreak}
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
                    <div className={`noir-card p-4 relative overflow-hidden ${currentStreak >= 7 ? 'ring-2 ring-primary' : ''}`}>
                        {/* Background glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-primary/10 to-purple-500/10" />

                        <div className="relative flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0
                                ${currentStreak >= 7 ? 'bg-gradient-gold' : 'bg-muted/30'}`}>
                                {currentStreak >= 7 ? (
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
                                    {weeklyBonus.claimed && (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    )}
                                </div>
                                <h3 className="font-cinzel font-bold text-lg text-foreground">
                                    {weeklyBonus.reward}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {currentStreak >= 7
                                        ? 'Weekly bonus unlocked!'
                                        : `${7 - currentStreak} more day${7 - currentStreak > 1 ? 's' : ''} to unlock`}
                                </p>
                            </div>
                            {currentStreak >= 7 && !weeklyBonus.claimed && (
                                <Button className="btn-gold shrink-0">
                                    Claim
                                </Button>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(Math.min(currentStreak, 7) / 7) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                                className="h-full rounded-full bg-gradient-gold"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Daily Missions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3">Daily Missions</h2>
                    <div className="space-y-2">
                        {dailyMissions.map((mission, index) => (
                            <Mission
                                key={mission.title}
                                {...mission}
                                delay={0.1 * index}
                                onClaim={() => handleClaimMission(mission.title, mission.reward)}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        </MainLayout>
    );
};

export default DailyRewardsPage;

