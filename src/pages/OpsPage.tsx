import { motion } from 'framer-motion';
import { Swords, Target, Clock, Loader2, Skull, Users, Shield, AlertTriangle, Flame, Diamond, Star, Timer, TrendingUp } from 'lucide-react';
import { RankBadge, RankName, RANK_THRESHOLDS } from '@/components/RankBadge';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, JobDefinition } from '@/hooks/useGameStore';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardRespect } from '@/components/RewardAnimation';
import { formatCooldownTime } from '@/lib/formatters';
import { useTutorial } from '@/components/tutorial';

// Import extracted components
import {
    PveTargetCard,
    TargetCard,
    JobCard,
    HighStakesCard,
    TargetPlayer,
    PveTarget,
    PvpAttackType,
    RevengeTarget,
    HighStakesJob,
} from '@/components/ops';

// =====================================================
// MAIN PAGE
// =====================================================

const OpsPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const {
        jobDefinitions,
        isLoadingDefinitions,
        completeJob,
        getJobChainStatus,
        continueJobChain,
        rushPveCooldown,
        getHighStakesJobs,
        executeHighStakesJob,
        loadCrew,
        loadInventory
    } = useGameStore();

    const { markStepComplete } = useTutorial();

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
        xpGained?: number;
        itemsStolen?: string[];
        crewLost?: number;
        insuranceActivated?: boolean;
        opponentHasMadeMan?: boolean;
    }>({ open: false, result: 'victory', targetName: '', cashGained: 0, cashLost: 0, respectGained: 0, respectLost: 0 });

    // PvP confirm dialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPvpAttack, setPendingPvpAttack] = useState<{ target: TargetPlayer; attackType: string } | null>(null);

    // Job Chain state
    const [chainStatus, setChainStatus] = useState<{
        streak: number;
        active: boolean;
        chain_broken: boolean;
        can_continue: boolean;
        seconds_to_continue: number;
        bonus_percent: number;
    } | null>(null);
    const [showChainContinue, setShowChainContinue] = useState(false);
    const [continueCountdown, setContinueCountdown] = useState(0);

    // High Stakes state
    const [highStakesJobs, setHighStakesJobs] = useState<HighStakesJob[]>([]);
    const [isLoadingHighStakes, setIsLoadingHighStakes] = useState(false);
    const [confirmHighStakes, setConfirmHighStakes] = useState<HighStakesJob | null>(null);

    // Revenge state
    const [revengeTargets, setRevengeTargets] = useState<RevengeTarget[]>([]);
    const [isLoadingRevenge, setIsLoadingRevenge] = useState(false);
    const [pendingRevenge, setPendingRevenge] = useState<{ target: RevengeTarget; attackType: string } | null>(null);
    const [revengeConfirmOpen, setRevengeConfirmOpen] = useState(false);

    // Active boosters state
    const [activeBoosters, setActiveBoosters] = useState<{
        attack: { minutesRemaining: number } | null;
        shield: { minutesRemaining: number } | null;
        vip: { minutesRemaining: number } | null;
    }>({ attack: null, shield: null, vip: null });

    // Fetch active boosters
    useEffect(() => {
        const fetchBoosters = async () => {
            if (!player?.id) return;
            try {
                const { data, error } = await supabase.rpc('get_active_boosters', {
                    player_id_input: player.id
                });
                if (!error && data) {
                    const attackBoost = data.find((b: any) => b.booster_type === '2x_attack');
                    const shieldBoost = data.find((b: any) => b.booster_type === 'shield');
                    const vipBoost = data.find((b: any) => b.booster_type === 'vip_pass');
                    setActiveBoosters({
                        attack: attackBoost ? { minutesRemaining: attackBoost.time_remaining_minutes } : null,
                        shield: shieldBoost ? { minutesRemaining: shieldBoost.time_remaining_minutes } : null,
                        vip: vipBoost ? { minutesRemaining: vipBoost.time_remaining_minutes } : null,
                    });
                }
            } catch (err) {
                console.error('Error fetching boosters:', err);
            }
        };
        fetchBoosters();
        const interval = setInterval(fetchBoosters, 60000);
        return () => clearInterval(interval);
    }, [player?.id]);

    // =====================================================
    // LOAD DATA
    // =====================================================

    useEffect(() => {
        if (player?.id) {
            loadPveTargets();
            loadPvpTargets();
            loadPvpAttackTypes();
            loadJobChainStatus();
            loadHighStakesJobs();
            loadRevengeTargets();
        }
    }, [player?.id]);

    // Countdown timer for chain continue
    useEffect(() => {
        if (continueCountdown > 0) {
            const timer = setTimeout(() => setContinueCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else if (showChainContinue && continueCountdown <= 0) {
            setShowChainContinue(false);
            loadJobChainStatus(); // Refresh status after expiry
        }
    }, [continueCountdown, showChainContinue]);

    const loadJobChainStatus = async () => {
        const status = await getJobChainStatus();
        if (status) {
            setChainStatus(status);
        }
    };

    const loadHighStakesJobs = async () => {
        setIsLoadingHighStakes(true);
        try {
            const jobs = await getHighStakesJobs();
            setHighStakesJobs(jobs);
        } finally {
            setIsLoadingHighStakes(false);
        }
    };

    const loadRevengeTargets = async () => {
        if (!player?.id) return;
        setIsLoadingRevenge(true);
        try {
            const { data, error } = await supabase.rpc('get_revenge_targets', {
                player_id_input: player.id
            });
            if (!error && data) {
                setRevengeTargets(data);
            }
        } catch (err) {
            console.error('Failed to load revenge targets:', err);
        } finally {
            setIsLoadingRevenge(false);
        }
    };

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
            const { data, error } = await supabase.rpc('get_pvp_targets', {
                player_id_input: player.id,
                target_limit: 5
            } as any);
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
                attacker_id_input: player.id,
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
                        open: true,
                        result: 'victory',
                        targetName: data.defender_name,
                        cashGained: data.cash_stolen || 0,
                        cashLost: 0,
                        // Use new explicit fields, fallback to legacy
                        respectGained: data.respect_gained ?? (data.respect_stolen || 0),
                        respectLost: data.respect_lost ?? 0,
                        xpGained: 0,
                        itemsStolen: data.contraband_stolen > 0 ? [`${data.contraband_stolen} Contraband`] : [],
                        crewLost: 0,
                        insuranceActivated: data.insurance_applied || false,
                        opponentHasMadeMan: pendingPvpAttack?.target?.has_made_man || false
                    });
                } else {
                    haptic.error();
                    setCombatResult({
                        open: true,
                        result: 'defeat',
                        targetName: data.defender_name,
                        cashGained: 0,
                        cashLost: 0,
                        // Use new explicit fields, fallback to legacy
                        respectGained: data.respect_gained ?? 0,
                        respectLost: data.respect_lost ?? (data.attacker_respect_loss || 0),
                        xpGained: 0,
                        itemsStolen: [],
                        crewLost: data.attacker_crew_loss || 0,
                        opponentHasMadeMan: pendingPvpAttack?.target?.has_made_man || false
                    });
                }
                await refetchPlayer();
                await loadCrew();
                await loadInventory();
                await loadPvpTargets();
                await loadRevengeTargets(); // Sync cooldowns across tabs
            } else {
                // Handle specific error types
                let errorTitle = 'Attack Failed';
                let errorDescription = data?.message || 'Unknown error';

                if (data?.error_code === 'PVP_COOLDOWN_ACTIVE') {
                    errorTitle = '⏳ On Cooldown';
                    errorDescription = `Wait ${Math.ceil((data.cooldown_seconds || 0) / 60)}m before attacking again`;
                } else if (data?.message?.includes('Protection')) {
                    errorTitle = '🛡️ Protected';
                } else if (data?.message?.includes('Shield')) {
                    errorTitle = '🛡️ Shielded';
                } else if (data?.message?.includes('New Player Protection')) {
                    errorTitle = '👶 New Player Protected';
                }

                toast({ title: errorTitle, description: errorDescription, variant: 'destructive' });

                // Refresh both target lists to update cooldown UI
                await loadPvpTargets();
                await loadRevengeTargets();
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
    // REVENGE EXECUTION
    // =====================================================

    const executeRevenge = async () => {
        if (!pendingRevenge || !player) return;

        setRevengeConfirmOpen(false);
        setProcessingId(pendingRevenge.target.attacker_id);

        try {
            const { data, error } = await supabase.rpc('perform_pvp_attack', {
                attacker_id_input: player.id,
                defender_id_input: pendingRevenge.target.attacker_id,
                attack_type_input: pendingRevenge.attackType,
                is_revenge_input: true,
                original_attack_id_input: pendingRevenge.target.attack_log_id
            } as any);

            if (error) throw error;

            if (data?.success) {
                if (data.result === 'victory') {
                    haptic.success();
                    if (data.cash_stolen) rewardCash(data.cash_stolen);
                    setCombatResult({
                        open: true,
                        result: 'victory',
                        targetName: data.defender_name,
                        cashGained: data.cash_stolen || 0,
                        cashLost: 0,
                        respectGained: data.respect_gained ?? 0,
                        respectLost: 0,
                        xpGained: 0,
                        itemsStolen: data.contraband_stolen > 0 ? [`${data.contraband_stolen} Contraband`] : [],
                        crewLost: 0,
                        insuranceActivated: data.insurance_applied || false,
                        opponentHasMadeMan: pendingRevenge?.target?.has_made_man || false
                    });
                } else {
                    haptic.error();
                    setCombatResult({
                        open: true,
                        result: 'defeat',
                        targetName: data.defender_name,
                        cashGained: 0,
                        cashLost: 0,
                        respectGained: 0,
                        respectLost: data.respect_lost ?? 0,
                        xpGained: 0,
                        itemsStolen: [],
                        crewLost: data.attacker_crew_loss || 0,
                        opponentHasMadeMan: pendingRevenge?.target?.has_made_man || false
                    });
                }
                await refetchPlayer();
                await loadCrew();
                await loadInventory();
                await loadRevengeTargets(); // Refresh revenge list
                await loadPvpTargets(); // Also refresh PvP targets to update cooldowns
            } else {
                // Handle specific error types
                let errorTitle = 'Revenge Failed';
                let errorDescription = data?.message || 'Unknown error';

                if (data?.error_code === 'PVP_COOLDOWN_ACTIVE') {
                    errorTitle = '⏳ On Cooldown';
                    errorDescription = `Wait ${Math.ceil((data.cooldown_seconds || 0) / 60)}m before attacking again`;
                } else if (data?.message?.includes('Protection')) {
                    errorTitle = '🛡️ Protected';
                } else if (data?.message?.includes('Shield')) {
                    errorTitle = '🛡️ Shielded';
                } else if (data?.message?.includes('New Player Protection')) {
                    errorTitle = '👶 New Player Protected';
                }

                toast({ title: errorTitle, description: errorDescription, variant: 'destructive' });

                // Refresh target lists to update cooldown UI
                await loadRevengeTargets();
                await loadPvpTargets();
            }

        } catch (error) {
            console.error('Revenge attack error:', error);
            toast({ title: 'Error', description: 'Revenge attack failed', variant: 'destructive' });
        } finally {
            setProcessingId(null);
            setPendingRevenge(null);
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
                // Complete tutorial step on first job completion
                markStepComplete('job');
                await loadJobChainStatus(); // Refresh chain status

                // Show cash animation
                if (result.cash_earned) {
                    rewardCash(result.cash_earned);
                }

                // Show Respect animation (staggered)
                if (result.respect_earned) {
                    setTimeout(() => rewardRespect(result.respect_earned!), 400);
                }

                const streakMsg = result.current_streak && result.current_streak > 0
                    ? ` (🔥 Streak ${result.current_streak})`
                    : '';

                toast({
                    title: result.leveled_up ? 'LEVEL UP! 🎉' : 'Job Completed!',
                    description: result.leveled_up
                        ? `You reached Level ${result.new_level}!`
                        : `Earned $${result.cash_earned?.toLocaleString()} & ${result.respect_earned} Respect${streakMsg}`,
                });
                await refetchPlayer();
            } else {
                haptic.error();

                // Check if chain is broken - offer continue option
                if (result.chain_broken && result.can_continue_until) {
                    setShowChainContinue(true);
                    setContinueCountdown(120); // 2 minutes
                }

                toast({ title: 'Job Failed', description: result.message, variant: 'destructive' });
                await loadJobChainStatus();
            }
        } catch (error) {
            console.error('Job error:', error);
            toast({ title: 'Error', description: 'Job failed', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleContinueChain = async () => {
        setProcessingId('chain-continue');
        try {
            const result = await continueJobChain();
            if (result.success) {
                haptic.success();
                toast({ title: '🔥 Chain Continued!', description: 'Keep the streak going!' });
                setShowChainContinue(false);
                await loadJobChainStatus();
                await refetchPlayer();
            } else {
                haptic.error();
                toast({ title: 'Failed', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleHighStakesExecute = async (job: HighStakesJob) => {
        setConfirmHighStakes(job);
    };

    const executeHighStakes = async () => {
        if (!confirmHighStakes) return;
        setConfirmHighStakes(null);
        setProcessingId(confirmHighStakes.id);

        try {
            const result = await executeHighStakesJob(confirmHighStakes.id);
            if (result.success) {
                if (result.result === 'victory') {
                    haptic.success();
                    if (result.cash_earned) rewardCash(result.cash_earned);
                    if (result.xp_earned) setTimeout(() => rewardRespect(result.xp_earned!), 400);
                    toast({
                        title: '🎰 HIGH STAKES WIN!',
                        description: `Scored $${result.cash_earned?.toLocaleString()}!`
                    });
                } else {
                    haptic.error();
                    toast({
                        title: '💀 Mission Failed',
                        description: `Lost ${result.diamonds_lost}💎 entry fee`,
                        variant: 'destructive'
                    });
                }
                await refetchPlayer();
                await loadHighStakesJobs();
            } else {
                haptic.error();
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', variant: 'destructive' });
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
                    <img src="/images/icons/briefcase.png" alt="Operations" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Operations</h1>
                        <p className="text-xs text-muted-foreground">Attack, execute jobs, earn rewards</p>
                    </div>
                    {/* Active Booster Badges */}
                    <div className="ml-auto flex items-center gap-2">
                        {/* 2x Attack (or VIP) */}
                        {(activeBoosters.attack || activeBoosters.vip) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`flex items-center gap-1 px-2 py-1 ${activeBoosters.vip ? 'bg-amber-500/20 border-amber-500/40' : 'bg-red-500/20 border-red-500/40'} border rounded-full`}
                            >
                                <span className={`text-xs font-bold ${activeBoosters.vip ? 'text-amber-400' : 'text-red-400'}`}>x2</span>
                                <Swords className={`w-3 h-3 ${activeBoosters.vip ? 'text-amber-400' : 'text-red-400'}`} />
                                <Timer className={`w-2.5 h-2.5 ${activeBoosters.vip ? 'text-amber-400/70' : 'text-red-400/70'}`} />
                                <span className={`text-[10px] ${activeBoosters.vip ? 'text-amber-300' : 'text-red-300'}`}>
                                    {(() => {
                                        const mins = activeBoosters.vip?.minutesRemaining || activeBoosters.attack?.minutesRemaining || 0;
                                        return mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
                                    })()}
                                </span>
                            </motion.div>
                        )}
                        {/* Shield Booster */}
                        {(activeBoosters.shield || activeBoosters.vip) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`flex items-center gap-1 px-2 py-1 ${activeBoosters.vip ? 'bg-amber-500/20 border-amber-500/40' : 'bg-cyan-500/20 border-cyan-500/40'} border rounded-full`}
                            >
                                <Shield className={`w-3 h-3 ${activeBoosters.vip ? 'text-amber-400' : 'text-cyan-400'}`} />
                                <Timer className={`w-2.5 h-2.5 ${activeBoosters.vip ? 'text-amber-400/70' : 'text-cyan-400/70'}`} />
                                <span className={`text-[10px] ${activeBoosters.vip ? 'text-amber-300' : 'text-cyan-300'}`}>
                                    {(() => {
                                        const mins = activeBoosters.vip?.minutesRemaining || activeBoosters.shield?.minutesRemaining || 0;
                                        return mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
                                    })()}
                                </span>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-3 mb-6 grid grid-cols-3 gap-3"
                >
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Wins</p>
                        <p className="text-[10px] text-muted-foreground/60">PvP Victories</p>
                        <p className="font-cinzel font-bold text-lg text-foreground">{player?.total_attacks_won ?? 0}</p>
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
                    <TabsList className="grid w-full grid-cols-5 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="pve" className="font-cinzel text-xs flex items-center gap-1">
                            <Skull className="w-3 h-3" />
                            Heists
                        </TabsTrigger>
                        <TabsTrigger value="pvp" className="font-cinzel text-xs flex items-center gap-1">
                            <Swords className="w-3 h-3" />
                            PvP
                        </TabsTrigger>
                        <TabsTrigger value="revenge" className="font-cinzel text-xs flex items-center gap-1 relative">
                            <Flame className="w-3 h-3 text-orange-500" />
                            Revenge
                            {revengeTargets.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                                    {revengeTargets.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="jobs" className="font-cinzel text-xs flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Jobs
                        </TabsTrigger>
                        <TabsTrigger value="highstakes" className="font-cinzel text-xs flex items-center gap-1">
                            <Diamond className="w-3 h-3 text-yellow-500" />
                            Stakes
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

                    {/* Revenge Tab */}
                    <TabsContent value="revenge" className="space-y-3 mt-0">
                        <div className="noir-card p-3 mb-3 flex items-center gap-2 text-xs text-orange-400">
                            <Flame className="w-4 h-4" />
                            <span>Strike back at those who attacked you! Same rules as PvP.</span>
                        </div>

                        {isLoadingRevenge ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : revengeTargets.length === 0 ? (
                            <div className="text-center py-8">
                                <Flame className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground">No active revenge targets</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    Revenge is available for 24h after being attacked
                                </p>
                                <Button variant="outline" className="mt-4" onClick={loadRevengeTargets}>
                                    Refresh
                                </Button>
                            </div>
                        ) : (
                            revengeTargets.map((target, idx) => (
                                <motion.div
                                    key={target.attack_log_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.05 * idx }}
                                    className="noir-card overflow-hidden border-l-4 border-orange-500"
                                >
                                    {/* Target Header */}
                                    <div className="p-3 border-b border-border/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-red-800 flex items-center justify-center">
                                                    <Flame className="w-4 h-4 text-orange-200" />
                                                </div>
                                                <div>
                                                    <h3 className="font-cinzel font-semibold text-sm text-foreground leading-tight flex items-center gap-1.5">
                                                        {target.attacker_name || 'Unknown'}
                                                        {target.has_made_man && (
                                                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 border border-amber-300 shadow-lg shadow-amber-500/30" title="Made Man">
                                                                <svg className="w-2.5 h-2.5 text-amber-900" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" /></svg>
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Attacked you {Math.max(0, 24 - target.hours_remaining)}h ago
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-orange-400 font-bold">
                                                    {target.hours_remaining}h left
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status & Action */}
                                    <div className="p-3">
                                        {target.attacker_has_shield ? (
                                            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs text-blue-400">
                                                <Shield className="w-4 h-4" />
                                                <span>Target has Shield active - revenge blocked</span>
                                            </div>
                                        ) : target.attacker_has_npp ? (
                                            <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded p-2 text-xs text-cyan-400">
                                                <Shield className="w-4 h-4" />
                                                <span>Target under New Player Protection</span>
                                            </div>
                                        ) : target.on_cooldown ? (
                                            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-xs text-yellow-400">
                                                <Clock className="w-4 h-4" />
                                                <span>Lay low for {formatCooldownTime(target.cooldown_remaining || 0)}</span>
                                            </div>
                                        ) : (
                                            <Button
                                                className="w-full btn-gold text-xs"
                                                onClick={() => {
                                                    if (pvpAttackTypes.length > 0) {
                                                        setPendingRevenge({ target, attackType: pvpAttackTypes[0].id });
                                                        setRevengeConfirmOpen(true);
                                                    }
                                                }}
                                                disabled={processingId === target.attacker_id}
                                            >
                                                {processingId === target.attacker_id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Flame className="w-4 h-4 mr-2" />
                                                        Take Revenge
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>

                                </motion.div>
                            ))
                        )}
                    </TabsContent>

                    {/* Jobs Tab */}
                    <TabsContent value="jobs" className="space-y-3 mt-0">
                        {/* Streak Banner */}
                        {chainStatus && chainStatus.streak > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="noir-card p-3 border-l-4 border-orange-500 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    <div>
                                        <span className="text-sm font-bold text-orange-400">Streak: {chainStatus.streak}</span>
                                        <span className="text-xs text-muted-foreground ml-2">+{chainStatus.bonus_percent}% bonus</span>
                                    </div>
                                </div>
                                {!chainStatus.active && (
                                    <span className="text-xs text-yellow-400">Complete a job to keep streak!</span>
                                )}
                            </motion.div>
                        )}

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
                                    streakBonus={chainStatus?.bonus_percent || 0}
                                    playerRespect={player?.respect || 0}
                                    playerEnergy={player?.energy || 0}
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* High Stakes Tab */}
                    <TabsContent value="highstakes" className="space-y-3 mt-0">
                        <div className="noir-card p-3 mb-3 flex items-center gap-2 text-xs text-yellow-400">
                            <Diamond className="w-4 h-4" />
                            <span>Premium missions with 💎 entry fee. Higher risk, 3x rewards!</span>
                        </div>

                        {isLoadingHighStakes ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : highStakesJobs.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No high stakes missions available</p>
                        ) : (
                            highStakesJobs.map((job, idx) => (
                                <HighStakesCard
                                    key={job.id}
                                    job={job}
                                    isProcessing={processingId === job.id}
                                    delay={0.05 * idx}
                                    onExecute={() => handleHighStakesExecute(job)}
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
                xpGained={combatResult.xpGained}
                itemsStolen={combatResult.itemsStolen}
                crewLost={combatResult.crewLost}
                insuranceActivated={combatResult.insuranceActivated}
            />

            {/* Job Chain Continue Dialog */}
            <AlertDialog open={showChainContinue} onOpenChange={setShowChainContinue}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" />
                            Chain Broken!
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Your {chainStatus?.streak || 0}-streak is about to end!
                            <br /><br />
                            <span className="text-cyan-400">Pay 15💎 to continue your streak?</span>
                            <br />
                            <span className="text-yellow-400 text-xs">Time remaining: {continueCountdown}s</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Let it End</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleContinueChain}
                            className="bg-gradient-to-r from-orange-600 to-red-600"
                            disabled={processingId === 'chain-continue'}
                        >
                            {processingId === 'chain-continue' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>Continue (15💎)</>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* High Stakes Confirm Dialog */}
            <AlertDialog open={!!confirmHighStakes} onOpenChange={() => setConfirmHighStakes(null)}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500" />
                            {confirmHighStakes?.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            <div className="space-y-2">
                                <p><strong>Entry Fee:</strong> <span className="text-cyan-400">{confirmHighStakes?.entry_cost_diamonds}💎</span></p>
                                <p><strong>Reward:</strong> <span className="text-green-400">${confirmHighStakes?.cash_reward.toLocaleString()}</span></p>
                                <p><strong>Success Rate:</strong> <span className="text-red-400">{confirmHighStakes?.success_rate}%</span></p>
                                <p className="text-yellow-400 text-xs mt-2">⚠️ If you fail, you lose the entry fee!</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeHighStakes}
                            className="bg-gradient-to-r from-yellow-600 to-orange-600"
                        >
                            Enter ({confirmHighStakes?.entry_cost_diamonds}💎)
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Revenge Confirm Dialog */}
            <AlertDialog open={revengeConfirmOpen} onOpenChange={setRevengeConfirmOpen}>
                <AlertDialogContent className="noir-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-orange-400 flex items-center gap-2">
                            <Flame className="w-5 h-5" />
                            Confirm Revenge
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Strike back at <span className="font-bold text-foreground">{pendingRevenge?.target.attacker_name}</span>!
                            <br /><br />
                            <span className="text-xs text-muted-foreground">
                                Same rules as normal PvP apply. Cash fee will be deducted.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeRevenge}
                            className="bg-gradient-to-r from-orange-600 to-red-600"
                        >
                            <Flame className="w-4 h-4 mr-2" />
                            Take Revenge
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default OpsPage;
