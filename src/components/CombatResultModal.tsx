import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Skull, DollarSign, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CombatResultModalProps {
    open: boolean;
    onClose: () => void;
    result: 'victory' | 'defeat';
    targetName: string;
    cashGained?: number;
    cashLost?: number;
    respectGained?: number;
    respectLost?: number;
}

export const CombatResultModal = ({
    open,
    onClose,
    result,
    targetName,
    cashGained = 0,
    cashLost = 0,
    respectGained = 0,
    respectLost = 0,
}: CombatResultModalProps) => {
    const isVictory = result === 'victory';

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                        className="noir-card p-6 w-full max-w-sm relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Result Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isVictory ? 'bg-gradient-gold' : 'bg-destructive/20'
                                }`}
                        >
                            {isVictory ? (
                                <Trophy className="w-10 h-10 text-primary-foreground" />
                            ) : (
                                <Skull className="w-10 h-10 text-destructive" />
                            )}
                        </motion.div>

                        {/* Title */}
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className={`font-cinzel text-2xl font-bold text-center mb-2 ${isVictory ? 'text-primary' : 'text-destructive'
                                }`}
                        >
                            {isVictory ? 'VICTORY!' : 'DEFEAT'}
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-center text-muted-foreground text-sm mb-6"
                        >
                            {isVictory
                                ? `You successfully raided ${targetName}!`
                                : `${targetName}'s defenses were too strong.`
                            }
                        </motion.p>

                        {/* Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="space-y-2 mb-6"
                        >
                            {(cashGained > 0 || cashLost > 0) && (
                                <div className="flex items-center justify-between bg-muted/20 rounded-sm p-3">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-primary" />
                                        <span className="text-sm text-foreground">Cash</span>
                                    </div>
                                    <span className={`font-cinzel font-bold ${isVictory ? 'text-green-500' : 'text-red-500'}`}>
                                        {isVictory ? '+' : '-'}${(isVictory ? cashGained : cashLost).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {(respectGained > 0 || respectLost > 0) && (
                                <div className="flex items-center justify-between bg-muted/20 rounded-sm p-3">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-primary" />
                                        <span className="text-sm text-foreground">Respect</span>
                                    </div>
                                    <span className={`font-cinzel font-bold ${isVictory ? 'text-green-500' : 'text-red-500'}`}>
                                        {isVictory ? '+' : '-'}{isVictory ? respectGained : respectLost}
                                    </span>
                                </div>
                            )}
                        </motion.div>

                        <Button onClick={onClose} className="w-full btn-gold">
                            Continue
                        </Button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
