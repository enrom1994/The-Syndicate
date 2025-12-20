import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { Sparkles } from 'lucide-react';

interface ClaimRewardModalProps {
    isOpen: boolean;
    onClaim: () => void;
}

export const ClaimRewardModal = ({ isOpen, onClaim }: ClaimRewardModalProps) => {
    const [displayedDiamonds, setDisplayedDiamonds] = useState(0);
    const [showSparkles, setShowSparkles] = useState(false);
    const [animationComplete, setAnimationComplete] = useState(false);
    const animationRef = useRef<number>();

    const REWARD_AMOUNT = 50;

    // Count-up animation for diamonds - triggers when modal opens
    useEffect(() => {
        if (!isOpen) {
            // Reset when modal closes
            setDisplayedDiamonds(0);
            setShowSparkles(false);
            setAnimationComplete(false);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            return;
        }

        // Start animation after a short delay
        const startDelay = setTimeout(() => {
            const startTime = Date.now();
            const duration = 1500; // 1.5 seconds

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for satisfying count-up
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(eased * REWARD_AMOUNT);

                setDisplayedDiamonds(current);

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    setShowSparkles(true);
                    setAnimationComplete(true);
                    haptic.success();
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        }, 300);

        return () => {
            clearTimeout(startDelay);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isOpen]); // Only depend on isOpen

    const handleStart = () => {
        haptic.heavy();
        onClaim();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                >
                    {/* Darkened cinematic background */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                    {/* Modal content */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="relative z-10 w-[90%] max-w-sm bg-gradient-to-b from-zinc-900 to-zinc-950 border border-amber-500/30 rounded-2xl p-6 shadow-2xl shadow-amber-500/20"
                    >
                        {/* Sparkle decorations */}
                        {showSparkles && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute -top-3 -left-3"
                                >
                                    <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="absolute -top-3 -right-3"
                                >
                                    <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                                </motion.div>
                            </>
                        )}

                        {/* Title */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-center mb-6"
                        >
                            <span className="text-4xl mb-2 block">🎉</span>
                            <h2 className="font-cinzel text-xl font-bold text-amber-300">
                                Founder Bonus Claimed
                            </h2>
                        </motion.div>

                        {/* Diamond reward display */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4, type: 'spring', damping: 15 }}
                            className="flex items-center justify-center gap-3 py-6 mb-6 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent rounded-lg"
                        >
                            <motion.div
                                animate={showSparkles ? { rotate: [0, 10, -10, 0] } : {}}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <img
                                    src="/images/icons/diamond.png"
                                    alt="Diamond"
                                    className="w-12 h-12 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                />
                            </motion.div>
                            <div className="text-center">
                                <motion.span
                                    className="font-cinzel text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-cyan-500"
                                    style={{
                                        textShadow: '0 0 30px rgba(34, 211, 238, 0.5)',
                                    }}
                                >
                                    +{displayedDiamonds}
                                </motion.span>
                                <p className="text-sm text-cyan-400/80 font-medium mt-1">DIAMONDS</p>
                            </div>
                        </motion.div>

                        {/* Ego line */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-center text-sm text-muted-foreground/80 mb-6 leading-relaxed"
                        >
                            You're early. <span className="text-amber-400">Early actions permanently affect your progress.</span>
                        </motion.p>

                        {/* Single CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2 }}
                        >
                            <motion.div
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                <Button
                                    onClick={handleStart}
                                    className="w-full btn-gold py-6 text-base font-bold rounded-lg"
                                >
                                    START EARNING →
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
