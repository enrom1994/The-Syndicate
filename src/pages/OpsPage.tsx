import { motion } from 'framer-motion';
import { Swords, Target, Clock, Zap, Loader2, Skull, Users, Shield, DollarSign, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CombatResultModal } from '@/components/CombatResultModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, JobDefinition } from '@/hooks/useGameStore';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { rewardCash } from '@/components/RewardAnimation';

// =====================================================
// INTERFACES
// =====================================================

interface TargetPlayer {
    id: string;
    username: string;
    cash: number;
    defense: number;
    attack: number;
}

interface PveTarget {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    required_level: number;
    stamina_cost: number;
    base_strength: number;
    cash_reward: number;
    xp_reward: number;
    respect_reward: number;
    base_success_rate: number;
    cooldown_minutes: number;
    is_available: boolean;
    cooldown_remaining_seconds: number;
    player_meets_level: boolean;
}

interface PvpAttackType {
    id: string;
    name: string;
    description: string;
    stamina_cost: number;
    requires_crew: boolean;
    requires_consumables: boolean;
    steals_cash: boolean;
    steals_vault: boolean;
    steals_contraband: boolean;
    steals_respect: boolean;
    kills_crew: boolean;
    cash_steal_percent: number;
    vault_steal_percent: number;
}

// =====================================================
// PVE TARGET CARD
// =====================================================

const PveTargetCard = ({
    target,
    isProcessing,
    delay = 0,
    onAttack
}: {
    target: PveTarget;
    isProcessing: boolean;
    delay?: number;
    onAttack: () => void;
}) => {
    const difficultyColor = {
        easy: 'text-green-500 border-green-500/30',
        medium: 'text-yellow-500 border-yellow-500/30',
        hard: 'text-orange-500 border-orange-500/30',
        expert: 'text-red-500 border-red-500/30',
    }[target.difficulty] || 'text-gray-500';

    const formatCooldown = (seconds: number) => {
        if (seconds <= 0) return '';
        const mins = Math.ceil(seconds / 60);
        return `${mins}m`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card p-4"
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{target.name}</h3>
                    <p className="text-xs text-muted-foreground">{target.description}</p>
                </div>
                <span className={`text-xs font-medium uppercase px-2 py-0.5 border rounded ${difficultyColor}`}>
                    {target.difficulty}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>
                    <p className="text-muted-foreground">Cash</p>
                    <p className="font-bold text-primary">${target.cash_reward.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">XP</p>
                    <p className="font-bold text-blue-400">+{target.xp_reward}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">Respect</p>
                    <p className="font-bold text-yellow-400">+{target.respect_reward}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                -{target.stamina_cost} Stamina
                <span className="mx-1">•</span>
                <Shield className="w-3 h-3" />
                Lv {target.required_level}+
            </div>

            <Button
                className="w-full btn-gold text-xs"
                onClick={onAttack}
                disabled={isProcessing || !target.is_available || !target.player_meets_level}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : !target.player_meets_level ? (
                    `Requires Lv ${target.required_level}`
                ) : !target.is_available ? (
                    <>
                        <Clock className="w-4 h-4 mr-1" />
                        {formatCooldown(target.cooldown_remaining_seconds)}
                    </>
                ) : (
                    <>
                        <Skull className="w-4 h-4 mr-1" />
                        Attack
                    </>
                )}
            </Button>
        </motion.div>
    );
};

// =====================================================
// PVP TARGET CARD (with attack type selection)
// =====================================================

