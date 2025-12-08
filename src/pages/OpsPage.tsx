import { motion } from 'framer-motion';
import { Swords, Target, Clock, Zap, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CombatResultModal } from '@/components/CombatResultModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, JobDefinition } from '@/hooks/useGameStore';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { rewardCash } from '@/components/RewardAnimation';

interface TargetPlayer {
    id: string;
    username: string;
    cash: number;
    defense: number;
    attack: number;
}

interface TargetCardProps {
    id: string;
    name: string;
    netWorth: string;
    defense: number;
    risk: 'Low' | 'Medium' | 'High';
    isProcessing?: boolean;
    delay?: number;
    onAttack: () => void;
}

const TargetCard = ({ id, name, netWorth, defense, risk, isProcessing, delay = 0, onAttack }: TargetCardProps) => {
    const riskColor = risk === 'Low' ? 'text-green-500' : risk === 'Medium' ? 'text-yellow-500' : 'text-red-500';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card p-4"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
                    <p className="text-xs text-muted-foreground">Enemy Player</p>
                </div>
                <span className={`text-xs font-medium ${riskColor}`}>{risk} Risk</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <p className="text-xs text-muted-foreground">Net Worth</p>
                    <p className="font-cinzel font-bold text-sm text-primary">{netWorth}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Defense</p>
                    <div className="flex items-center gap-2">
                        <Progress value={Math.min(defense, 100)} className="h-1.5 flex-1" />
                        <span className="text-xs text-foreground">{defense}</span>
                    </div>
                </div>
            </div>

            <Button
                className="w-full btn-gold text-xs"
                onClick={onAttack}
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <Swords className="w-4 h-4 mr-2" />
                        Attack
                    </>
                )}
            </Button>
        </motion.div>
    );
};

interface JobCardProps {
    id: string;
    name: string;
    description: string;
    reward: number;
    energy: number;
    isProcessing?: boolean;
    delay?: number;
    onExecute: () => void;
}

const JobCard = ({ id, name, description, reward, energy, isProcessing, delay = 0, onExecute }: JobCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-start justify-between mb-2">
            <div>
                <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                <GameIcon type="cash" className="w-4 h-4" />
                ${reward.toLocaleString()}
            </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-yellow-500" />
                -{energy} Energy
            </div>
        </div>

        <Button
            className="w-full mt-3 btn-gold text-xs"
            onClick={onExecute}
            disabled={isProcessing}
        >
            {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                'Execute Job'
            )}
        </Button>
    </motion.div>
);

const OpsPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const { jobDefinitions, isLoadingDefinitions, completeJob, performAttack } = useGameStore();

    const [activeTab, setActiveTab] = useState('attack');
    const [targets, setTargets] = useState<TargetPlayer[]>([]);
    const [isLoadingTargets, setIsLoadingTargets] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // ... (rest of state)

    // ... (rest of effects and functions)

    const handleJobExecute = async (job: JobDefinition) => {
        if (!player) return;

        setProcessingId(job.id);

        try {
            const result = await completeJob(job.id);

            if (result.success) {
                haptic.success();
                if (result.cash_earned) rewardCash(result.cash_earned);

                toast({
                    title: result.leveled_up ? 'LEVEL UP! 🎉' : 'Job Completed!',
                    description: result.leveled_up
                        ? `You reached Level ${result.new_level}! Energy Refilled.`
                        : `${job.name} - Earned $${result.cash_earned?.toLocaleString()} & ${result.xp_earned} XP`,
                    className: result.leveled_up ? 'bg-primary text-primary-foreground' : '',
                });

                // Refetch player to get new stats (especially if leveled up)
                await refetchPlayer();
            } else {
                haptic.error();
                toast({
                    title: 'Job Failed',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Job error:', error);
            haptic.error();
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setProcessingId(null);
        }
    };

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
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/attack.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Swords className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Operations</h1>
                        <p className="text-xs text-muted-foreground">Attack rivals & execute jobs for profit</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-3 mb-6 grid grid-cols-3 gap-3"
                >
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Kills</p>
                        <p className="font-cinzel font-bold text-lg text-foreground">{player?.total_kills ?? 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Stamina</p>
                        <p className="font-cinzel font-bold text-lg text-primary">
                            {player?.stamina ?? 0}/{player?.max_stamina ?? 100}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Energy</p>
                        <p className="font-cinzel font-bold text-lg text-foreground">
                            {player?.energy ?? 0}/{player?.max_energy ?? 100}
                        </p>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="attack" className="font-cinzel text-xs flex items-center gap-2">
                            <Swords className="w-4 h-4" />
                            Attack
                        </TabsTrigger>
                        <TabsTrigger value="jobs" className="font-cinzel text-xs flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Jobs
                        </TabsTrigger>
                    </TabsList>


                    <TabsContent value="attack" className="space-y-3 mt-0">
                        {isLoadingTargets ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : targets.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No targets available</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={loadTargets}
                                >
                                    Refresh Targets
                                </Button>
                            </div>
                        ) : (
                            targets.map((target, index) => (
                                <TargetCard
                                    key={target.id}
                                    id={target.id}
                                    name={target.username || `Player ${target.id.slice(0, 6)}`}
                                    netWorth={formatNetWorth(target.cash)}
                                    defense={target.defense}
                                    risk={getRisk(target.defense)}
                                    isProcessing={processingId === target.id}
                                    delay={0.1 * index}
                                    onAttack={() => handleAttackClick(target)}
                                />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="jobs" className="space-y-3 mt-0">
                        {isLoadingDefinitions ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : jobDefinitions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No jobs available</p>
                        ) : (
                            jobDefinitions.map((job, index) => (
                                <JobCard
                                    key={job.id}
                                    id={job.id}
                                    name={job.name}
                                    description={job.description || ''}
                                    reward={job.base_reward}
                                    energy={job.energy_cost}
                                    isProcessing={processingId === job.id}
                                    delay={0.1 * index}
                                    onExecute={() => handleJobExecute(job)}
                                />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Confirm Attack"
                description={`Are you sure you want to attack ${pendingAttack?.username || 'this player'}? This will cost 10 stamina.`}
                onConfirm={executeAttack}
                confirmText="Attack!"
                variant="destructive"
            />

            <CombatResultModal
                open={combatResult.open}
                onClose={() => setCombatResult(prev => ({ ...prev, open: false }))}
                result={combatResult.result}
                targetName={combatResult.targetName}
                cashGained={combatResult.cashGained}
                cashLost={combatResult.cashLost}
                respectGained={combatResult.respectGained}
                respectLost={combatResult.respectLost}
            />
        </MainLayout>
    );
};

export default OpsPage;
