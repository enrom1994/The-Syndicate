import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';

interface FirstChoiceModalProps {
    open: boolean;
    onChoice: (choice: 'business' | 'protection') => void;
}

export const FirstChoiceModal = ({ open, onChoice }: FirstChoiceModalProps) => {
    const handleChoice = (choice: 'business' | 'protection') => {
        haptic.medium();
        onChoice(choice);
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25 }}
                        className="w-full max-w-sm"
                    >
                        <div className="noir-card p-6 space-y-4">
                            {/* Header */}
                            <div className="text-center">
                                <h2 className="font-cinzel text-xl font-bold text-foreground mb-2">
                                    Choose Your Path
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Your first major decision. Both paths are valid.
                                </p>
                            </div>

                            {/* Choices */}
                            <div className="space-y-3">
                                {/* Business Path */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleChoice('business')}
                                    className="w-full noir-card p-4 hover:ring-2 hover:ring-primary/50 transition-all text-left group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0">
                                            <Briefcase className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-cinzel font-semibold text-sm text-foreground mb-1">
                                                Upgrade a Business
                                            </h3>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Invest in your future. Increase passive income.
                                            </p>
                                            <p className="text-xs text-orange-400">
                                                ⚠️ Bigger income makes you a bigger target.
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </motion.button>

                                {/* Protection Path */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleChoice('protection')}
                                    className="w-full noir-card p-4 hover:ring-2 hover:ring-cyan-500/50 transition-all text-left group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-800 flex items-center justify-center shrink-0">
                                            <Shield className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-cinzel font-semibold text-sm text-foreground mb-1">
                                                Buy Protection
                                            </h3>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Stay safe. Get 1-hour protection shield.
                                            </p>
                                            <p className="text-xs text-cyan-400">
                                                🛡️ Protection blocks attacks but slows expansion.
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                                    </div>
                                </motion.button>
                            </div>

                            {/* Footer hint */}
                            <p className="text-center text-[10px] text-muted-foreground">
                                You can do both later. Choose what matters to you now.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
