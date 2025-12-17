import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Minus, Plus, Package, Banknote, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameIcon } from '@/components/GameIcon';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';

interface ContrabandItem {
    item_id: string;
    name: string;
    rarity: string;
    icon: string | null;
    quantity: number;
    base_value: number;
    treasury_value: number;
    tax_amount: number;
}

interface ContributionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    familyName: string;
    treasuryBalance: number;
    myContribution: number;
    onSuccess: () => void;
}

const rarityColors: Record<string, string> = {
    common: 'border-gray-500/50',
    uncommon: 'border-green-500/50',
    rare: 'border-blue-500/50',
    legendary: 'border-purple-500/50',
};

const rarityBadgeColors: Record<string, string> = {
    common: 'bg-gray-500/20 text-gray-300',
    uncommon: 'bg-green-500/20 text-green-400',
    rare: 'bg-blue-500/20 text-blue-400',
    legendary: 'bg-purple-500/20 text-purple-400',
};

export const ContributionDialog = ({
    open,
    onOpenChange,
    familyName,
    treasuryBalance,
    myContribution,
    onSuccess,
}: ContributionDialogProps) => {
    const { toast } = useToast();
    const { player, refetchPlayer } = useAuth();

    const [activeTab, setActiveTab] = useState<'cash' | 'contraband'>('cash');
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Cash contribution state
    const [cashAmount, setCashAmount] = useState(10000);

    // Contraband contribution state
    const [contrabandItems, setContrabandItems] = useState<ContrabandItem[]>([]);
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    const [dailyCap, setDailyCap] = useState(100000);
    const [contributedToday, setContributedToday] = useState(0);
    const [remainingCap, setRemainingCap] = useState(100000);
    const [taxRate, setTaxRate] = useState(10);

    // Load contraband items when dialog opens
    useEffect(() => {
        if (open && player?.id) {
            loadContrabandItems();
        }
    }, [open, player?.id]);

    const loadContrabandItems = async () => {
        if (!player?.id) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_contraband_for_treasury', {
                player_id_input: player.id,
            });

            if (error) throw error;

            if (data?.success) {
                setContrabandItems(data.items || []);
                setDailyCap(data.daily_cap || 100000);
                setContributedToday(data.contributed_today || 0);
                setRemainingCap(data.remaining_cap || 100000);
                setTaxRate(data.tax_rate || 10);
                setSelectedQuantities({});
            }
        } catch (error) {
            console.error('Failed to load contraband:', error);
            toast({
                title: 'Error',
                description: 'Failed to load contraband inventory',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate total contraband contribution value
    const getTotalContrabandValue = () => {
        return contrabandItems.reduce((total, item) => {
            const qty = selectedQuantities[item.item_id] || 0;
            return total + item.treasury_value * qty;
        }, 0);
    };

    const getTotalTaxAmount = () => {
        return contrabandItems.reduce((total, item) => {
            const qty = selectedQuantities[item.item_id] || 0;
            return total + item.tax_amount * qty;
        }, 0);
    };

    const handleQuantityChange = (itemId: string, delta: number, maxQty: number) => {
        setSelectedQuantities((prev) => {
            const current = prev[itemId] || 0;
            const newQty = Math.max(0, Math.min(maxQty, current + delta));
            return { ...prev, [itemId]: newQty };
        });
    };

    const handleCashContribute = async () => {
        if (!player?.id || cashAmount <= 0) return;

        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('contribute_to_treasury', {
                contributor_id: player.id,
                amount: cashAmount,
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({
                    title: 'Contribution Made',
                    description: data.message,
                });
                await refetchPlayer();
                onSuccess();
                onOpenChange(false);
            } else {
                toast({
                    title: 'Error',
                    description: data?.message || 'Failed to contribute',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Cash contribution error:', error);
            toast({
                title: 'Error',
                description: 'Failed to contribute. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleContrabandContribute = async () => {
        if (!player?.id) return;

        const itemsToContribute = Object.entries(selectedQuantities).filter(
            ([, qty]) => qty > 0
        );

        if (itemsToContribute.length === 0) return;

        setIsProcessing(true);
        let successCount = 0;
        let totalContributed = 0;

        try {
            for (const [itemId, quantity] of itemsToContribute) {
                const { data, error } = await supabase.rpc('contribute_contraband_to_treasury', {
                    player_id_input: player.id,
                    contraband_id_input: itemId,
                    quantity_input: quantity,
                });

                if (error) {
                    console.error('Contraband contribution error:', error);
                    continue;
                }

                if (data?.success) {
                    successCount++;
                    totalContributed += data.net_contribution || 0;
                } else if (data?.message) {
                    toast({
                        title: 'Contribution Issue',
                        description: data.message,
                        variant: 'destructive',
                    });
                }
            }

            if (successCount > 0) {
                haptic.success();
                toast({
                    title: 'Treasury Contribution',
                    description: `Contributed $${totalContributed.toLocaleString()} to the family treasury!`,
                });
                await refetchPlayer();
                onSuccess();
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Contraband contribution error:', error);
            toast({
                title: 'Error',
                description: 'Failed to contribute. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const totalContrabandValue = getTotalContrabandValue();
    const exceedsCap = totalContrabandValue > remainingCap;
    const hasSelectedContraband = totalContrabandValue > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-primary/20 max-w-md max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="font-cinzel text-xl flex items-center gap-2">
                        <span className="text-2xl">🏛️</span>
                        Contribute to Treasury
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground italic">
                        "For the Family"
                    </DialogDescription>
                </DialogHeader>

                {/* Treasury Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 shrink-0"
                >
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Treasury</p>
                            <p className="font-cinzel font-bold text-primary">
                                ${treasuryBalance.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Total</p>
                            <p className="font-cinzel font-bold text-foreground">
                                ${myContribution.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your %</p>
                            <p className="font-cinzel font-bold text-foreground">
                                {treasuryBalance > 0
                                    ? Math.round((myContribution / (treasuryBalance || 1)) * 100)
                                    : 0}%
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as 'cash' | 'contraband')}
                    className="flex-1 flex flex-col min-h-0"
                >
                    <TabsList className="w-full grid grid-cols-2 shrink-0">
                        <TabsTrigger value="cash" className="font-cinzel text-xs gap-2">
                            <Banknote className="w-4 h-4" />
                            Cash
                        </TabsTrigger>
                        <TabsTrigger value="contraband" className="font-cinzel text-xs gap-2">
                            <Package className="w-4 h-4" />
                            Contraband
                        </TabsTrigger>
                    </TabsList>

                    {/* Cash Tab */}
                    <TabsContent value="cash" className="flex-1 overflow-auto mt-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Your Cash:</span>
                                <span className="font-bold">${(player?.cash ?? 0).toLocaleString()}</span>
                            </div>

                            <Input
                                type="number"
                                value={cashAmount}
                                onChange={(e) => setCashAmount(parseInt(e.target.value) || 0)}
                                className="bg-muted/30 border-border/50 text-center text-lg font-cinzel"
                                min={1000}
                                max={player?.cash ?? 0}
                            />

                            <div className="grid grid-cols-4 gap-2">
                                {[10000, 50000, 100000, 500000].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setCashAmount(Math.min(amount, player?.cash ?? 0))}
                                        className="p-2 text-xs rounded-sm bg-muted/30 border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                    >
                                        ${(amount / 1000)}K
                                    </button>
                                ))}
                            </div>

                            {/* Preview */}
                            <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Treasury gains:</span>
                                    <span className="font-cinzel font-bold text-lg text-primary">
                                        +${cashAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <Button
                                className="w-full btn-gold"
                                onClick={handleCashContribute}
                                disabled={isProcessing || cashAmount <= 0 || cashAmount > (player?.cash ?? 0)}
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <GameIcon type="cash" className="w-4 h-4 mr-2" />
                                )}
                                Contribute ${cashAmount.toLocaleString()}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Contraband Tab */}
                    <TabsContent value="contraband" className="flex-1 overflow-auto mt-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Daily Cap Status */}
                                <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-muted-foreground">Daily Limit</span>
                                        <span className="text-xs">
                                            <span className={remainingCap > 0 ? 'text-green-400' : 'text-red-400'}>
                                                ${remainingCap.toLocaleString()}
                                            </span>
                                            <span className="text-muted-foreground"> / ${dailyCap.toLocaleString()}</span>
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{ width: `${((dailyCap - remainingCap) / dailyCap) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {taxRate}% Family Tax applied • Resets daily
                                    </p>
                                </div>

                                {/* Contraband Items */}
                                {contrabandItems.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground">No contraband to contribute</p>
                                        <p className="text-xs text-muted-foreground/70 mt-1">
                                            Complete jobs or heists to earn contraband
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        <AnimatePresence>
                                            {contrabandItems.map((item, index) => (
                                                <motion.div
                                                    key={item.item_id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className={`bg-muted/20 rounded-lg p-3 border-l-2 ${rarityColors[item.rarity]}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Icon */}
                                                        <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {item.icon ? (
                                                                <img
                                                                    src={item.icon}
                                                                    alt={item.name}
                                                                    className="w-full h-full object-contain p-1"
                                                                />
                                                            ) : (
                                                                <Package className="w-5 h-5 text-muted-foreground" />
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-cinzel text-sm font-semibold truncate">
                                                                    {item.name}
                                                                </span>
                                                                <span className={`px-1.5 py-0.5 text-[9px] rounded ${rarityBadgeColors[item.rarity]}`}>
                                                                    {item.rarity.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                x{item.quantity} available • ${item.treasury_value.toLocaleString()} each
                                                            </p>
                                                        </div>

                                                        {/* Quantity Controls */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="w-7 h-7"
                                                                onClick={() => handleQuantityChange(item.item_id, -1, item.quantity)}
                                                                disabled={(selectedQuantities[item.item_id] || 0) <= 0}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </Button>
                                                            <span className="w-8 text-center font-cinzel font-bold text-sm">
                                                                {selectedQuantities[item.item_id] || 0}
                                                            </span>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="w-7 h-7"
                                                                onClick={() => handleQuantityChange(item.item_id, 1, item.quantity)}
                                                                disabled={(selectedQuantities[item.item_id] || 0) >= item.quantity}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Contribution Summary */}
                                {hasSelectedContraband && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`rounded-lg p-3 border ${exceedsCap
                                            ? 'bg-red-500/10 border-red-500/30'
                                            : 'bg-primary/10 border-primary/30'
                                            }`}
                                    >
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Family Tax ({taxRate}%):</span>
                                                <span className="text-red-400">-${getTotalTaxAmount().toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-border/30 pt-1">
                                                <span className="text-muted-foreground">Treasury gains:</span>
                                                <span className={`font-cinzel font-bold ${exceedsCap ? 'text-red-400' : 'text-primary'}`}>
                                                    +${totalContrabandValue.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {exceedsCap && (
                                            <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Exceeds daily limit by ${(totalContrabandValue - remainingCap).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                <Button
                                    className="w-full btn-gold"
                                    onClick={handleContrabandContribute}
                                    disabled={isProcessing || !hasSelectedContraband || exceedsCap}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Package className="w-4 h-4 mr-2" />
                                    )}
                                    {hasSelectedContraband
                                        ? `Contribute $${totalContrabandValue.toLocaleString()}`
                                        : 'Select contraband'}
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
