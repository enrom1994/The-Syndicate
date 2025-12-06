import { motion } from 'framer-motion';
import { Swords, Target, Clock, Zap } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CombatResultModal } from '@/components/CombatResultModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';

interface TargetCardProps {
    name: string;
    family: string;
    netWorth: string;
    defense: number;
    risk: 'Low' | 'Medium' | 'High';
    delay?: number;
    onAttack: () => void;
}

const TargetCard = ({ name, family, netWorth, defense, risk, delay = 0, onAttack }: TargetCardProps) => {
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
                    <p className="text-xs text-muted-foreground">{family}</p>
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
                        <Progress value={defense} className="h-1.5 flex-1" />
                        <span className="text-xs text-foreground">{defense}%</span>
                    </div>
                </div>
            </div>

            <Button className="w-full btn-gold text-xs" onClick={onAttack}>
                <Swords className="w-4 h-4 mr-2" />
                Attack
            </Button>
        </motion.div>
    );
};

interface JobCardProps {
    name: string;
    description: string;
    reward: string;
    energy: number;
    cooldown: string;
    delay?: number;
    onExecute: () => void;
}

const JobCard = ({ name, description, reward, energy, cooldown, delay = 0, onExecute }: JobCardProps) => (
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
                {reward}
            </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-yellow-500" />
                -{energy} Energy
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {cooldown}
            </div>
        </div>

        <Button className="w-full mt-3 btn-gold text-xs" onClick={onExecute}>
            Execute Job
        </Button>
    </motion.div>
);

const OpsPage = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('attack');

    // Combat modal state
    const [combatResult, setCombatResult] = useState<{
        open: boolean;
        result: 'victory' | 'defeat';
        targetName: string;
        cashGained: number;
        cashLost: number;
        respectGained: number;
        respectLost: number;
    }>({ open: false, result: 'victory', targetName: '', cashGained: 0, cashLost: 0, respectGained: 0, respectLost: 0 });

    // Confirm dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAttack, setPendingAttack] = useState<{ name: string; defense: number } | null>(null);

    const targets = [
        { name: 'Jimmy "Two-Face"', family: 'The Gambino Family', netWorth: '$8.2M', defense: 45, risk: 'Low' as const },
        { name: 'Sal Maroni', family: 'The Maroni Syndicate', netWorth: '$15.7M', defense: 72, risk: 'Medium' as const },
        { name: 'Don Falcone', family: 'The Falcone Empire', netWorth: '$42.3M', defense: 95, risk: 'High' as const },
    ];

    const jobs = [
        { name: 'Collect Protection', description: 'Shake down local businesses for payments', reward: '$5,000', energy: 10, cooldown: '30m' },
        { name: 'Rob the Bank', description: 'High-risk heist on First National', reward: '$50,000', energy: 50, cooldown: '4h' },
        { name: 'Smuggle Goods', description: 'Transport contraband across the docks', reward: '$15,000', energy: 25, cooldown: '1h' },
        { name: 'Hit Contract', description: 'Eliminate a rival for a paying client', reward: '$25,000', energy: 35, cooldown: '2h' },
    ];

    const handleAttackClick = (target: { name: string; defense: number }) => {
        setPendingAttack(target);
        setConfirmOpen(true);
    };

    const executeAttack = () => {
        if (!pendingAttack) return;

        setConfirmOpen(false);

        // Simulate combat - lower defense = higher win chance
        const winChance = 100 - pendingAttack.defense;
        const isVictory = Math.random() * 100 < winChance;

        setTimeout(() => {
            setCombatResult({
                open: true,
                result: isVictory ? 'victory' : 'defeat',
                targetName: pendingAttack.name,
                cashGained: isVictory ? Math.floor(Math.random() * 50000) + 10000 : 0,
                cashLost: !isVictory ? Math.floor(Math.random() * 20000) + 5000 : 0,
                respectGained: isVictory ? Math.floor(Math.random() * 100) + 25 : 0,
                respectLost: !isVictory ? Math.floor(Math.random() * 50) + 10 : 0,
            });
        }, 500);

        setPendingAttack(null);
    };

    const handleJobExecute = (jobName: string, reward: string) => {
        toast({
            title: 'Job Completed!',
            description: `${jobName} - Earned ${reward}`,
        });
    };

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
                        <p className="text-xs text-muted-foreground">Attacks</p>
                        <p className="font-cinzel font-bold text-lg text-foreground">24</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                        <p className="font-cinzel font-bold text-lg text-primary">78%</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Energy</p>
                        <p className="font-cinzel font-bold text-lg text-foreground">85/100</p>
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
                        {targets.map((target, index) => (
                            <TargetCard
                                key={target.name}
                                {...target}
                                delay={0.1 * index}
                                onAttack={() => handleAttackClick({ name: target.name, defense: target.defense })}
                            />
                        ))}
                    </TabsContent>

                    <TabsContent value="jobs" className="space-y-3 mt-0">
                        {jobs.map((job, index) => (
                            <JobCard
                                key={job.name}
                                {...job}
                                delay={0.1 * index}
                                onExecute={() => handleJobExecute(job.name, job.reward)}
                            />
                        ))}
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Confirm Attack"
                description={`Are you sure you want to attack ${pendingAttack?.name}? This will cost 20 energy.`}
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

