import { motion } from 'framer-motion';
import { User, Sword, Shield, Zap, Brain, TrendingUp, Coins } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useTelegramPhoto } from '@/hooks/useTelegram';

interface StatCardProps {
    name: string;
    icon: React.ReactNode;
    level: number;
    maxLevel: number;
    currentBonus: string;
    nextBonus: string;
    trainCost: number;
    color: string;
    delay?: number;
    onTrain: () => void;
}

const StatCard = ({
    name,
    icon,
    level,
    maxLevel,
    currentBonus,
    nextBonus,
    trainCost,
    color,
    delay = 0,
    onTrain
}: StatCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-sm ${color} flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
                    <span className="text-xs text-primary font-bold">Lv. {level}</span>
                </div>
                <Progress value={(level / maxLevel) * 100} className="h-1.5 mt-1" />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-center">
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">Current</p>
                <p className="font-cinzel font-bold text-xs text-foreground">{currentBonus}</p>
            </div>
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">Next Lv.</p>
                <p className="font-cinzel font-bold text-xs text-primary">{nextBonus}</p>
            </div>
        </div>

        <Button
            className="w-full btn-gold text-xs"
            onClick={onTrain}
            disabled={level >= maxLevel}
        >
            <TrendingUp className="w-4 h-4 mr-1" />
            Train ${trainCost.toLocaleString()}
        </Button>
    </motion.div>
);

const ProfilePage = () => {
    const { toast } = useToast();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingTrain, setPendingTrain] = useState<{ name: string; cost: number } | null>(null);

    // Mock player stats
    const [stats, setStats] = useState({
        strength: { level: 15, maxLevel: 500 },
        defense: { level: 12, maxLevel: 500 },
        agility: { level: 8, maxLevel: 500 },
        intelligence: { level: 5, maxLevel: 500 },
    });

    const cash = 12500000; // Mock cash

    // Calculate training cost (exponential scaling)
    const getTrainCost = (level: number) => Math.floor(200 * Math.pow(1.08, level));

    // Calculate bonuses
    const getBonus = (stat: string, level: number) => {
        switch (stat) {
            case 'strength': return `+${level * 2} ATK`;
            case 'defense': return `+${level * 2} DEF`;
            case 'agility': return `+${level}% Success`;
            case 'intelligence': return `+${level * 0.5}% Income`;
            default: return '';
        }
    };

    const handleTrainClick = (name: string, cost: number) => {
        setPendingTrain({ name, cost });
        setConfirmOpen(true);
    };

    const confirmTrain = () => {
        if (pendingTrain) {
            toast({
                title: 'Training Complete!',
                description: `${pendingTrain.name} has increased by 1 level.`,
            });
        }
        setConfirmOpen(false);
        setPendingTrain(null);
    };

    const statConfigs = [
        {
            key: 'strength',
            name: 'Strength',
            icon: <Sword className="w-5 h-5 text-primary-foreground" />,
            color: 'bg-red-600',
            description: 'Increases PvP attack damage'
        },
        {
            key: 'defense',
            name: 'Defense',
            icon: <Shield className="w-5 h-5 text-primary-foreground" />,
            color: 'bg-blue-600',
            description: 'Reduces damage taken in PvP'
        },
        {
            key: 'agility',
            name: 'Agility',
            icon: <Zap className="w-5 h-5 text-primary-foreground" />,
            color: 'bg-green-600',
            description: 'Increases job success rate'
        },
        {
            key: 'intelligence',
            name: 'Intelligence',
            icon: <Brain className="w-5 h-5 text-primary-foreground" />,
            color: 'bg-purple-600',
            description: 'Boosts business income'
        },
    ];

    const photoUrl = useTelegramPhoto();

    return (
        <MainLayout>
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/home.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <div className="w-16 h-16 rounded-lg bg-gradient-gold p-0.5 overflow-hidden shrink-0">
                        <div className="w-full h-full bg-black rounded-[calc(0.5rem-2px)] overflow-hidden flex items-center justify-center">
                            {photoUrl ? (
                                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-8 h-8 text-primary" />
                            )}
                        </div>
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Player Profile</h1>
                        <p className="text-xs text-muted-foreground">Manage your stats and skills</p>
                    </div>
                </motion.div>
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="font-cinzel text-sm font-semibold text-foreground mb-3"
                >
                    Character Stats
                </motion.h2>

                <div className="space-y-3">
                    {statConfigs.map((config, index) => {
                        const stat = stats[config.key as keyof typeof stats];
                        const cost = getTrainCost(stat.level);
                        return (
                            <StatCard
                                key={config.key}
                                name={config.name}
                                icon={config.icon}
                                level={stat.level}
                                maxLevel={stat.maxLevel}
                                currentBonus={getBonus(config.key, stat.level)}
                                nextBonus={getBonus(config.key, stat.level + 1)}
                                trainCost={cost}
                                color={config.color}
                                delay={0.1 * (index + 2)}
                                onTrain={() => handleTrainClick(config.name, cost)}
                            />
                        );
                    })}
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Train Stat?"
                description={`Spend $${pendingTrain?.cost.toLocaleString()} to increase ${pendingTrain?.name} by 1 level?`}
                onConfirm={confirmTrain}
                confirmText="Train"
            />
        </MainLayout >
    );
};

export default ProfilePage;
