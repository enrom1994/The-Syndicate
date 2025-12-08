import { motion, AnimatePresence } from 'framer-motion';
import { Sunrise, X, DollarSign, Zap, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/GameIcon';

interface OfflineEarnings {
    totalCash: number;
    businessIncome: number;
    hoursAway: number;
    attacksReceived: number;
    cashLost: number;
}

interface OfflineSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    earnings: OfflineEarnings;
}

const formatCash = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toLocaleString()}`;
};

export const OfflineSummaryModal = ({ isOpen, onClose, earnings }: OfflineSummaryModalProps) => {
    const netEarnings = earnings.totalCash - earnings.cashLost;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="noir-card p-6 max-w-sm w-full relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-gold mx-auto mb-3 flex items-center justify-center">
                                <Sunrise className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <h2 className="font-cinzel text-xl font-bold text-foreground">
                                Welcome Back, Boss
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                You were away for {earnings.hoursAway} hours
                            </p>
                        </div>

                        <div className="space-y-3 mb-6">
                            {earnings.businessIncome > 0 && (
                                <div className="flex items-center justify-between noir-card p-3">
                                    <div className="flex items-center gap-2">
                                        <Building className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Business Income</span>
                                    </div>
                                    <span className="font-cinzel font-bold text-green-500">
                                        +{formatCash(earnings.businessIncome)}
                                    </span>
                                </div>
                            )}

                            {earnings.attacksReceived > 0 && (
                                <div className="flex items-center justify-between noir-card p-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-red-500" />
                                        <span className="text-sm">{earnings.attacksReceived} Attacks</span>
                                    </div>
                                    <span className="font-cinzel font-bold text-red-500">
                                        -{formatCash(earnings.cashLost)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-border pt-4 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="font-cinzel font-semibold">Net Earnings</span>
                                <span className={`font-cinzel font-bold text-xl ${netEarnings >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {netEarnings >= 0 ? '+' : ''}{formatCash(netEarnings)}
                                </span>
                            </div>
                        </div>

                        <Button className="w-full btn-gold" onClick={onClose}>
                            Continue
                        </Button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
