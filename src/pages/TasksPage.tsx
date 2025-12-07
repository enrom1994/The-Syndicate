import { motion } from 'framer-motion';
import { useState } from 'react';
import {
    ListTodo,
    ExternalLink,
    Check,
    Clock,
    RefreshCw,
    MessageCircle,
} from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardDiamonds } from '@/components/RewardAnimation';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';

type TaskType = 'telegram' | 'daily' | 'weekly' | 'special';

interface Task {
    id: string;
    title: string;
    description: string;
    type: TaskType;
    reward: { type: 'cash' | 'diamonds'; amount: number };
    link?: string;
    isCompleted: boolean;
    isVerifying: boolean;
    expiresAt?: string;
}

const TaskCard = ({
    task,
    onVerify,
    onStart,
}: {
    task: Task;
    onVerify: (id: string) => void;
    onStart: (id: string) => void;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`noir-card p-4 ${task.isCompleted ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${task.isCompleted
                    ? 'bg-green-500/20'
                    : task.type === 'telegram'
                        ? 'bg-blue-500/20'
                        : 'bg-primary/20'
                    }`}>
                    {task.isCompleted ? (
                        <Check className="w-5 h-5 text-green-500" />
                    ) : task.type === 'telegram' ? (
                        <MessageCircle className="w-5 h-5 text-blue-400" />
                    ) : (
                        <ListTodo className="w-5 h-5 text-primary" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-cinzel font-semibold text-sm text-foreground">
                                {task.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {task.description}
                            </p>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                                {task.reward.type === 'cash' ? (
                                    <GameIcon type="cash" className="w-4 h-4" />
                                ) : (
                                    <GameIcon type="diamond" className="w-5 h-5" /> // Increased size
                                )}
                                {task.reward.type === 'cash'
                                    ? `$${(task.reward.amount / 1000).toFixed(0)}K`
                                    : `${task.reward.amount} 💎`}
                            </div>
                            {task.expiresAt && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                    <Clock className="w-3 h-3" />
                                    {task.expiresAt}
                                </div>
                            )}
                        </div>
                    </div>

                    {!task.isCompleted && (
                        <div className="flex gap-2 mt-3">
                            {task.link && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs"
                                    onClick={() => {
                                        haptic.light();
                                        onStart(task.id);
                                    }}
                                >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    {task.type === 'telegram' ? 'Join Channel' : 'Start'}
                                </Button>
                            )}
                            <Button
                                size="sm"
                                className="btn-gold flex-1 text-xs"
                                disabled={task.isVerifying}
                                onClick={() => onVerify(task.id)}
                            >
                                {task.isVerifying ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Claim'
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const TasksPage = () => {
    const { toast } = useToast();

    const [tasks, setTasks] = useState<Task[]>([
        // Telegram Partner Channels
        {
            id: '1',
            title: 'Join TON Official',
            description: 'Join the official TON community channel',
            type: 'telegram',
            reward: { type: 'diamonds', amount: 50 },
            link: 'https://t.me/ton_blockchain',
            isCompleted: false,
            isVerifying: false,
        },
        {
            id: '2',
            title: 'Join Crypto News',
            description: 'Subscribe to daily crypto updates',
            type: 'telegram',
            reward: { type: 'cash', amount: 25000 },
            link: 'https://t.me/cryptonews',
            isCompleted: true,
            isVerifying: false,
        },
        {
            id: '3',
            title: 'Follow The Syndicate',
            description: 'Join our official game channel',
            type: 'telegram',
            reward: { type: 'diamonds', amount: 100 },
            link: 'https://t.me/syndicate_game',
            isCompleted: false,
            isVerifying: false,
        },

        // Daily Tasks
        {
            id: '4',
            title: 'Daily Login',
            description: 'Claim your daily login reward',
            type: 'daily',
            reward: { type: 'cash', amount: 5000 },
            isCompleted: false,
            isVerifying: false,
            expiresAt: '23:45:12',
        },
        {
            id: '5',
            title: 'Complete 3 Jobs',
            description: 'Finish 3 job operations today',
            type: 'daily',
            reward: { type: 'cash', amount: 10000 },
            isCompleted: false,
            isVerifying: false,
            expiresAt: '23:45:12',
        },

        // Weekly
        {
            id: '6',
            title: 'Weekly Warrior',
            description: 'Win 10 attacks this week',
            type: 'weekly',
            reward: { type: 'diamonds', amount: 75 },
            isCompleted: false,
            isVerifying: false,
            expiresAt: '6d 23h',
        },
    ]);

    const handleStart = (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task?.link) {
            window.open(task.link, '_blank');
        }
    };

    const handleVerify = async (id: string) => {
        haptic.medium();

        // Set verifying state
        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, isVerifying: true } : t
        ));

        // Simulate verification delay (in real app, would check Telegram API)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const task = tasks.find(t => t.id === id);
        if (!task) return;

        // For demo, randomly succeed or fail (70% success)
        const success = Math.random() > 0.3;

        if (success) {
            haptic.success();

            // Trigger reward animation
            if (task.reward.type === 'cash') {
                rewardCash(task.reward.amount);
            } else {
                rewardDiamonds(task.reward.amount);
            }

            setTasks(prev => prev.map(t =>
                t.id === id ? { ...t, isCompleted: true, isVerifying: false } : t
            ));

            toast({
                title: 'Task Complete!',
                description: `+${task.reward.type === 'cash'
                    ? `$${task.reward.amount.toLocaleString()}`
                    : `${task.reward.amount} 💎`}`,
            });
        } else {
            haptic.error();

            setTasks(prev => prev.map(t =>
                t.id === id ? { ...t, isVerifying: false } : t
            ));

            toast({
                title: 'Verification Failed',
                description: 'Make sure you joined the channel first!',
                variant: 'destructive',
            });
        }
    };

    const telegramTasks = tasks.filter(t => t.type === 'telegram');
    const dailyTasks = tasks.filter(t => t.type === 'daily');
    const weeklyTasks = tasks.filter(t => t.type === 'weekly');

    const completedCount = tasks.filter(t => t.isCompleted).length;

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
                        <ListTodo className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Tasks</h1>
                        <p className="text-xs text-muted-foreground">
                            {completedCount}/{tasks.length} completed
                        </p>
                    </div>
                </motion.div>

                {/* Partner Channels */}
                <div className="mb-6">
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-blue-400" />
                        Partner Channels
                    </h2>
                    <div className="space-y-3">
                        {telegramTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onVerify={handleVerify}
                                onStart={handleStart}
                            />
                        ))}
                    </div>
                </div>

                {/* Daily Tasks */}
                <div className="mb-6">
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Daily Tasks
                    </h2>
                    <div className="space-y-3">
                        {dailyTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onVerify={handleVerify}
                                onStart={handleStart}
                            />
                        ))}
                    </div>
                </div>

                {/* Weekly Tasks */}
                <div>
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-purple-400" />
                        Weekly Tasks
                    </h2>
                    <div className="space-y-3">
                        {weeklyTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onVerify={handleVerify}
                                onStart={handleStart}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default TasksPage;