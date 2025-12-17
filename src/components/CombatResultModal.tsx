import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Skull, X, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CombatResultModalProps {
    open: boolean;
    onClose: () => void;
    result: 'victory' | 'defeat';
    targetName: string;
    cashGained?: number;
    cashLost?: number;
    respectGained?: number;
    respectLost?: number; // Kept for future use but not displayed
    xpGained?: number;
    vaultStolen?: number;
    itemsStolen?: string[];
    crewLost?: number;
    insuranceActivated?: boolean; // New: show when insurance protected the player
    opponentHasMadeMan?: boolean; // Show prestige copy for Made Man opponents
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
    xpGained = 0,
    vaultStolen = 0,
    itemsStolen = [],
    crewLost = 0,
    insuranceActivated = false,
    opponentHasMadeMan = false,
}: CombatResultModalProps) => {
    const isVictory = result === 'victory';

    const hasGains = cashGained > 0 || respectGained > 0 || xpGained > 0 || vaultStolen > 0 || itemsStolen.length > 0;
    // Note: respectLost not shown in UI per design decision (show gains only)
    const hasLosses = cashLost > 0 || crewLost > 0;

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
                        className={`noir-card p-6 w-full max-w-sm relative border-2 ${isVictory ? 'border-yellow-500/50' : 'border-red-500/50'
                            }`}
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
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${isVictory
                                ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                                : 'bg-gradient-to-br from-red-600 to-red-900'
                                }`}
                        >
                            {isVictory ? (
                                <Trophy className="w-12 h-12 text-yellow-100" />
                            ) : (
                                <Skull className="w-12 h-12 text-red-200" />
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

                        {/* +1 Win Badge (PvP Victory) */}
                        {isVictory && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35 }}
                                className="flex justify-center mb-2"
                            >
                                <span className="px-3 py-1 bg-primary/20 border border-primary/50 rounded-full text-xs font-bold text-primary">
                                    +1 Win
                                </span>
                            </motion.div>
                        )}

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

                        {/* Insurance Activated Badge */}
                        {insuranceActivated && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.45 }}
                                className="flex items-center justify-center gap-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg px-3 py-2 mb-4"
                            >
                                <Shield className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm font-semibold text-cyan-400">Insurance Protected You!</span>
                            </motion.div>
                        )}

                        {/* Made Man Prestige Copy */}
                        {opponentHasMadeMan && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.48 }}
                                className="flex items-center justify-center gap-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-3 py-2 mb-4"
                            >
                                <span className="text-yellow-400">🏅</span>
                                <span className="text-sm font-semibold text-yellow-400">
                                    {isVictory ? 'You defeated a Made Man' : 'Defeated by a Made Man'}
                                </span>
                            </motion.div>
                        )}

                        {/* Results Grid */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="space-y-2 mb-6"
                        >
                            {/* Gains Section */}
                            {hasGains && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-green-400 font-semibold uppercase tracking-wider">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>Gained</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {cashGained > 0 && (
                                            <div className="flex items-center gap-2 bg-black/20 rounded p-2">
                                                <img src="/images/icons/cash.png" alt="" className="w-4 h-4" />
                                                <span className="text-sm font-bold text-green-400">
                                                    +${cashGained.toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                        {vaultStolen > 0 && (
                                            <div className="flex items-center gap-2 bg-black/20 rounded p-2">
                                                <img src="/images/icons/thevault.png" alt="" className="w-4 h-4" />
                                                <span className="text-sm font-bold text-yellow-400">
                                                    +${vaultStolen.toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                        {respectGained > 0 && (
                                            <div className="flex items-center gap-2 bg-black/20 rounded p-2">
                                                <img src="/images/icons/respect.png" alt="" className="w-4 h-4" />
                                                <span className="text-sm font-bold text-orange-400">
                                                    +{respectGained}
                                                </span>
                                            </div>
                                        )}
                                        {xpGained > 0 && (
                                            <div className="flex items-center gap-2 bg-black/20 rounded p-2">
                                                <img src="/images/icons/xp.png" alt="" className="w-4 h-4" />
                                                <span className="text-sm font-bold text-cyan-400">
                                                    +{xpGained} XP
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {itemsStolen.length > 0 && (
                                        <div className="flex items-center gap-2 bg-black/20 rounded p-2">
                                            <img src="/images/icons/inventory.png" alt="" className="w-4 h-4" />
                                            <span className="text-sm text-purple-400">
                                                {itemsStolen.join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Losses Section */}
                            {hasLosses && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-red-400 font-semibold uppercase tracking-wider">
                                        <TrendingDown className="w-3 h-3" />
                                        <span>Lost</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {cashLost > 0 && (
                                            <div className="flex items-center gap-2 bg-black/20 rounded p-2">
                                                <img src="/images/icons/cash.png" alt="" className="w-4 h-4" />
                                                <span className="text-sm font-bold text-red-400">
                                                    -${cashLost.toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                        {/* Respect loss hidden per UX decision - show gains only */}
                                        {crewLost > 0 && (
                                            <div className="flex items-center gap-2 bg-black/20 rounded p-2 col-span-2">
                                                <Skull className="w-4 h-4 text-red-400" />
                                                <span className="text-sm font-bold text-red-400">
                                                    Lost {crewLost} crew member{crewLost > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Insurance Copy Line - shown under losses when insurance protected defender */}
                            {insuranceActivated && (
                                <p className="text-xs text-cyan-400/80 text-center mt-2">
                                    Insurance prevented additional losses.
                                </p>
                            )}

                            {/* No results message */}
                            {!hasGains && !hasLosses && (
                                <div className="bg-muted/20 rounded-lg p-4 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        {isVictory
                                            ? 'No loot was found this time.'
                                            : 'You escaped without losing anything.'
                                        }
                                    </p>
                                </div>
                            )}
                        </motion.div>

                        <Button onClick={onClose} className={`w-full ${isVictory ? 'btn-gold' : 'bg-red-600 hover:bg-red-500'}`}>
                            Continue
                        </Button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
