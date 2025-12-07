import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Trophy,
    Target,
    Briefcase,
    Swords,
    Users,
    Shield,
    Crown,
    Lock,
    Check,
    ChevronRight,
} from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardDiamonds } from '@/components/RewardAnimation';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';

type AchievementCategory = 'combat' | 'business' | 'social' | 'wealth' | 'milestone';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    category: AchievementCategory;
    progress: number;
    target: number;
    reward: { type: 'cash' | 'diamonds'; amount: number };
    isUnlocked: boolean;
    isClaimed: boolean;
}

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
    milestone: <GameIcon type="diamond" className="w-6 h-6" />, // Increased size
};

const AchievementCard = ({
    achievement,
    onClaim
}: {
    achievement: Achievement;
    onClaim: (id: string) => void;
}) => {
    const progress = Math.min(100, (achievement.progress / achievement.target) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`noir-card p-4 ${achievement.isClaimed ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${achievement.isUnlocked
                    ? 'bg-gradient-gold'
                    : 'bg-muted/30'
                    }`}>
                    {achievement.isUnlocked ? (
                        achievement.icon
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
                            {achievement.reward.type === 'cash' ? (
                                <GameIcon type="cash" className="w-4 h-4" />
                            ) : (
                                <GameIcon type="diamond" className="w-5 h-5" /> // Increased size
                            )}
                            <span>
                                {achievement.reward.type === 'cash'
                                    ? `$${(achievement.reward.amount / 1000).toFixed(0)}K`
                                    : `${achievement.reward.amount} 💎`}
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
                                className={`h-full rounded-full ${achievement.isUnlocked ? 'bg-gradient-gold' : 'bg-muted-foreground'
                                    }`}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                            {achievement.progress}/{achievement.target}
                        </span>
                    </div>
                </div>

                {/* Claim button */}
                {achievement.isUnlocked && !achievement.isClaimed && (
                    <Button
                        size="sm"
                        className="btn-gold text-xs shrink-0"
                        onClick={() => onClaim(achievement.id)}
                    >
                        Claim
                    </Button>
                )}

                {achievement.isClaimed && (
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
    const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

    const [achievements, setAchievements] = useState<Achievement[]>([
        // Combat
        { id: '1', title: 'First Blood', description: 'Win your first attack', icon: <Swords className="w-5 h-5 text-primary-foreground" />, category: 'combat', progress: 1, target: 1, reward: { type: 'cash', amount: 10000 }, isUnlocked: true, isClaimed: true },
        { id: '2', title: 'Street Fighter', description: 'Win 10 attacks', icon: <Swords className="w-5 h-5 text-primary-foreground" />, category: 'combat', progress: 7, target: 10, reward: { type: 'cash', amount: 50000 }, isUnlocked: false, isClaimed: false },
        { id: '3', title: 'Untouchable', description: 'Successfully defend 5 attacks', icon: <Shield className="w-5 h-5 text-primary-foreground" />, category: 'combat', progress: 5, target: 5, reward: { type: 'diamonds', amount: 25 }, isUnlocked: true, isClaimed: false },

        // Business
        { id: '4', title: 'Entrepreneur', description: 'Own your first business', icon: <Briefcase className="w-5 h-5 text-primary-foreground" />, category: 'business', progress: 1, target: 1, reward: { type: 'cash', amount: 25000 }, isUnlocked: true, isClaimed: true },
        { id: '5', title: 'Tycoon', description: 'Own 5 businesses', icon: <Briefcase className="w-5 h-5 text-primary-foreground" />, category: 'business', progress: 2, target: 5, reward: { type: 'diamonds', amount: 100 }, isUnlocked: false, isClaimed: false },

        // Social
        { id: '6', title: 'Made Man', description: 'Join a family', icon: <Users className="w-5 h-5 text-primary-foreground" />, category: 'social', progress: 1, target: 1, reward: { type: 'cash', amount: 15000 }, isUnlocked: true, isClaimed: false },
        { id: '7', title: 'Godfather', description: 'Become the Boss of a family', icon: <Crown className="w-5 h-5 text-primary-foreground" />, category: 'social', progress: 1, target: 1, reward: { type: 'diamonds', amount: 200 }, isUnlocked: true, isClaimed: false },

        // Wealth
        { id: '8', title: 'First Million', description: 'Earn $1,000,000 total', icon: <GameIcon type="cash" className="w-6 h-6" />, category: 'wealth', progress: 850000, target: 1000000, reward: { type: 'diamonds', amount: 50 }, isUnlocked: false, isClaimed: false },

        // Milestones
        { id: '9', title: 'Rising Star', description: 'Reach level 10', icon: <GameIcon type="diamond" className="w-6 h-6" />, category: 'milestone', progress: 10, target: 10, reward: { type: 'diamonds', amount: 25 }, isUnlocked: true, isClaimed: true },
    ]);

    const filteredAchievements = selectedCategory === 'all'
        ? achievements
        : achievements.filter(a => a.category === selectedCategory);

    const handleClaim = (id: string) => {
        haptic.success();
        const achievement = achievements.find(a => a.id === id);
        if (!achievement) return;

        // Trigger reward animation
        if (achievement.reward.type === 'cash') {
            rewardCash(achievement.reward.amount);
        } else {
            rewardDiamonds(achievement.reward.amount);
        }

        setAchievements(prev => prev.map(a =>
            a.id === id ? { ...a, isClaimed: true } : a
        ));

        toast({
            title: 'Achievement Claimed!',
            description: `+${achievement.reward.type === 'cash'
                ? `$${achievement.reward.amount.toLocaleString()}`
                : `${achievement.reward.amount} 💎`}`,
        });
    };

    const unclaimedCount = achievements.filter(a => a.isUnlocked && !a.isClaimed).length;

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
                <div className="space-y-3">
                    {filteredAchievements.map(achievement => (
                        <AchievementCard
                            key={achievement.id}
                            achievement={achievement}
                            onClaim={handleClaim}
                        />
                    ))}
                </div>
            </div>
        </MainLayout>
    );
};

export default AchievementsPage;