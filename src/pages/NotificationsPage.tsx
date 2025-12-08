import { motion } from 'framer-motion';
import { Bell, Swords, Briefcase, Users, Target, Check, Trash2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';

interface Notification {
    id: string;
    type: 'attack' | 'income' | 'job' | 'family' | 'system' | 'bounty';
    title: string;
    description: string | null;
    is_read: boolean;
    created_at: string;
    time_ago: string;
}

interface NotificationItemProps {
    notification: Notification;
    onMarkRead: () => void;
    delay?: number;
}

const typeIcons: Record<string, React.ReactNode> = {
    attack: <Swords className="w-4 h-4" />,
    income: <GameIcon type="cash" className="w-4 h-4" />,
    job: <Target className="w-4 h-4" />,
    family: <Users className="w-4 h-4" />,
    system: <Bell className="w-4 h-4" />,
    bounty: <Target className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
    attack: 'bg-red-600',
    income: 'bg-green-600',
    job: 'bg-blue-600',
    family: 'bg-purple-600',
    system: 'bg-gray-600',
    bounty: 'bg-yellow-600',
};

const NotificationItem = ({ notification, onMarkRead, delay = 0 }: NotificationItemProps) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`noir-card p-3 flex items-start gap-3 ${!notification.is_read ? 'border-l-2 border-primary' : 'opacity-60'}`}
    >
        <div className={`w-8 h-8 rounded-full ${typeColors[notification.type] || 'bg-gray-600'} flex items-center justify-center shrink-0`}>
            <span className="text-white">{typeIcons[notification.type] || <Bell className="w-4 h-4" />}</span>
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-cinzel font-semibold text-sm text-foreground">{notification.title}</h3>
                <span className="text-[10px] text-muted-foreground shrink-0">{notification.time_ago}</span>
            </div>
            {notification.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.description}</p>
            )}
        </div>
        {!notification.is_read && (
            <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6"
                onClick={onMarkRead}
            >
                <Check className="w-3 h-3" />
            </Button>
        )}
    </motion.div>
);

const NotificationsPage = () => {
    const { player } = useAuth();
    const [activeTab, setActiveTab] = useState('all');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Load notifications
    useEffect(() => {
        if (player?.id) {
            loadNotifications();
        }
    }, [player?.id]);

    const loadNotifications = async () => {
        if (!player?.id) return;

        try {
            const { data, error } = await supabase.rpc('get_notifications', {
                target_player_id: player.id,
                limit_count: 50
            });

            if (error) throw error;

            setNotifications(data?.notifications || []);
            setUnreadCount(data?.unread_count || 0);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter(n => n.type === activeTab);

    const markAsRead = async (id: string) => {
        if (!player?.id) return;

        try {
            await supabase.rpc('mark_notification_read', {
                target_player_id: player.id,
                notification_id: id
            });

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            haptic.light();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllRead = async () => {
        if (!player?.id) return;

        setIsProcessing(true);
        try {
            await supabase.rpc('mark_all_notifications_read', {
                target_player_id: player.id
            });

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            haptic.success();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const clearAll = async () => {
        if (!player?.id) return;

        setIsProcessing(true);
        try {
            await supabase.rpc('clear_all_notifications', {
                target_player_id: player.id
            });

            setNotifications([]);
            setUnreadCount(0);
            haptic.success();
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
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
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center relative">
                            <Bell className="w-5 h-5 text-primary-foreground" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-[10px] text-white rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="font-cinzel text-xl font-bold text-foreground">Activity</h1>
                            <p className="text-xs text-muted-foreground">{unreadCount} unread notifications</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={markAllRead}
                            disabled={isProcessing || unreadCount === 0}
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Read All
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive"
                            onClick={clearAll}
                            disabled={isProcessing || notifications.length === 0}
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Clear
                        </Button>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="all" className="font-cinzel text-[10px]">All</TabsTrigger>
                        <TabsTrigger value="attack" className="font-cinzel text-[10px]">Combat</TabsTrigger>
                        <TabsTrigger value="income" className="font-cinzel text-[10px]">Income</TabsTrigger>
                        <TabsTrigger value="job" className="font-cinzel text-[10px]">Jobs</TabsTrigger>
                        <TabsTrigger value="family" className="font-cinzel text-[10px]">Family</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-2 mt-0">
                        {filteredNotifications.length > 0 ? (
                            filteredNotifications.map((notification, index) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    delay={0.05 * index}
                                    onMarkRead={() => markAsRead(notification.id)}
                                />
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                                <p className="text-sm text-muted-foreground">
                                    {activeTab === 'all' ? 'No notifications yet' : `No ${activeTab} notifications`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Notifications will appear as you play
                                </p>
                            </motion.div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
};

export default NotificationsPage;