const TargetCard = ({
    target,
    attackTypes,
    isProcessing,
    delay = 0,
    onAttack
}: {
    target: TargetPlayer;
    attackTypes: PvpAttackType[];
    isProcessing: boolean;
    delay?: number;
    onAttack: (attackType: string) => void;
}) => {
    const [showTypes, setShowTypes] = useState(false);

    const getRisk = (defense: number): { label: string; color: string } => {
        if (defense < 30) return { label: 'Low', color: 'text-green-500' };
        if (defense < 70) return { label: 'Medium', color: 'text-yellow-500' };
        return { label: 'High', color: 'text-red-500' };
    };

    const formatNetWorth = (cash: number): string => {
        if (cash >= 1000000) return `$${(cash / 1000000).toFixed(1)}M`;
        if (cash >= 1000) return `$${(cash / 1000).toFixed(1)}K`;
        return `$${cash}`;
    };

    const risk = getRisk(target.defense);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card p-4"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">
                        {target.username || `Player ${target.id.slice(0, 6)}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">Enemy Player</p>
                </div>
                <span className={`text-xs font-medium ${risk.color}`}>{risk.label} Risk</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <p className="text-xs text-muted-foreground">Net Worth</p>
                    <p className="font-cinzel font-bold text-sm text-primary">{formatNetWorth(target.cash)}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Defense</p>
                    <div className="flex items-center gap-2">
                        <Progress value={Math.min(target.defense, 100)} className="h-1.5 flex-1" />
                        <span className="text-xs text-foreground">{target.defense}</span>
                    </div>
                </div>
            </div>

            {!showTypes ? (
                <Button
                    className="w-full btn-gold text-xs"
                    onClick={() => setShowTypes(true)}
                    disabled={isProcessing}
                >
                    <Swords className="w-4 h-4 mr-2" />
                    Choose Attack
                </Button>
            ) : (
                <div className="space-y-2">
                    {attackTypes.map(type => (
                        <Button
                            key={type.id}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs justify-between"
                            onClick={() => {
                                onAttack(type.id);
                                setShowTypes(false);
                            }}
                            disabled={isProcessing}
                        >
                            <span>{type.name}</span>
                            <span className="text-muted-foreground">{type.stamina_cost}⚡</span>
                        </Button>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setShowTypes(false)}
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </motion.div>
    );
};

// =====================================================
// JOB CARD
// =====================================================

const JobCard = ({ job, isProcessing, delay = 0, onExecute }: {
    job: JobDefinition;
    isProcessing: boolean;
    delay?: number;
    onExecute: () => void;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-start justify-between mb-2">
            <div>
                <h3 className="font-cinzel font-semibold text-sm text-foreground">{job.name}</h3>
                <p className="text-xs text-muted-foreground">{job.description}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                <GameIcon type="cash" className="w-4 h-4" />
                ${job.cash_reward.toLocaleString()}
            </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-yellow-500" />
                -{job.energy_cost} Energy
            </div>
        </div>

        <Button
            className="w-full mt-3 btn-gold text-xs"
            onClick={onExecute}
            disabled={isProcessing}
        >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute Job'}
        </Button>
    </motion.div>
);

// =====================================================
// MAIN PAGE
// =====================================================

const OpsPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const { jobDefinitions, isLoadingDefinitions, completeJob } = useGameStore();

    const [activeTab, setActiveTab] = useState('pve');

    // PvE state
    const [pveTargets, setPveTargets] = useState<PveTarget[]>([]);
    const [isLoadingPve, setIsLoadingPve] = useState(true);

    // PvP state
    const [pvpTargets, setPvpTargets] = useState<TargetPlayer[]>([]);
    const [pvpAttackTypes, setPvpAttackTypes] = useState<PvpAttackType[]>([]);
    const [isLoadingPvp, setIsLoadingPvp] = useState(true);

    const [processingId, setProcessingId] = useState<string | null>(null);

    // Combat modal
    const [combatResult, setCombatResult] = useState<{
        open: boolean;
        result: 'victory' | 'defeat';
        targetName: string;
        cashGained: number;
        cashLost: number;
        respectGained: number;
        respectLost: number;
    }>({ open: false, result: 'victory', targetName: '', cashGained: 0, cashLost: 0, respectGained: 0, respectLost: 0 });

    // PvP confirm dialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPvpAttack, setPendingPvpAttack] = useState<{ target: TargetPlayer; attackType: string } | null>(null);

    // =====================================================
    // LOAD DATA
    // =====================================================

    useEffect(() => {
        if (player?.id) {
            loadPveTargets();
            loadPvpTargets();
            loadPvpAttackTypes();
        }
    }, [player?.id]);

    const loadPveTargets = async () => {
        if (!player?.id) return;
        setIsLoadingPve(true);
        try {
            const { data, error } = await supabase.rpc('get_pve_targets', { viewer_id: player.id });
            if (error) throw error;
            setPveTargets(data || []);
        } catch (error) {
            console.error('Error loading PvE targets:', error);
        } finally {
            setIsLoadingPve(false);
        }
    };

    const loadPvpTargets = async () => {
        if (!player?.id) return;
        setIsLoadingPvp(true);
        try {
            const { data, error } = await supabase
                .from('players')
                .select('id, username, cash, defense, attack')
                .neq('id', player.id)
                .gt('cash', 1000)
                .limit(5);
            if (error) throw error;
            setPvpTargets(data || []);
        } catch (error) {
            console.error('Error loading PvP targets:', error);
        } finally {
            setIsLoadingPvp(false);
        }
    };

    const loadPvpAttackTypes = async () => {
        try {
            const { data, error } = await supabase.rpc('get_pvp_attack_types');
            if (error) throw error;
            setPvpAttackTypes(data || []);
        } catch (error) {
            console.error('Error loading attack types:', error);
        }
    };

    // =====================================================
    // PVE ATTACK
    // =====================================================

    const handlePveAttack = async (target: PveTarget) => {
        if (!player) return;

        if (player.stamina < target.stamina_cost) {
            toast({ title: 'Not Enough Stamina', description: `Need ${target.stamina_cost} stamina`, variant: 'destructive' });
            return;
        }

        setProcessingId(target.id);
        try {
            const { data, error } = await supabase.rpc('attack_pve', {
                attacker_id: player.id,
                target_id_input: target.id
            });

            if (error) throw error;

            if (data?.success) {
                if (data.result === 'victory') {
                    haptic.success();
                    if (data.cash_earned) rewardCash(data.cash_earned);
                    setCombatResult({
                        open: true, result: 'victory', targetName: data.target_name,
                        cashGained: data.cash_earned || 0, cashLost: 0,
                        respectGained: data.respect_earned || 0, respectLost: 0
                    });
                } else {
                    haptic.error();
                    setCombatResult({
                        open: true, result: 'defeat', targetName: data.target_name,
                        cashGained: 0, cashLost: 0, respectGained: 0, respectLost: 0
                    });
                }
                await refetchPlayer();
                await loadPveTargets();
            } else {
                toast({ title: 'Attack Failed', description: data?.message, variant: 'destructive' });
            }
        } catch (error) {
            console.error('PvE attack error:', error);
            toast({ title: 'Error', description: 'Attack failed', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    // =====================================================
    // PVP ATTACK
    // =====================================================

    const handlePvpAttackClick = (target: TargetPlayer, attackType: string) => {
        const type = pvpAttackTypes.find(t => t.id === attackType);
        if (!type) return;

        if ((player?.stamina ?? 0) < type.stamina_cost) {
            toast({ title: 'Not Enough Stamina', description: `Need ${type.stamina_cost} stamina`, variant: 'destructive' });
            return;
        }
        setPendingPvpAttack({ target, attackType });
        setConfirmOpen(true);
    };

    const executePvpAttack = async () => {
        if (!pendingPvpAttack || !player) return;

        setConfirmOpen(false);
        setProcessingId(pendingPvpAttack.target.id);

        try {
            const { data, error } = await supabase.rpc('perform_pvp_attack', {
                attacker_id_input: player.id,
                defender_id_input: pendingPvpAttack.target.id,
                attack_type_input: pendingPvpAttack.attackType
            });

            if (error) throw error;

            if (data?.success) {
                if (data.result === 'victory') {
                    haptic.success();
                    if (data.cash_stolen) rewardCash(data.cash_stolen);
                    setCombatResult({
                        open: true, result: 'victory', targetName: data.defender_name,
                        cashGained: data.cash_stolen || 0, cashLost: 0,
                        respectGained: data.respect_stolen || 0, respectLost: 0
                    });
                } else {
                    haptic.error();
                    setCombatResult({
                        open: true, result: 'defeat', targetName: data.defender_name,
                        cashGained: 0, cashLost: 0,
                        respectGained: 0, respectLost: data.attacker_respect_loss || 0
                    });
                }
                await refetchPlayer();
                await loadPvpTargets();
            } else {
                toast({ title: 'Attack Failed', description: data?.message, variant: 'destructive' });
            }
        } catch (error) {
            console.error('PvP attack error:', error);
            toast({ title: 'Error', description: 'Attack failed', variant: 'destructive' });
        } finally {
            setProcessingId(null);
            setPendingPvpAttack(null);
        }
    };

    // =====================================================
    // JOB EXECUTION
    // =====================================================

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
                        ? `You reached Level ${result.new_level}!`
                        : `Earned $${result.cash_earned?.toLocaleString()} & ${result.xp_earned} XP`,
                });
                await refetchPlayer();
            } else {
                haptic.error();
                toast({ title: 'Job Failed', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            console.error('Job error:', error);
            toast({ title: 'Error', description: 'Job failed', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    // =====================================================
    // RENDER
    // =====================================================

    if (isAuthLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    const attackType = pendingPvpAttack ? pvpAttackTypes.find(t => t.id === pendingPvpAttack.attackType) : null;

    return (
        <MainLayout>
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
                        <p className="text-xs text-muted-foreground">Attack, execute jobs, earn rewards</p>
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
                    <TabsList className="grid w-full grid-cols-3 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="pve" className="font-cinzel text-xs flex items-center gap-1">
                            <Skull className="w-3 h-3" />
                            Heists
                        </TabsTrigger>
                        <TabsTrigger value="pvp" className="font-cinzel text-xs flex items-center gap-1">
                            <Swords className="w-3 h-3" />
                            PvP
                        </TabsTrigger>
                        <TabsTrigger value="jobs" className="font-cinzel text-xs flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Jobs
                        </TabsTrigger>
                    </TabsList>

                    {/* PvE Tab */}
                    <TabsContent value="pve" className="space-y-3 mt-0">
                        {isLoadingPve ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : pveTargets.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No heist targets available</p>
                        ) : (
                            pveTargets.map((target, idx) => (
                                <PveTargetCard
                                    key={target.id}
                                    target={target}
                                    isProcessing={processingId === target.id}
                                    delay={0.05 * idx}
                                    onAttack={() => handlePveAttack(target)}
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* PvP Tab */}
                    <TabsContent value="pvp" className="space-y-3 mt-0">
                        <div className="noir-card p-3 mb-3 flex items-center gap-2 text-xs text-yellow-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span>PvP attacks risk losing items, crew, and respect on defeat!</span>
                        </div>

                        {isLoadingPvp ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : pvpTargets.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No targets available</p>
                                <Button variant="outline" className="mt-4" onClick={loadPvpTargets}>
                                    Refresh Targets
                                </Button>
                            </div>
                        ) : (
                            pvpTargets.map((target, idx) => (
                                <TargetCard
                                    key={target.id}
                                    target={target}
                                    attackTypes={pvpAttackTypes}
                                    isProcessing={processingId === target.id}
                                    delay={0.05 * idx}
                                    onAttack={(attackType) => handlePvpAttackClick(target, attackType)}
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* Jobs Tab */}
                    <TabsContent value="jobs" className="space-y-3 mt-0">
                        {isLoadingDefinitions ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : jobDefinitions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No jobs available</p>
                        ) : (
                            jobDefinitions.map((job, idx) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    isProcessing={processingId === job.id}
                                    delay={0.05 * idx}
                                    onExecute={() => handleJobExecute(job)}
                                />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* PvP Confirm Dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground">
                            {attackType?.name || 'Attack'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Attack {pendingPvpAttack?.target.username}?
                            <br /><br />
                            <span className="text-yellow-400">⚠️ Risk: You may lose items, crew, or respect if you lose!</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executePvpAttack} className="bg-destructive hover:bg-destructive/80">
                            Attack!
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
