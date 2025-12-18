import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MadeManBadgeProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    showTooltip?: boolean;
}

const sizeClasses = {
    sm: 'w-4 h-4 -bottom-0.5 -right-0.5',
    md: 'w-5 h-5 -bottom-1 -right-1',
    lg: 'w-6 h-6 -bottom-1 -right-1',
};

const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
};

export const MadeManBadge = ({ size = 'md', className, showTooltip = true }: MadeManBadgeProps) => {
    return (
        <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.2 }}
            className={cn(
                'absolute flex items-center justify-center rounded-full',
                'bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600',
                'border-2 border-amber-300 shadow-lg shadow-amber-500/30',
                sizeClasses[size],
                className
            )}
            title={showTooltip ? 'Made Man' : undefined}
        >
            <Crown className={cn('text-amber-900', iconSizes[size])} />

            {/* Shimmer effect */}
            <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                    x: [-20, 20],
                    opacity: [0, 0.5, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                }}
            />
        </motion.div>
    );
};

// Wrapper component for avatars with optional MadeMan badge
interface AvatarWithBadgeProps {
    children: React.ReactNode;
    hasMadeMan?: boolean;
    badgeSize?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const AvatarWithBadge = ({
    children,
    hasMadeMan = false,
    badgeSize = 'md',
    className
}: AvatarWithBadgeProps) => {
    return (
        <div className={cn('relative inline-block', className)}>
            {children}
            {hasMadeMan && <MadeManBadge size={badgeSize} />}
        </div>
    );
};
