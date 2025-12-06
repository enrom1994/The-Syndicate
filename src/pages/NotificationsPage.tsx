import { motion } from 'framer-motion';
import { Bell, Swords, Briefcase, Users, Target, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameIcon } from '@/components/GameIcon';

interface NotificationItemProps {
    type: 'attack' | 'income' | 'job' | 'family';
    title: string;
    description: string;
    time: string;
    read: boolean;
    delay?: number;
    onMarkRead: () => void;
}

const typeIcons = {
    attack: <Swords className="w-4 h-4" />,
    income: <GameIcon type="cash" className="w-4 h-4" />,
    job: <Target className="w-4 h-4" />,
    family: <Users className="w-4 h-4" />,
};

const typeColors = {
    attack: 'bg-red-600',
    income: 'bg-green-600',
    job: 'bg-blue-600',
    family: 'bg-purple-600',
};

const NotificationItem = ({
    type,
    title,
    description,
    time,
    read,
    delay = 0,
    onMarkRead
}: NotificationItemProps) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay }}
        className={`noir-card p-3 flex items-start gap-3 ${!read ? 'border-l-2 border-primary' : 'opacity-60'}`}
    >
        <div className={`w-8 h-8 rounded-full ${typeColors[type]} flex items-center justify-center shrink-0`}>
            <span className="text-white">{typeIcons[type]}</span>
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-cinzel font-semibold text-sm text-foreground">{title}</h3>
                <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        </div>
        {!read && (
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
    const [activeTab, setActiveTab] = useState('all');

    // Mock notifications
    const [notifications, setNotifications] = useState([
        { id: 1, type: 'attack' as const, title: 'Attack Defended!', description: 'You successfully defended against an attack from Jimmy "Two-Face"', time: '2m ago', read: false },
        { id: 2, type: 'income' as const, title: 'Income Collected', description: 'Collected $50,000 from your Speakeasy', time: '15m ago', read: false },
        { id: 3, type: 'attack' as const, title: 'You Were Attacked!', description: 'Sal Maroni attacked you and stole $12,500', time: '1h ago', read: false },
        { id: 4, type: 'job' as const, title: 'Job Complete', description: 'Rob the Bank completed successfully. Earned $50,000', time: '2h ago', read: true },
        { id: 5, type: 'family' as const, title: 'Family News', description: 'Don Vito promoted Clemenza to Captain', time: '3h ago', read: true },
        { id: 6, type: 'income' as const, title: 'Income Collected', description: 'Collected $125,000 from your Casino', time: '4h ago', read: true },
        { id: 7, type: 'attack' as const, title: 'Victory!', description: 'You defeated Johnny Bananas and stole $35,000', time: '5h ago', read: true },
        { id: 8, type: 'job' as const, title: 'Job Failed', description: 'Bank Heist failed. Lost 15 energy.', time: '6h ago', read: true },
    ]);

    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter(n => n.type === activeTab);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: number) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

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
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="font-cinzel text-xl font-bold text-foreground">Activity</h1>
                            <p className="text-xs text-muted-foreground">{unreadCount} unread notifications</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead}>
                            <Check className="w-3 h-3 mr-1" />
                            Read All
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
                                    {...notification}
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
                                <p className="text-sm text-muted-foreground">No notifications</p>
                            </motion.div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
};

export default NotificationsPage;
