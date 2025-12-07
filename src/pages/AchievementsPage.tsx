import { motion } from 'framer-motion';
import { useState } from 'react';
import {
    Trophy,
    Briefcase,
    Swords,
    Users,
    Shield,
    Crown,
    Lock,
    Check,
    Loader2,
} from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardDiamonds } from '@/components/RewardAnimation';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, PlayerAchievement } from '@/hooks/useGameStore';

type AchievementCategory = 'combat' | 'business' | 'social' | 'wealth' | 'milestone';

const categoryLabels: Record<AchievementCategory, string> = {
    combat: 'Combat',
    business: 'Business',
    social: 'Social',
    wealth: 'Wealth',
    milestone: 'Milestones',
};

const categoryIcons: Record<AchievementCategory, React.ReactNode> = {
    combat: <Swords className="w-4 h-4" />,
    business: <Briefcase className="w-4 h-4" />,
    social: <Users className="w-4 h-4" />,
    wealth: <GameIcon type="cash" className="w-5 h-5" />,
    milestone: <GameIcon type="diamond" className="w-6 h-6" />,
};

const getAchievementIcon = (category: string): React.ReactNode => {
    switch (category) {
        case 'combat': return <Swords className="w-5 h-5 text-primary-foreground" />;
        case 'business': return <Briefcase className="w-5 h-5 text-primary-foreground" />;
        case 'social': return <Users className="w-5 h-5 text-primary-foreground" />;
        case 'wealth': return <GameIcon type="cash" className="w-6 h-6" />;
        case 'milestone': return <GameIcon type="diamond" className="w-6 h-6" />;
        default: return <Trophy className="w-5 h-5 text-primary-foreground" />;
    }
};

interface AchievementCardProps {
    achievement: PlayerAchievement;
    onClaim: (id: string) => void;
    isClaiming: boolean;
}

const AchievementCard = ({ achievement, onClaim, isClaiming }: AchievementCardProps) => {
    const progress = Math.min(100, (achievement.progress / achievement.target) * 100);
    const isUnlocked = achievement.progress >= achievement.target;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`noir-card p-4 ${achievement.is_claimed ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isUnlocked
                    ? 'bg-gradient-gold'
                    : 'bg-muted/30'
                    }`}>
                    {isUnlocked ? (
                        getAchievementIcon(achievement.category)
                    ) : (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-cinzel font-semibold text-sm text-foreground truncate">
                            {achievement.title}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-primary shrink-0 ml-2">
                            {achievement.reward_type === 'cash' ? (
                                <GameIcon type="cash" className="w-4 h-4" />
                            ) : (
                                <GameIcon type="diamond" className="w-5 h-5" />
                            )}
                            <span>
                                {achievement.reward_type === 'cash'
                                    ? `$${(achievement.reward_amount / 1000).toFixed(0)}K`
                                    : `${achievement.reward_amount} 💎`}
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                        {achievement.description}
                    </p>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full rounded-full ${isUnlocked ? 'bg-gradient-gold' : 'bg-muted-foreground'
                                    }`}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                            {achievement.progress}/{achievement.target}
                        </span>
                    </div>
                </div>

                {/* Claim button */}
                {isUnlocked && !achievement.is_claimed && (
                    <Button
                        size="sm"
                        className="btn-gold text-xs shrink-0"
                        onClick={() => onClaim(achievement.id)}
                        disabled={isClaiming}
                    >
                        {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim'}
                    </Button>
                )}

                {achievement.is_claimed && (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-green-500" />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const AchievementsPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const { achievements, isLoadingAchievements, claimAchievement } = useGameStore();

    const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
    const [claimingId, setClaimingId] = useState<string | null>(null);

    const filteredAchievements = selectedCategory === 'all'
        ? achievements
        : achievements.filter(a => a.category === selectedCategory);

    const handleClaim = async (id: string) => {
        setClaimingId(id);

        try {
            const achievement = achievements.find(a => a.id === id);
            if (!achievement) return;

            const success = await claimAchievement(id);

            if (success) {
                haptic.success();

                // Trigger reward animation
                if (achievement.reward_type === 'cash') {
                    rewardCash(achievement.reward_amount);
                } else {
                    rewardDiamonds(achievement.reward_amount);
                }

                await refetchPlayer();

                toast({
                    title: 'Achievement Claimed!',
                    description: `+${achievement.reward_type === 'cash'
                        ? `$${achievement.reward_amount.toLocaleString()}`
                        : `${achievement.reward_amount} 💎`}`,
                });
            } else {
                haptic.error();
                toast({
                    title: 'Error',
                    description: 'Could not claim achievement.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Claim error:', error);
            haptic.error();
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setClaimingId(null);
        }
    };

    const unclaimedCount = achievements.filter(a => a.progress >= a.target && !a.is_claimed).length;

    if (isAuthLoading) {
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
            <div className="py-6 px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Achievements</h1>
                        <p className="text-xs text-muted-foreground">
                            {unclaimedCount} rewards waiting to be claimed
                        </p>
                    </div>
                </motion.div>

                {/* Category Filter */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
                    <Button
                        size="sm"
                        variant={selectedCategory === 'all' ? 'default' : 'outline'}
                        className={selectedCategory === 'all' ? 'btn-gold' : ''}
                        onClick={() => setSelectedCategory('all')}
                    >
                        All
                    </Button>
                    {(Object.keys(categoryLabels) as AchievementCategory[]).map(cat => (
                        <Button
                            key={cat}
                            size="sm"
                            variant={selectedCategory === cat ? 'default' : 'outline'}
                            className={`${selectedCategory === cat ? 'btn-gold' : ''} shrink-0`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {categoryIcons[cat]}
                            <span className="ml-1">{categoryLabels[cat]}</span>
                        </Button>
                    ))}
                </div>

                {/* Achievement List */}
                {isLoadingAchievements ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredAchievements.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No achievements in this category</p>
                        ) : (
                            filteredAchievements.map(achievement => (
                                <AchievementCard
                                    key={achievement.id}
                                    achievement={achievement}
                                    onClaim={handleClaim}
                                    isClaiming={claimingId === achievement.id}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default AchievementsPage;