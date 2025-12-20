import { motion } from 'framer-motion';
import { Users, Shield, Sword, DollarSign, Star, Plus, Loader2, Minus } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useGameStore, CrewDefinition, HiredCrew } from '@/hooks/useGameStore';
import { useTutorial } from '@/components/tutorial';

interface CrewMemberCardProps {
    id: string;
    name: string;
    type: string;
    description: string;
    attackBonus: number;
    defenseBonus: number;
    cost: number;
    upkeep: number;
    available: number;
    owned: number;
    isProcessing?: boolean;
    delay?: number;
    onHire: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
    Enforcer: <Sword className="w-5 h-5" />,
    Bodyguard: <Shield className="w-5 h-5" />,
    Hitman: <Sword className="w-5 h-5" />,
    Driver: <Users className="w-5 h-5" />,
    Accountant: <DollarSign className="w-5 h-5" />,
};

const typeColors: Record<string, string> = {
    Enforcer: 'text-red-400',
    Bodyguard: 'text-blue-400',
    Hitman: 'text-purple-400',
    Driver: 'text-green-400',
    Accountant: 'text-yellow-400',
};

const CrewMemberCard = ({
    id,
    name,
    type,
    description,
    attackBonus,
    defenseBonus,
    cost,
    upkeep,
    available,
    owned,
    isProcessing = false,
    delay = 0,
    onHire
}: CrewMemberCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                <span className="text-primary-foreground">{typeIcons[type] || <Users className="w-5 h-5" />}</span>
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
                    <div className="flex items-center gap-2">
                        {owned > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-sm">
                                Owned: x{owned}
                            </span>
                        )}
                        <span className={`text-xs font-medium ${typeColors[type] || 'text-muted-foreground'}`}>{type}</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3 text-center">
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">ATK</p>
                <p className="font-cinzel font-bold text-sm text-red-400">+{attackBonus}</p>
            </div>
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">DEF</p>
                <p className="font-cinzel font-bold text-sm text-blue-400">+{defenseBonus}</p>
            </div>
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">Cost</p>
                <p className="font-cinzel font-bold text-sm text-primary">${cost.toLocaleString()}</p>
            </div>
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">Upkeep</p>
                <p className="font-cinzel font-bold text-sm text-muted-foreground">${upkeep}/hr</p>
            </div>
        </div>

        <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
                <Star className="w-3 h-3 inline mr-1" />
                {available} available
            </span>
            <Button
                className="btn-gold text-xs"
                onClick={onHire}
                disabled={available === 0 || isProcessing}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <Plus className="w-4 h-4 mr-1" />
                        Hire
                    </>
                )}
            </Button>
        </div>
    </motion.div>
);

