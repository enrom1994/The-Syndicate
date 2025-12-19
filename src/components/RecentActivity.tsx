import { motion } from 'framer-motion';
import { Coins, Sword, TrendingUp, Building2, Users, Gift, Clock, ChevronRight, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type ActivityType = 'income' | 'attack' | 'job' | 'business' | 'family' | 'reward';

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
    job: <Briefcase className="w-4 h-4 text-blue-400" />,
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

// Helper to format relative time
const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

// Map notification type to activity type
const mapNotificationType = (notifType: string): ActivityType => {
    if (notifType.includes('attack') || notifType.includes('combat')) return 'attack';
    if (notifType.includes('job')) return 'job';
    if (notifType.includes('business') || notifType.includes('income')) return 'business';
    if (notifType.includes('reward') || notifType.includes('daily') || notifType.includes('task')) return 'reward';
    if (notifType.includes('family')) return 'family';
    if (notifType.includes('purchase') || notifType.includes('upgrade')) return 'business';
    return 'income';
};

export const RecentActivity = () => {
    const navigate = useNavigate();
    const { player } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!player?.id) return;

        let isMounted = true;

        const fetchActivity = async () => {
            setIsLoading(true);
            try {
                // Fetch recent notifications (same source as Activity page)
                const { data, error } = await supabase
                    .rpc('get_notifications', {
                        target_player_id: player.id,
                        limit_count: 5
                    });

                // Don't update state if component unmounted
                if (!isMounted) return;

                if (error) throw error;

                const notifications = data?.notifications || [];
                const mapped: Activity[] = notifications.map((notif: any) => ({
                    id: notif.id,
                    type: mapNotificationType(notif.type),
                    message: notif.title || 'Activity',
                    details: notif.description,
                    timeAgo: notif.time_ago || 'Just now',
                }));

                setActivities(mapped);
            } catch (error: any) {
                // Silently ignore aborted requests and network errors during unmount
                if (!isMounted || error?.name === 'AbortError' || error?.message?.includes('Failed to fetch')) {
                    return;
                }
                console.error('Error fetching activity:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchActivity();

        return () => {
            isMounted = false;
        };
    }, [player?.id]);

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
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/notifications')}
                >
                    View All <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
            </div>

            <div className="noir-card p-3">
                {activities.length > 0 ? (
                    activities.slice(0, 5).map((activity, index) => (
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