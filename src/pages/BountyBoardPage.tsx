import { motion } from 'framer-motion';
import { Target, Clock, User, Plus, Trophy, Skull } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';

interface BountyProps {
    targetName: string;
    bountyAmount: number;
    placedBy: string;
    timeRemaining: string;
    difficulty: 'easy' | 'medium' | 'hard';
    delay?: number;
    onClaim: () => void;
}

const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    hard: 'text-red-400 bg-red-500/20',
};

const BountyCard = ({ targetName, bountyAmount, placedBy, timeRemaining, difficulty, delay = 0, onClaim }: BountyProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <Skull className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{targetName}</h3>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-sm ${difficultyColors[difficulty]}`}>
                        {difficulty.toUpperCase()}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {placedBy}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeRemaining}
                    </span>
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="font-cinzel font-bold text-lg text-primary flex items-center gap-1">
                    <GameIcon type="cash" className="w-5 h-5" />
                    {bountyAmount.toLocaleString()}
                </p>
                <Button size="sm" className="btn-gold text-[10px] mt-1" onClick={onClaim}>
                    Hunt
                </Button>
            </div>
        </div>
    </motion.div>
);

interface MyBountyProps {
    targetName: string;
    bountyAmount: number;
    timeRemaining: string;
    status: 'active' | 'completed' | 'expired';
    delay?: number;
    onCancel: () => void;
}

const MyBounty = ({ targetName, bountyAmount, timeRemaining, status, delay = 0, onCancel }: MyBountyProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className={`noir-card p-4 ${status === 'completed' ? 'border-l-2 border-green-500' : status === 'expired' ? 'opacity-50' : ''}`}
    >
        <div className="flex items-center justify-between">
            <div>
                <h3 className="font-cinzel font-semibold text-sm text-foreground">{targetName}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-primary font-bold">${bountyAmount.toLocaleString()}</span>
                    <span className="text-muted-foreground">• {timeRemaining}</span>
                </div>
            </div>
            {status === 'active' && (
                <Button variant="outline" size="sm" className="text-xs" onClick={onCancel}>
                    Cancel
                </Button>
            )}
            {status === 'completed' && (
                <span className="text-green-400 text-xs font-bold">CLAIMED</span>
            )}
            {status === 'expired' && (
                <span className="text-muted-foreground text-xs">EXPIRED</span>
            )}
        </div>
    </motion.div>
);

const BountyBoardPage = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('available');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'hunt' | 'place' | 'cancel'; target?: string; amount?: number } | null>(null);
    const [newBountyTarget, setNewBountyTarget] = useState('');
    const [newBountyAmount, setNewBountyAmount] = useState('');

    const availableBounties = [
        { targetName: 'Joey "The Rat" Moretti', bountyAmount: 50000, placedBy: 'Anonymous', timeRemaining: '23h 45m', difficulty: 'medium' as const },
        { targetName: 'Vinnie Gambino', bountyAmount: 100000, placedBy: 'Don Corleone', timeRemaining: '12h 30m', difficulty: 'hard' as const },
        { targetName: 'Tommy Two-Face', bountyAmount: 15000, placedBy: 'Sal Tessio', timeRemaining: '48h 0m', difficulty: 'easy' as const },
        { targetName: 'Big Al Capone Jr.', bountyAmount: 250000, placedBy: 'Anonymous', timeRemaining: '6h 15m', difficulty: 'hard' as const },
    ];

    const myBounties = [
        { targetName: 'Frankie Knuckles', bountyAmount: 25000, timeRemaining: '18h left', status: 'active' as const },
        { targetName: 'Mikey Palmieri', bountyAmount: 10000, timeRemaining: 'Completed 2h ago', status: 'completed' as const },
    ];

    const handleHunt = (target: string) => {
        setPendingAction({ type: 'hunt', target });
        setConfirmOpen(true);
    };

    const handlePlaceBounty = () => {
        const amount = parseInt(newBountyAmount);
        if (newBountyTarget && amount > 0) {
            setPendingAction({ type: 'place', target: newBountyTarget, amount });
            setConfirmOpen(true);
        }
    };

    const handleCancel = (target: string, amount: number) => {
        setPendingAction({ type: 'cancel', target, amount });
        setConfirmOpen(true);
    };

    const confirmAction = () => {
        if (pendingAction?.type === 'hunt') {
            toast({
                title: 'Hunt Started!',
                description: `You are now hunting ${pendingAction.target}. Find and eliminate them!`,
            });
        } else if (pendingAction?.type === 'place') {
            toast({
                title: 'Bounty Placed!',
                description: `$${pendingAction.amount?.toLocaleString()} bounty on ${pendingAction.target}`,
            });
            setNewBountyTarget('');
            setNewBountyAmount('');
        } else if (pendingAction?.type === 'cancel') {
            toast({
                title: 'Bounty Cancelled',
                description: `Refunded $${pendingAction.amount?.toLocaleString()} (minus 10% fee)`,
            });
        }
        setConfirmOpen(false);
        setPendingAction(null);
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
                        <Target className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Bounty Board</h1>
                        <p className="text-xs text-muted-foreground">Hunt targets or place bounties</p>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="available" className="font-cinzel text-[10px]">
                            Available
                        </TabsTrigger>
                        <TabsTrigger value="mine" className="font-cinzel text-[10px]">
                            My Bounties
                        </TabsTrigger>
                        <TabsTrigger value="place" className="font-cinzel text-[10px]">
                            Place New
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="available" className="space-y-2 mt-0">
                        {availableBounties.map((bounty, index) => (
                            <BountyCard
                                key={bounty.targetName}
                                {...bounty}
                                delay={0.1 * index}
                                onClaim={() => handleHunt(bounty.targetName)}
                            />
                        ))}
                    </TabsContent>

                    <TabsContent value="mine" className="space-y-2 mt-0">
                        {myBounties.length > 0 ? (
                            myBounties.map((bounty, index) => (
                                <MyBounty
                                    key={bounty.targetName}
                                    {...bounty}
                                    delay={0.1 * index}
                                    onCancel={() => handleCancel(bounty.targetName, bounty.bountyAmount)}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                                <p className="text-sm text-muted-foreground">No bounties placed</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="place" className="mt-0">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="noir-card p-4"
                        >
                            <h3 className="font-cinzel font-semibold text-sm text-foreground mb-4">Place a Bounty</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Target Name</label>
                                    <Input
                                        placeholder="Enter player name..."
                                        value={newBountyTarget}
                                        onChange={(e) => setNewBountyTarget(e.target.value)}
                                        className="bg-muted/30 border-border/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Bounty Amount</label>
                                    <Input
                                        type="number"
                                        placeholder="Minimum $10,000"
                                        value={newBountyAmount}
                                        onChange={(e) => setNewBountyAmount(e.target.value)}
                                        className="bg-muted/30 border-border/50"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    10% fee applies. Bounty expires after 48 hours if unclaimed.
                                </p>
                                <Button
                                    className="w-full btn-gold"
                                    onClick={handlePlaceBounty}
                                    disabled={!newBountyTarget || !newBountyAmount}
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Place Bounty
                                </Button>
                            </div>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={
                    pendingAction?.type === 'hunt' ? 'Accept Bounty?' :
                        pendingAction?.type === 'place' ? 'Place Bounty?' :
                            'Cancel Bounty?'
                }
                description={
                    pendingAction?.type === 'hunt' ? `Hunt ${pendingAction.target}? You have 24h to eliminate them.` :
                        pendingAction?.type === 'place' ? `Place $${pendingAction.amount?.toLocaleString()} bounty on ${pendingAction.target}?` :
                            `Cancel bounty on ${pendingAction?.target}? You'll receive 90% refund.`
                }
                onConfirm={confirmAction}
                confirmText={pendingAction?.type === 'hunt' ? 'Accept' : pendingAction?.type === 'place' ? 'Place' : 'Cancel'}
                variant={pendingAction?.type === 'cancel' ? 'destructive' : 'default'}
            />
        </MainLayout>
    );
};

export default BountyBoardPage;