const HirePage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const {
        crewDefinitions,
        crew: hiredCrew,
        isLoadingDefinitions,
        hireCrew
    } = useGameStore();

    const { markStepComplete } = useTutorial();

    const [activeTab, setActiveTab] = useState('all');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingHire, setPendingHire] = useState<{ id: string; name: string; cost: number; max: number } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Map owned crew to their IDs for quick lookup
    const ownedCrewMap = new Map<string, HiredCrew>(
        hiredCrew.map(c => [c.crew_id, c])
    );

    // Combine definitions with owned count
    const allCrew = crewDefinitions.map(def => {
        const owned = ownedCrewMap.get(def.id);
        return {
            ...def,
            owned: owned?.quantity || 0,
        };
    });

    const filteredCrew = activeTab === 'all'
        ? allCrew
        : allCrew.filter(c => c.type.toLowerCase() === activeTab);

    const handleHireClick = (id: string, name: string, cost: number, available: number) => {
        setPendingHire({ id, name, cost, max: available });
        setQuantity(1);
        setConfirmOpen(true);
    };

    const incrementQuantity = () => setQuantity(q => Math.min(q + 1, pendingHire?.max || 99));
    const decrementQuantity = () => setQuantity(q => Math.max(q - 1, 1));
    const setQuickQuantity = (amount: number) => setQuantity(Math.min(amount, pendingHire?.max || 99));
    const totalCost = pendingHire ? pendingHire.cost * quantity : 0;

    const confirmHire = async () => {
        if (!pendingHire) return;

        setIsProcessing(true);
        setConfirmOpen(false);

        try {
            const result = await hireCrew(pendingHire.id, quantity);
            if (result.success) {
                // Complete tutorial step on first crew hire
                markStepComplete('crew');
                toast({
                    title: 'Crew Hired!',
                    description: result.message || `${quantity}x ${pendingHire.name} joined your crew.`,
                });
                await refetchPlayer();
            } else {
                toast({
                    title: 'Hire Failed',
                    description: result.message || 'Unable to hire crew.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Hire error:', error);
            toast({
                title: 'Error',
                description: 'Failed to hire crew member. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
            setPendingHire(null);
        }
    };

    // Calculate totals from owned crew
    const totalAttack = hiredCrew.reduce((sum, c) => sum + (c.attack_bonus * c.quantity), 0);
    const totalDefense = hiredCrew.reduce((sum, c) => sum + (c.defense_bonus * c.quantity), 0);
    const totalUpkeep = hiredCrew.reduce((sum, c) => sum + (c.upkeep_per_hour * c.quantity), 0);

    // Loading state
    if (isAuthLoading || isLoadingDefinitions) {
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
                style={{ backgroundImage: 'url(/images/backgrounds/hire.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <img
                        src="/images/icons/hire.png"
                        alt="Hire Crew"
                        className="w-12 h-12 object-contain"
                    />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Hire Crew</h1>
                        <p className="text-xs text-muted-foreground">Recruit members to grow your strength</p>
                    </div>
                </motion.div>

                {/* Stats Summary */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-4 mb-6"
                >
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground">Total Attack</p>
                            <p className="font-cinzel font-bold text-lg text-red-400">+{totalAttack}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Defense</p>
                            <p className="font-cinzel font-bold text-lg text-blue-400">+{totalDefense}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Upkeep/hr</p>
                            <p className="font-cinzel font-bold text-lg text-primary">${totalUpkeep.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="all" className="font-cinzel text-[10px]">
                            All
                        </TabsTrigger>
                        <TabsTrigger value="enforcer" className="font-cinzel text-[10px]">
                            Enforcers
                        </TabsTrigger>
                        <TabsTrigger value="bodyguard" className="font-cinzel text-[10px]">
                            Guards
                        </TabsTrigger>
                        <TabsTrigger value="hitman" className="font-cinzel text-[10px]">
                            Hitmen
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-3 mt-0">
                        {filteredCrew.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-8">No crew available</p>
                        ) : (
                            filteredCrew.map((member, index) => (
                                <CrewMemberCard
                                    key={member.id}
                                    id={member.id}
                                    name={member.name}
                                    type={member.type}
                                    description={member.description || ''}
                                    attackBonus={member.attack_bonus}
                                    defenseBonus={member.defense_bonus}
                                    cost={member.hire_cost}
                                    upkeep={member.upkeep_per_hour}
                                    available={member.max_available - member.owned}
                                    owned={member.owned}
                                    isProcessing={isProcessing && pendingHire?.id === member.id}
                                    delay={0.05 * index}
                                    onHire={() => handleHireClick(member.id, member.name, member.hire_cost, member.max_available - member.owned)}
                                />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground">Hire {pendingHire?.name}</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Max available: {pendingHire?.max}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Quick Select Buttons */}
                    <div className="flex justify-center gap-2 py-2">
                        {[1, 5, 10].map(n => (
                            <Button
                                key={n}
                                variant={quantity === n ? "default" : "outline"}
                                size="sm"
                                className="text-xs px-3"
                                onClick={() => setQuickQuantity(n)}
                                disabled={n > (pendingHire?.max || 0)}
                            >
                                x{n}
                            </Button>
                        ))}
                        <Button
                            variant={quantity === pendingHire?.max ? "default" : "outline"}
                            size="sm"
                            className="text-xs px-3"
                            onClick={() => setQuickQuantity(pendingHire?.max || 1)}
                        >
                            Max
                        </Button>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-center gap-4 py-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={decrementQuantity}
                            disabled={quantity <= 1}
                        >
                            <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-cinzel text-2xl font-bold w-12 text-center">{quantity}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={incrementQuantity}
                            disabled={quantity >= (pendingHire?.max || 99)}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Total Cost */}
                    <div className="text-center pb-2">
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                        <p className="font-cinzel text-xl font-bold text-primary">${totalCost.toLocaleString()}</p>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-inter">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmHire}
                            className="btn-gold"
                            disabled={isProcessing || quantity < 1}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Hire ${quantity}x`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default HirePage;
