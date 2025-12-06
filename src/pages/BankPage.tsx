import { motion } from 'framer-motion';
import { Landmark, ArrowDownToLine, ArrowUpFromLine, Shield, Clock, Wallet } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';

const BankPage = () => {
    const { toast } = useToast();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'deposit' | 'withdraw'; amount: number } | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    // Mock data
    const walletCash = 12500000;
    const bankedCash = 45000000;
    const interestRate = 0.5; // 0.5% per day
    const lastInterest = 225000; // Last interest earned

    const handleDeposit = () => {
        const amount = parseInt(depositAmount) || 0;
        if (amount > 0 && amount <= walletCash) {
            setPendingAction({ type: 'deposit', amount });
            setConfirmOpen(true);
        }
    };

    const handleWithdraw = () => {
        const amount = parseInt(withdrawAmount) || 0;
        if (amount > 0 && amount <= bankedCash) {
            setPendingAction({ type: 'withdraw', amount });
            setConfirmOpen(true);
        }
    };

    const confirmAction = () => {
        if (pendingAction) {
            toast({
                title: pendingAction.type === 'deposit' ? 'Deposit Successful!' : 'Withdrawal Successful!',
                description: `$${pendingAction.amount.toLocaleString()} has been ${pendingAction.type === 'deposit' ? 'deposited to' : 'withdrawn from'} your vault.`,
            });
            setDepositAmount('');
            setWithdrawAmount('');
        }
        setConfirmOpen(false);
        setPendingAction(null);
    };

    const setMaxDeposit = () => setDepositAmount(walletCash.toString());
    const setMaxWithdraw = () => setWithdrawAmount(bankedCash.toString());

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
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Landmark className="w-5 h-5 text-primary-foreground" />
                    </div>
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
                        <span className="text-xs text-muted-foreground">Last earned</span>
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
                        />
                        <Button variant="outline" size="sm" onClick={setMaxDeposit} className="text-xs">
                            Max
                        </Button>
                        <Button className="btn-gold text-xs" onClick={handleDeposit}>
                            Deposit
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
                        />
                        <Button variant="outline" size="sm" onClick={setMaxWithdraw} className="text-xs">
                            Max
                        </Button>
                        <Button variant="destructive" className="text-xs" onClick={handleWithdraw}>
                            Withdraw
                        </Button>
                    </div>
                </motion.div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={pendingAction?.type === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                description={`${pendingAction?.type === 'deposit' ? 'Deposit' : 'Withdraw'} $${pendingAction?.amount.toLocaleString()} ${pendingAction?.type === 'deposit' ? 'to' : 'from'} your vault?`}
                onConfirm={confirmAction}
                confirmText={pendingAction?.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                variant={pendingAction?.type === 'withdraw' ? 'destructive' : 'default'}
            />
        </MainLayout>
    );
};

export default BankPage;
