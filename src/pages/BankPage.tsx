import { motion } from 'framer-motion';
import { Lock, ArrowDownToLine, ArrowUpFromLine, Shield, Clock, Wallet, Loader2, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/hooks/useGameStore';

const BankPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const { deposit, withdraw, getSafeInfo, inventory } = useGameStore();
    const [safeInfo, setSafeInfo] = useState<{ total_slots: number; used_slots: number; available_slots: number } | null>(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'deposit' | 'withdraw'; amount: number } | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Get data from player state (with defaults for loading state)
    const walletCash = player?.cash ?? 0;
    const bankedCash = player?.banked_cash ?? 0;
    const interestRate = 0.5; // 0.5% per day (could be stored in config table)
    const lastInterest = Math.floor(bankedCash * (interestRate / 100)); // Estimated daily interest

    // Count items in safe
    const itemsInSafe = inventory.filter(i => i.location === 'safe');
    const totalSafeItems = itemsInSafe.reduce((sum, i) => sum + i.quantity, 0);

    // Load safe info on mount
    useEffect(() => {
        const loadSafe = async () => {
            const info = await getSafeInfo();
            if (info) {
                setSafeInfo({
                    total_slots: info.total_slots,
                    used_slots: itemsInSafe.length,
                    available_slots: info.total_slots - itemsInSafe.length
                });
            }
        };
        loadSafe();
    }, [getSafeInfo, itemsInSafe.length]);

    const handleDeposit = () => {
        const amount = parseInt(depositAmount) || 0;
        if (amount > 0 && amount <= walletCash) {
            setPendingAction({ type: 'deposit', amount });
            setConfirmOpen(true);
        } else if (amount > walletCash) {
            toast({
                title: 'Insufficient Funds',
                description: 'You don\'t have enough cash in your wallet.',
                variant: 'destructive',
            });
        }
    };

    const handleWithdraw = () => {
        const amount = parseInt(withdrawAmount) || 0;
        if (amount > 0 && amount <= bankedCash) {
            setPendingAction({ type: 'withdraw', amount });
            setConfirmOpen(true);
        } else if (amount > bankedCash) {
            toast({
                title: 'Insufficient Funds',
                description: 'You don\'t have enough cash in the vault.',
                variant: 'destructive',
            });
        }
    };

    const confirmAction = async () => {
        if (!pendingAction) return;

        setIsProcessing(true);

        try {
            let success = false;

            if (pendingAction.type === 'deposit') {
                success = await deposit(pendingAction.amount);
            } else {
                success = await withdraw(pendingAction.amount);
            }

            if (success) {
                toast({
                    title: pendingAction.type === 'deposit' ? 'Deposit Successful!' : 'Withdrawal Successful!',
                    description: `$${pendingAction.amount.toLocaleString()} has been ${pendingAction.type === 'deposit' ? 'deposited to' : 'withdrawn from'} your vault.`,
                });
                setDepositAmount('');
                setWithdrawAmount('');
                // Refresh player data to update balances
                await refetchPlayer();
            } else {
                toast({
                    title: 'Transaction Failed',
                    description: 'Could not complete the transaction. Please try again.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Bank transaction error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
            setConfirmOpen(false);
            setPendingAction(null);
        }
    };

    const setMaxDeposit = () => setDepositAmount(walletCash.toString());
    const setMaxWithdraw = () => setWithdrawAmount(bankedCash.toString());

    // Show loading state while auth is loading
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
                style={{ backgroundImage: 'url(/images/backgrounds/warehouse.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <img
                        src="/images/icons/thevault.png"
                        alt="The Vault"
                        className="w-12 h-12 object-contain"
                    />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">The Vault</h1>
                        <p className="text-xs text-muted-foreground">Protect your cash from rival attacks</p>
                    </div>
                </motion.div>

                {/* Protection Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-3 mb-6 flex items-center gap-2"
                >
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">
                        Cash in the vault is <span className="text-primary font-semibold">protected from PvP attacks</span>
                    </p>
                </motion.div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="noir-card p-4"
                    >
                        <p className="text-xs text-muted-foreground mb-1">Wallet</p>
                        <p className="font-cinzel font-bold text-lg text-foreground flex items-center gap-1">
                            <Wallet className="w-4 h-4 text-muted-foreground" />
                            ${walletCash.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-red-400 mt-1">⚠️ Vulnerable to theft</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="noir-card p-4 border border-primary/30"
                    >
                        <p className="text-xs text-muted-foreground mb-1">Vault</p>
                        <p className="font-cinzel font-bold text-lg text-primary flex items-center gap-1">
                            <GameIcon type="cash" className="w-5 h-5" />
                            ${bankedCash.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-green-400 mt-1">✓ Protected</p>
                    </motion.div>
                </div>

                {/* Interest Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="noir-card p-4 mb-6"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Daily Interest</span>
                        </div>
                        <span className="font-cinzel font-bold text-sm text-primary">+{interestRate}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">Est. daily earnings</span>
                        <span className="font-cinzel font-bold text-sm text-green-400">+${lastInterest.toLocaleString()}</span>
                    </div>
                </motion.div>

                {/* Deposit Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="noir-card p-4 mb-3"
                >
                    <h3 className="font-cinzel font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                        <ArrowDownToLine className="w-4 h-4 text-primary" />
                        Deposit
                    </h3>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="flex-1 bg-muted/30 border-border/50"
                            disabled={isProcessing}
                        />
                        <Button variant="outline" size="sm" onClick={setMaxDeposit} className="text-xs" disabled={isProcessing}>
                            Max
                        </Button>
                        <Button className="btn-gold text-xs" onClick={handleDeposit} disabled={isProcessing || !depositAmount}>
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deposit'}
                        </Button>
                    </div>
                </motion.div>

                {/* Withdraw Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="noir-card p-4"
                >
                    <h3 className="font-cinzel font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                        <ArrowUpFromLine className="w-4 h-4 text-destructive" />
                        Withdraw
                    </h3>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="flex-1 bg-muted/30 border-border/50"
                            disabled={isProcessing}
                        />
                        <Button variant="outline" size="sm" onClick={setMaxWithdraw} className="text-xs" disabled={isProcessing}>
                            Max
                        </Button>
                        <Button variant="destructive" className="text-xs" onClick={handleWithdraw} disabled={isProcessing || !withdrawAmount}>
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
                        </Button>
                    </div>
                </motion.div>

                {/* Safe Storage Slots */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="noir-card p-4 mt-6"
                >
                    <h3 className="font-cinzel font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Safe Storage
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                        Protect items from theft. Each slot holds up to 1,000 items.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 rounded-sm p-3">
                            <p className="text-xs text-muted-foreground mb-1">Slots Used</p>
                            <p className="font-cinzel font-bold text-lg text-primary">
                                {safeInfo?.used_slots ?? 0}/{safeInfo?.total_slots ?? 0}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">Purchase more with TON</p>
                        </div>
                        <div className="bg-muted/30 rounded-sm p-3">
                            <p className="text-xs text-muted-foreground mb-1">Items Protected</p>
                            <p className="font-cinzel font-bold text-lg text-green-400 flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {totalSafeItems.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">Safe from theft</p>
                        </div>
                    </div>
                    {(safeInfo?.total_slots ?? 0) === 0 && (
                        <Button className="btn-gold w-full mt-4" size="sm">
                            <Lock className="w-3 h-3 mr-1" />
                            Purchase Vault Slots
                        </Button>
                    )}
                </motion.div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={pendingAction?.type === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                description={`${pendingAction?.type === 'deposit' ? 'Deposit' : 'Withdraw'} $${pendingAction?.amount.toLocaleString()} ${pendingAction?.type === 'deposit' ? 'to' : 'from'} your vault?`}
                onConfirm={confirmAction}
                confirmText={isProcessing ? 'Processing...' : (pendingAction?.type === 'deposit' ? 'Deposit' : 'Withdraw')}
                variant={pendingAction?.type === 'withdraw' ? 'destructive' : 'default'}
            />
        </MainLayout>
    );
};

export default BankPage;
