import { motion } from 'framer-motion';
import { User, Sword, Shield, Zap, Brain, TrendingUp, DollarSign, Users, Building, Crown, Star } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useTelegram, useTelegramPhoto } from '@/hooks/useTelegram';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/hooks/useGameStore';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { ReferralSection } from '@/components/ReferralSection';

// Compact Stat Card for training
interface StatCardProps {
    name: string;
    icon: React.ReactNode;
    level: number;
    currentBonus: string;
    trainCost: number;
    color: string;
    onTrain: () => void;
    canAfford: boolean;
}

const StatCard = ({
    name,
    icon,
    level,
    currentBonus,
    trainCost,
    color,
    onTrain,
    canAfford
}: StatCardProps) => (
    <div className="noir-card p-2.5 flex items-center gap-2">
        <div className={`w-8 h-8 rounded-sm ${color} flex items-center justify-center shrink-0`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
                <span className="font-cinzel font-semibold text-xs text-foreground">{name}</span>
                <span className="text-[10px] text-primary font-bold">Lv.{level}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{currentBonus}</span>
        </div>
        <Button
            size="sm"
            className={`h-7 px-2 text-[10px] ${canAfford ? 'btn-gold' : 'bg-muted text-muted-foreground'}`}
            onClick={onTrain}
            disabled={!canAfford}
        >
            <TrendingUp className="w-3 h-3 mr-0.5" />
            ${(trainCost / 1000).toFixed(0)}K
        </Button>
    </div>
);

// Stat display for empire overview
const EmpireStat = ({ icon, label, value, color = "text-foreground" }: { icon: React.ReactNode; label: string; value: string; color?: string }) => (
    <div className="flex items-center gap-2 bg-muted/20 rounded-sm p-2">
        <div className="text-muted-foreground">{icon}</div>
        <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={`font-cinzel font-bold text-xs ${color}`}>{value}</p>
        </div>
    </div>
);

const ProfilePage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer } = useAuth();
    const { user } = useTelegram();
    const { businesses, crew: hiredCrew } = useGameStore();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingTrain, setPendingTrain] = useState<{ name: string; cost: number; stat: string } | null>(null);

    const photoUrl = useTelegramPhoto();

    // Calculate training cost (exponential scaling)
    const getTrainCost = (level: number) => Math.floor(500 * Math.pow(1.12, level));

    // Calculate bonuses
    const getBonus = (stat: string, level: number) => {
        switch (stat) {
            case 'strength': return `+${level * 2} ATK`;
            case 'defense': return `+${level * 2} DEF`;
            default: return '';
        }
    };

    const handleTrainClick = (name: string, cost: number, stat: string) => {
        if ((player?.cash ?? 0) < cost) {
            toast({
                title: 'Not Enough Cash',
                description: `You need $${cost.toLocaleString()} to train ${name}.`,
                variant: 'destructive',
            });
            return;
        }
        setPendingTrain({ name, cost, stat });
        setConfirmOpen(true);
    };

    const confirmTrain = async () => {
        if (!pendingTrain || !player) return;

        try {
            const { data, error } = await supabase.rpc('train_stat', {
                target_player_id: player.id,
                stat_name: pendingTrain.stat,
                training_cost: pendingTrain.cost
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({
                    title: 'Training Complete!',
                    description: data.message || `${pendingTrain.name} has increased by 1 level.`,
                });
                await refetchPlayer();
            } else {
                toast({
                    title: 'Training Failed',
                    description: data?.message || 'Could not complete training',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Training error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setConfirmOpen(false);
            setPendingTrain(null);
        }
    };

    // Calculate Net Worth
    const cash = player?.cash ?? 0;
    const bankedCash = player?.banked_cash ?? 0;
    const businessValue = businesses.reduce((sum, b) => sum + (b.income_per_hour * 24), 0);
    const netWorth = cash + bankedCash + businessValue;

    // Calculate crew totals
    const totalCrew = hiredCrew.reduce((sum, c) => sum + c.quantity, 0);
    const crewAttack = hiredCrew.reduce((sum, c) => sum + (c.attack_bonus * c.quantity), 0);
    const crewDefense = hiredCrew.reduce((sum, c) => sum + (c.defense_bonus * c.quantity), 0);

    // Player stats - use strength for attack as per Player type
    const strength = player?.strength ?? 10;
    const defense = player?.defense ?? 10;
    const level = player?.level ?? 1;
    const respect = player?.respect ?? 0;

    // Display name (prioritize Telegram name)
    const firstName = user?.first_name || 'Unknown';
    const lastName = user?.last_name || '';
    const username = user?.username ? `@${user.username}` : '';
    const fullName = `${firstName} ${lastName}`.trim();

    // Level badge (synced with RankBadge component)
    const getLevelTitle = (lvl: number) => {
        if (lvl >= 100) return { title: 'Godfather', color: 'text-purple-400' };
        if (lvl >= 75) return { title: 'Boss', color: 'text-primary' };
        if (lvl >= 50) return { title: 'Underboss', color: 'text-slate-300' };
        if (lvl >= 30) return { title: 'Caporegime', color: 'text-blue-400' };
        if (lvl >= 15) return { title: 'Soldier', color: 'text-slate-400' };
        if (lvl >= 5) return { title: 'Enforcer', color: 'text-amber-600' };
        return { title: 'Street Thug', color: 'text-zinc-400' };
    };

    const levelInfo = getLevelTitle(level);

    // Format numbers
    const formatCash = (n: number) => {
        if (n >= 1000000000) return `$${(n / 1000000000).toFixed(1)}B`;
        if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
        return `$${n}`;
    };

    return (
        <MainLayout>
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/home.png)' }}
            />

            <div className="relative z-10 py-4 px-4">
                {/* Player Header with Telegram Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="noir-card p-4 mb-4"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 rounded-lg bg-gradient-gold p-0.5 overflow-hidden shrink-0">
                            <div className="w-full h-full bg-black rounded-[calc(0.5rem-2px)] overflow-hidden flex items-center justify-center">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 text-primary" />
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="font-cinzel text-lg font-bold text-foreground">{fullName}</h1>
                            {username && <p className="text-xs text-muted-foreground">{username}</p>}
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-semibold ${levelInfo.color}`}>{levelInfo.title}</span>
                                <span className="text-[10px] text-muted-foreground">• Level {level}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-muted/30 rounded-sm p-1.5">
                            <p className="text-[10px] text-muted-foreground">Net Worth</p>
                            <p className="font-cinzel font-bold text-xs text-green-400">{formatCash(netWorth)}</p>
                        </div>
                        <div className="text-center bg-muted/30 rounded-sm p-1.5">
                            <p className="text-[10px] text-muted-foreground">Respect</p>
                            <p className="font-cinzel font-bold text-xs text-primary">{respect.toLocaleString()}</p>
                        </div>
                        <div className="text-center bg-muted/30 rounded-sm p-1.5">
                            <p className="text-[10px] text-muted-foreground">Diamonds</p>
                            <p className="font-cinzel font-bold text-xs text-cyan-400">{(player?.diamonds ?? 0).toLocaleString()} 💎</p>
                        </div>
                    </div>
                </motion.div>

                {/* Empire Overview */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mb-4"
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Crown className="w-4 h-4 text-primary" />
                        Empire Overview
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                        <EmpireStat
                            icon={<DollarSign className="w-4 h-4" />}
                            label="Cash on Hand"
                            value={formatCash(cash)}
                            color="text-green-400"
                        />
                        <EmpireStat
                            icon={<Building className="w-4 h-4" />}
                            label="Banked Cash"
                            value={formatCash(bankedCash)}
                            color="text-blue-400"
                        />
                        <EmpireStat
                            icon={<Building className="w-4 h-4" />}
                            label="Businesses"
                            value={`${businesses.length} owned`}
                        />
                        <EmpireStat
                            icon={<Users className="w-4 h-4" />}
                            label="Crew Size"
                            value={`${totalCrew} members`}
                        />
                    </div>
                </motion.div>

                {/* Referral Stats (Compact) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="mb-4"
                >
                    <ReferralSection compact />
                </motion.div>

                {/* Combat Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-4"
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        Combat Power
                    </h2>
                    <div className="noir-card p-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <Sword className="w-4 h-4 text-red-400" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Total Attack</p>
                                    <p className="font-cinzel font-bold text-sm text-red-400">{strength + crewAttack}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-400" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Total Defense</p>
                                    <p className="font-cinzel font-bold text-sm text-blue-400">{defense + crewDefense}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-muted/20 text-[10px] text-muted-foreground">
                            Base: {strength} ATK / {defense} DEF • Crew: +{crewAttack} ATK / +{crewDefense} DEF
                        </div>
                    </div>
                </motion.div>

                {/* Train Stats - Compact */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Train Stats
                    </h2>
                    <div className="space-y-2">
                        <StatCard
                            name="Strength"
                            icon={<Sword className="w-4 h-4 text-primary-foreground" />}
                            level={strength}
                            currentBonus={getBonus('strength', strength)}
                            trainCost={getTrainCost(strength)}
                            color="bg-red-600"
                            onTrain={() => handleTrainClick('Strength', getTrainCost(strength), 'strength')}
                            canAfford={(player?.cash ?? 0) >= getTrainCost(strength)}
                        />
                        <StatCard
                            name="Defense"
                            icon={<Shield className="w-4 h-4 text-primary-foreground" />}
                            level={defense}
                            currentBonus={getBonus('defense', defense)}
                            trainCost={getTrainCost(defense)}
                            color="bg-blue-600"
                            onTrain={() => handleTrainClick('Defense', getTrainCost(defense), 'defense')}
                            canAfford={(player?.cash ?? 0) >= getTrainCost(defense)}
                        />
                    </div>
                </motion.div>
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
