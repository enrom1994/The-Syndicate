import { Crown, Gem, Shield, Star, Swords, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RankName =
    | 'Street Thug'
    | 'Enforcer'
    | 'Soldier'
    | 'Caporegime'
    | 'Underboss'
    | 'Boss'
    | 'Godfather';

interface RankConfig {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
}

const rankConfigs: Record<RankName, RankConfig> = {
    'Street Thug': {
        icon: <UserCircle className="w-full h-full" />,
        color: 'text-zinc-400',
        bgColor: 'bg-zinc-800/50',
        borderColor: 'border-zinc-600',
    },
    'Enforcer': {
        icon: <Swords className="w-full h-full" />,
        color: 'text-amber-700',
        bgColor: 'bg-amber-900/30',
        borderColor: 'border-amber-700',
    },
    'Soldier': {
        icon: <Shield className="w-full h-full" />,
        color: 'text-slate-400',
        bgColor: 'bg-slate-700/50',
        borderColor: 'border-slate-500',
    },
    'Caporegime': {
        icon: <Star className="w-full h-full" />,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-900/30',
        borderColor: 'border-yellow-600',
    },
    'Underboss': {
        icon: <Crown className="w-full h-full" />,
        color: 'text-slate-300',
        bgColor: 'bg-gradient-to-br from-slate-600 to-slate-800',
        borderColor: 'border-slate-400',
    },
    'Boss': {
        icon: <Crown className="w-full h-full" />,
        color: 'text-primary',
        bgColor: 'bg-gradient-gold',
        borderColor: 'border-primary',
    },
    'Godfather': {
        icon: <Gem className="w-full h-full" />,
        color: 'text-purple-300',
        bgColor: 'bg-gradient-to-br from-purple-600 via-primary to-purple-600',
        borderColor: 'border-purple-400',
    },
};

interface RankBadgeProps {
    rank: RankName;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const sizes = {
    sm: 'w-6 h-6 p-1',
    md: 'w-8 h-8 p-1.5',
    lg: 'w-12 h-12 p-2',
};

export const RankBadge = ({ rank, size = 'md', showLabel = false, className }: RankBadgeProps) => {
    const config = rankConfigs[rank];

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div
                className={cn(
                    "rounded-full border-2 flex items-center justify-center",
                    sizes[size],
                    config.bgColor,
                    config.borderColor,
                    config.color
                )}
            >
                {config.icon}
            </div>
            {showLabel && (
                <span className={cn("font-cinzel font-semibold text-sm", config.color)}>
                    {rank}
                </span>
            )}
        </div>
    );
};

// Get rank from level
export const getRankFromLevel = (level: number): RankName => {
    if (level >= 100) return 'Godfather';
    if (level >= 75) return 'Boss';
    if (level >= 50) return 'Underboss';
    if (level >= 30) return 'Caporegime';
    if (level >= 15) return 'Soldier';
    if (level >= 5) return 'Enforcer';
    return 'Street Thug';
};

// All ranks in order
export const RANK_ORDER: RankName[] = [
    'Street Thug',
    'Enforcer',
    'Soldier',
    'Caporegime',
    'Underboss',
    'Boss',
    'Godfather',
];
