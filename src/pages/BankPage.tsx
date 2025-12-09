import { motion } from 'framer-motion';
import { Lock, ArrowDownToLine, ArrowUpFromLine, Shield, Clock, Wallet, Loader2, Package, LockKeyhole, Unlock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
import { useGameStore, InventoryItem, SafePackage } from '@/hooks/useGameStore';
import { TON_RECEIVING_ADDRESS, toNanoTon } from '@/lib/ton-config';

const BankPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const [tonConnectUI] = useTonConnectUI();
    const { deposit, withdraw, getSafeInfo, getSafePackages, purchaseSafeSlots, inventory, moveFromSafe, loadInventory } = useGameStore();
    const [safeInfo, setSafeInfo] = useState<{ total_slots: number; used_slots: number; available_slots: number } | null>(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'deposit' | 'withdraw'; amount: number } | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Safe item removal dialog
    const [selectedSafeItem, setSelectedSafeItem] = useState<InventoryItem | null>(null);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    // Safe packages purchase dialog
    const [packagesDialogOpen, setPackagesDialogOpen] = useState(false);
    const [packages, setPackages] = useState<SafePackage[]>([]);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Get data from player state (with defaults for loading state)
    const walletCash = player?.cash ?? 0;
    const bankedCash = player?.banked_cash ?? 0;
    const interestRate = 0.5; // 0.5% per day (could be stored in config table)
    const lastInterest = Math.floor(bankedCash * (interestRate / 100)); // Estimated daily interest

    // Count items in safe
    const itemsInSafe = inventory.filter(i => i.location === 'safe');
    const totalSafeItems = itemsInSafe.reduce((sum, i) => sum + i.quantity, 0);

    // Player gets 1 slot by default
    const totalSlots = 1;

    // Load safe info on mount
    useEffect(() => {
        const loadSafe = async () => {
            const info = await getSafeInfo();
            if (info) {
                setSafeInfo({
                    total_slots: Math.max(info.total_slots, totalSlots), // Ensure at least 1 slot
                    used_slots: itemsInSafe.length,
                    available_slots: Math.max(info.total_slots, totalSlots) - itemsInSafe.length
                });
            } else {
                // Default to 1 slot if no safe info
                setSafeInfo({
                    total_slots: totalSlots,
                    used_slots: itemsInSafe.length,
                    available_slots: totalSlots - itemsInSafe.length
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

    const handleRemoveFromSafe = async () => {
        if (!selectedSafeItem) return;

        setIsRemoving(true);
        try {
            const success = await moveFromSafe(selectedSafeItem.id);
            if (success) {
                toast({
                    title: 'Item Removed',
                    description: `${selectedSafeItem.name} has been moved to your inventory.`,
                });
                await loadInventory();
            } else {
                toast({
                    title: 'Failed',
                    description: 'Could not remove item from safe.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Remove from safe error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsRemoving(false);
            setRemoveDialogOpen(false);
            setSelectedSafeItem(null);
        }
    };

    const openRemoveDialog = (item: InventoryItem) => {
        setSelectedSafeItem(item);
        setRemoveDialogOpen(true);
    };

    const openPackagesDialog = async () => {
        const data = await getSafePackages();
        setPackages(data);
        setPackagesDialogOpen(true);
    };

    const handlePurchasePackage = async (pkg: SafePackage) => {
        // Check if wallet is connected
        if (!tonConnectUI.wallet) {
            tonConnectUI.openModal();
            return;
        }

        setIsPurchasing(true);
        try {
            // Send TON transaction for payment
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
                messages: [
                    {
                        address: TON_RECEIVING_ADDRESS,
                        amount: toNanoTon(pkg.price_ton).toString(),
                    }
                ]
            };

            await tonConnectUI.sendTransaction(transaction);

            // After successful payment, record the purchase in database
            const result = await purchaseSafeSlots(pkg.id);
            if (result.success) {
                toast({
                    title: 'Vault Upgraded!',
                    description: `You now have ${pkg.slots} more safe slots.`,
                });
                // Refresh safe info
                const info = await getSafeInfo();
                if (info) {
                    setSafeInfo({
                        total_slots: info.total_slots,
                        used_slots: itemsInSafe.length,
                        available_slots: info.total_slots - itemsInSafe.length
                    });
                }
                setPackagesDialogOpen(false);
            } else {
                toast({
                    title: 'Purchase Failed',
                    description: result.message || 'Could not complete purchase.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Purchase error:', error);
            toast({
                title: 'Transaction Cancelled',
                description: 'The transaction was cancelled or failed.',
                variant: 'destructive',
            });
        } finally {
            setIsPurchasing(false);
        }
    };

    const setMaxDeposit = () => setDepositAmount(walletCash.toString());
    const setMaxWithdraw = () => setWithdrawAmount(bankedCash.toString());

    // Get item image path
    const getItemImage = (item: InventoryItem) => {
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (item.category === 'weapon') return `/images/blackmarket/${slug}.png`;
        if (item.category === 'equipment') return `/images/blackmarket/${slug}.png`;
        if (item.category === 'contraband') return `/images/blackmarket/${slug}.png`;
        return `/images/icons/inventory.png`;
    };

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

                {/* Safe Storage Section - Visual Box Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="noir-card p-4 mt-6"
                >
                    <h3 className="font-cinzel font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                        <LockKeyhole className="w-4 h-4 text-primary" />
                        Safe Storage
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        You have <span className="text-primary font-semibold">{totalSlots}</span> secure storage slot. Tap to manage.
                    </p>

                    {/* 2-Column Grid of Storage Boxes */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Slot 1 - Either filled with item or empty */}
                        {itemsInSafe.length > 0 ? (
                            // Show the item in the safe
                            itemsInSafe.map((item, index) => (
                                <motion.button
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => openRemoveDialog(item)}
                                    className="relative aspect-square bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/50 rounded-lg flex flex-col items-center justify-center p-2 hover:border-primary transition-all group"
                                >
                                    {/* Lock icon in corner */}
                                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary/80 rounded-full flex items-center justify-center">
                                        <Lock className="w-3 h-3 text-primary-foreground" />
                                    </div>

                                    {/* Item Image */}
                                    <div className="w-14 h-14 rounded-md bg-muted/30 flex items-center justify-center overflow-hidden mb-1">
                                        <img
                                            src={getItemImage(item)}
                                            alt={item.name}
                                            className="w-12 h-12 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/images/icons/inventory.png';
                                            }}
                                        />
                                    </div>

                                    {/* Item name */}
                                    <p className="text-[10px] text-foreground font-medium text-center truncate w-full">
                                        {item.name}
                                    </p>

                                    {/* Quantity Badge */}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary px-2 py-0.5 rounded-full">
                                        <span className="text-[10px] font-bold text-primary-foreground">x{item.quantity.toLocaleString()}</span>
                                    </div>

                                    {/* Hover hint */}
                                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-white font-medium">Tap to manage</span>
                                    </div>
                                </motion.button>
                            ))
                        ) : (
                            // Empty slot
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative aspect-square bg-muted/20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center p-2"
                            >
                                {/* Lock icon */}
                                <div className="w-10 h-10 bg-muted/30 rounded-full flex items-center justify-center mb-2">
                                    <Unlock className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center">Empty Slot</p>
                                <p className="text-[8px] text-muted-foreground/60 text-center mt-1">Move items from inventory</p>
                            </motion.div>
                        )}

                        {/* If there's one item in safe, show remaining empty slots */}
                        {itemsInSafe.length === 1 && totalSlots > 1 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="relative aspect-square bg-muted/10 border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center p-2 opacity-50"
                            >
                                <div className="w-8 h-8 bg-muted/20 rounded-full flex items-center justify-center mb-1">
                                    <Lock className="w-4 h-4 text-muted-foreground/50" />
                                </div>
                                <p className="text-[8px] text-muted-foreground/50">Locked</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Info text */}
                    <div className="mt-4 pt-3 border-t border-border/30">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-muted-foreground">Items Protected</span>
                            <span className="font-cinzel font-bold text-green-400 flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {totalSafeItems.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mb-3">
                            <span className="text-muted-foreground">Total Slots</span>
                            <span className="font-cinzel font-bold text-primary">
                                {safeInfo?.total_slots || 1}
                            </span>
                        </div>
                        <Button
                            className="w-full btn-gold"
                            onClick={openPackagesDialog}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Upgrade Vault
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Cash Deposit/Withdraw Confirm Dialog */}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={pendingAction?.type === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                description={`${pendingAction?.type === 'deposit' ? 'Deposit' : 'Withdraw'} $${pendingAction?.amount.toLocaleString()} ${pendingAction?.type === 'deposit' ? 'to' : 'from'} your vault?`}
                onConfirm={confirmAction}
                confirmText={isProcessing ? 'Processing...' : (pendingAction?.type === 'deposit' ? 'Deposit' : 'Withdraw')}
                variant={pendingAction?.type === 'withdraw' ? 'destructive' : 'default'}
            />

            {/* Safe Item Removal Dialog */}
            <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground flex items-center gap-2">
                            <Lock className="w-4 h-4 text-primary" />
                            {selectedSafeItem?.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            This item is protected in your safe.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {selectedSafeItem && (
                        <div className="py-4">
                            <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-lg">
                                <div className="w-12 h-12 bg-muted/30 rounded-md flex items-center justify-center">
                                    <img
                                        src={getItemImage(selectedSafeItem)}
                                        alt={selectedSafeItem.name}
                                        className="w-10 h-10 object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/images/icons/inventory.png';
                                        }}
                                    />
                                </div>
                                <div>
                                    <p className="font-cinzel font-bold text-sm text-foreground">{selectedSafeItem.name}</p>
                                    <p className="text-xs text-muted-foreground">Quantity: <span className="text-primary font-bold">{selectedSafeItem.quantity.toLocaleString()}</span></p>
                                </div>
                            </div>
                            <p className="text-[10px] text-red-400 mt-3">
                                ⚠️ Removing items from safe makes them vulnerable to theft!
                            </p>
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveFromSafe}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isRemoving}
                        >
                            {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove from Safe'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Safe Packages Purchase Dialog */}
            <AlertDialog open={packagesDialogOpen} onOpenChange={setPackagesDialogOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Upgrade Vault
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Purchase additional safe storage slots to protect more items from theft.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4 space-y-3">
                        {packages.length === 0 ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            packages.map((pkg) => (
                                <motion.button
                                    key={pkg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => handlePurchasePackage(pkg)}
                                    disabled={isPurchasing}
                                    className={`w-full p-3 rounded-lg border transition-all text-left ${pkg.id === 'gold' || pkg.id === 'platinum'
                                        ? 'border-primary/50 bg-primary/10 hover:bg-primary/20'
                                        : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                                        } ${isPurchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-cinzel font-bold text-sm text-foreground">{pkg.name}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                +{pkg.slots} safe slots
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-cinzel font-bold text-primary flex items-center gap-1">
                                                <img src="/images/icons/ton_symbol.png" alt="TON" className="w-4 h-4"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                                {pkg.price_ton} TON
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>
                            ))
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPurchasing}>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default BankPage;
