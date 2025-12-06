import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { useEffect } from 'react';

interface LevelUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    newLevel: number;
    previousLevel: number;
    statsGained?: {
        strength?: number;
        defense?: number;
        agility?: number;
        intelligence?: number;
    };
}

export const LevelUpModal = ({ isOpen, onClose, newLevel, previousLevel, statsGained }: LevelUpModalProps) => {
    // Trigger haptic on open
    useEffect(() => {
        if (isOpen) {
            haptic.success();
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm"
                >
                    {/* Confetti-like particles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    opacity: 0,
                                    y: -20,
                                    x: Math.random() * window.innerWidth,
                                    scale: 0
                                }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    y: window.innerHeight + 100,
                                    scale: [0, 1, 0.5],
                                    rotate: Math.random() * 360
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 2,
                                    delay: Math.random() * 0.5,
                                    ease: "easeOut"
                                }}
                                className="absolute w-3 h-3"
                                style={{
                                    backgroundColor: ['#D4AF37', '#FFD700', '#FFA500', '#FFFF00'][i % 4],
                                    borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                                }}
                            />
                        ))}
                    </div>

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", damping: 20 }}
                        className="relative noir-card p-8 text-center max-w-sm w-full"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Crown icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-gold flex items-center justify-center"
                        >
                            <Crown className="w-10 h-10 text-primary-foreground" />
                        </motion.div>

                        {/* Level Up text */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <p className="text-sm text-primary uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Level Up!
                                <Sparkles className="w-4 h-4" />
                            </p>
                            <div className="flex items-center justify-center gap-2 mb-6">
                                <span className="font-cinzel text-3xl text-muted-foreground">{previousLevel}</span>
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5, type: "spring" }}
                                    className="text-primary"
                                >
                                    →
                                </motion.span>
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.2, 1] }}
                                    transition={{ delay: 0.6, duration: 0.5 }}
                                    className="font-cinzel text-5xl font-bold text-foreground"
                                >
                                    {newLevel}
                                </motion.span>
                            </div>
                        </motion.div>

                        {/* Stats gained */}
                        {statsGained && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mb-6 p-4 bg-muted/30 rounded-sm"
                            >
                                <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    Stats Increased
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {statsGained.strength && (
                                        <div className="text-red-400">+{statsGained.strength} STR</div>
                                    )}
                                    {statsGained.defense && (
                                        <div className="text-blue-400">+{statsGained.defense} DEF</div>
                                    )}
                                    {statsGained.agility && (
                                        <div className="text-green-400">+{statsGained.agility} AGI</div>
                                    )}
                                    {statsGained.intelligence && (
                                        <div className="text-purple-400">+{statsGained.intelligence} INT</div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Continue button */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            <Button
                                className="btn-gold w-full"
                                onClick={() => {
                                    haptic.medium();
                                    onClose();
                                }}
                            >
                                Continue
                            </Button>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
