import { motion } from 'framer-motion';
import { Coins, Sword, TrendingUp, Building2, Users, Gift, Clock } from 'lucide-react';

type ActivityType = 'income' | 'attack' | 'upgrade' | 'business' | 'family' | 'reward';

interface Activity {
    id: string;
    type: ActivityType;
    message: string;
    details?: string;
    timeAgo: string;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
    income: <Coins className="w-4 h-4 text-green-400" />,
    attack: <Sword className="w-4 h-4 text-red-400" />,
    upgrade: <TrendingUp className="w-4 h-4 text-blue-400" />,
    business: <Building2 className="w-4 h-4 text-primary" />,
    family: <Users className="w-4 h-4 text-purple-400" />,
    reward: <Gift className="w-4 h-4 text-yellow-400" />,
};

interface ActivityItemProps {
    activity: Activity;
    index: number;
}

const ActivityItem = ({ activity, index }: ActivityItemProps) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
    >
        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
            {activityIcons[activity.type]}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{activity.message}</p>
            {activity.details && (
                <p className="text-xs text-muted-foreground truncate">{activity.details}</p>
            )}
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {activity.timeAgo}
        </span>
    </motion.div>
);

export const RecentActivity = () => {
    // Mock data - will come from notifications context
    const activities: Activity[] = [
        { id: '1', type: 'income', message: 'Collected $5,000', details: 'from Speakeasy', timeAgo: '2m' },
        { id: '2', type: 'attack', message: 'Attacked Mike_NYC', details: 'Won! +$2,500', timeAgo: '15m' },
        { id: '3', type: 'upgrade', message: 'Business upgraded', details: 'Nightclub to Level 3', timeAgo: '1h' },
        { id: '4', type: 'reward', message: 'Daily reward claimed', details: '+50 Energy', timeAgo: '2h' },
        { id: '5', type: 'family', message: 'Joined The Corleone Family', timeAgo: '1d' },
    ];

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-4 pb-6"
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-cinzel text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Recent Activity
                </h3>
                <span className="text-[10px] text-muted-foreground">Last 5 events</span>
            </div>

            <div className="noir-card p-3">
                {activities.length > 0 ? (
                    activities.map((activity, index) => (
                        <ActivityItem key={activity.id} activity={activity} index={index} />
                    ))
                ) : (
                    <div className="py-6 text-center">
                        <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No recent activity</p>
                        <p className="text-xs text-muted-foreground/70">Start doing jobs to see activity here</p>
                    </div>
                )}
            </div>
        </motion.section>
    );
};
