import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
    ListTodo,
    ExternalLink,
    Check,
    Clock,
    RefreshCw,
    MessageCircle,
    Loader2,
} from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardDiamonds } from '@/components/RewardAnimation';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, PlayerTask } from '@/hooks/useGameStore';

type TaskType = 'telegram' | 'daily' | 'weekly' | 'special';

interface TaskCardProps {
    task: PlayerTask;
    onVerify: (id: string) => void;
    onStart: (id: string) => void;
    isVerifying: boolean;
}

const TaskCard = ({ task, onVerify, onStart, isVerifying }: TaskCardProps) => {
    const rewardDisplay = task.reward_type === 'cash'
        ? `$${(task.reward_amount / 1000).toFixed(0)}K`
        : `${task.reward_amount} 💎`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`noir-card p-4 ${task.is_completed ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${task.is_completed
                    ? 'bg-green-500/20'
                    : task.task_type === 'telegram'
                        ? 'bg-blue-500/20'
                        : 'bg-primary/20'
                    }`}>
                    {task.is_completed ? (
                        <Check className="w-5 h-5 text-green-500" />
                    ) : task.task_type === 'telegram' ? (
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
                                {task.reward_type === 'cash' ? (
                                    <GameIcon type="cash" className="w-4 h-4" />
                                ) : (
                                    <GameIcon type="diamond" className="w-5 h-5" />
                                )}
                                {rewardDisplay}
                            </div>
                            {task.expires_at && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(task.expires_at).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>

                    {!task.is_completed && (
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
                                    {task.task_type === 'telegram' ? 'Join Channel' : 'Start'}
                                </Button>
                            )}
                            <Button
                                size="sm"
                                className="btn-gold flex-1 text-xs"
                                disabled={isVerifying}
                                onClick={() => onVerify(task.id)}
                            >
                                {isVerifying ? (
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
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const { tasks, isLoadingTasks, loadTasks, completeTask } = useGameStore();

    const [startedTasks, setStartedTasks] = useState<Set<string>>(new Set());
    const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);

    const handleStart = (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task?.link) {
            window.open(task.link, '_blank');
            setStartedTasks(prev => new Set(prev).add(id));
        }
    };

    const handleVerify = async (id: string) => {
        haptic.medium();

        const task = tasks.find(t => t.id === id);
        if (!task) return;

        // Check if user has actually clicked the link (for Telegram tasks)
        if (task.task_type === 'telegram' && task.link && !startedTasks.has(id)) {
            haptic.error();
            toast({
                title: 'Verification Failed',
                description: 'Please join the channel first!',
                variant: 'destructive',
            });
            return;
        }

        setVerifyingTaskId(id);

        try {
            // Simulate verification delay (in real app, would check Telegram API)
            await new Promise(resolve => setTimeout(resolve, 1500));

            const success = await completeTask(id);

            if (success) {
                haptic.success();

                // Trigger reward animation
                if (task.reward_type === 'cash') {
                    rewardCash(task.reward_amount);
                } else {
                    rewardDiamonds(task.reward_amount);
                }

                await refetchPlayer();

                toast({
                    title: 'Task Complete!',
                    description: `+${task.reward_type === 'cash'
                        ? `$${task.reward_amount.toLocaleString()}`
                        : `${task.reward_amount} 💎`}`,
                });
            } else {
                haptic.error();
                toast({
                    title: 'Verification Failed',
                    description: 'Could not verify task completion.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Task verification error:', error);
            haptic.error();
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setVerifyingTaskId(null);
        }
    };

    const telegramTasks = tasks.filter(t => t.task_type === 'telegram');
    const dailyTasks = tasks.filter(t => t.task_type === 'daily');
    const weeklyTasks = tasks.filter(t => t.task_type === 'weekly');

    const completedCount = tasks.filter(t => t.is_completed).length;

    if (isAuthLoading) {
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
            <div className="py-6 px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <img src="/images/icons/tasks.png" alt="Tasks" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Tasks</h1>
                        <p className="text-xs text-muted-foreground">
                            {completedCount}/{tasks.length} completed
                        </p>
                    </div>
                </motion.div>

                {isLoadingTasks ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {/* Partner Channels */}
                        {telegramTasks.length > 0 && (
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
                                            isVerifying={verifyingTaskId === task.id}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Daily Tasks */}
                        {dailyTasks.length > 0 && (
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
                                            isVerifying={verifyingTaskId === task.id}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Weekly Tasks */}
                        {weeklyTasks.length > 0 && (
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
                                            isVerifying={verifyingTaskId === task.id}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {tasks.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No tasks available right now. Check back later!
                            </div>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
};

export default TasksPage;