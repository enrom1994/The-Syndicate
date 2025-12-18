import { motion, AnimatePresence } from 'framer-motion';
import { Skull, X, TrendingUp, TrendingDown, Shield, Swords } from 'lucide-react';
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
    xpGained?: number;
    vaultStolen?: number;
    itemsStolen?: string[];
    crewLost?: number;
    insuranceActivated?: boolean;
    opponentHasMadeMan?: boolean;
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
    const hasLosses = cashLost > 0 || crewLost > 0;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    {/* Backdrop with noir gradient */}
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

                    {/* Radial glow effect */}
                    <div className={`absolute inset-0 ${isVictory
                        ? 'bg-gradient-radial from-yellow-500/20 via-transparent to-transparent'
                        : 'bg-gradient-radial from-red-500/20 via-transparent to-transparent'
                        }`} />

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Main Card */}
                        <div className={`noir-card overflow-hidden ${isVictory
                            ? 'border-l-4 border-l-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.3)]'
                            : 'border-l-4 border-l-red-500 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
                            }`}>
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 z-10 text-muted-foreground/50 hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header Banner */}
                            <div className={`relative px-4 py-6 ${isVictory
                                ? 'bg-gradient-to-br from-yellow-600/30 via-orange-700/20 to-transparent'
                                : 'bg-gradient-to-br from-red-600/30 via-red-900/20 to-transparent'
                                }`}>
                                {/* Pattern overlay */}
                                <div className="absolute inset-0 opacity-10" style={{
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)'
                                }} />

                                {/* Result Icon */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                    className="relative mx-auto mb-3"
                                >
                                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isVictory
                                        ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-600 shadow-[0_0_30px_rgba(234,179,8,0.5)]'
                                        : 'bg-gradient-to-br from-red-500 via-red-600 to-red-800 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                                        }`}>
                                        {isVictory ? (
                                            <img src="/images/icons/trophy.png" alt="Victory" className="w-10 h-10 drop-shadow-lg" />
                                        ) : (
                                            <Skull className="w-10 h-10 text-white drop-shadow-lg" />
                                        )}
                                    </div>


                                    {/* Pulse ring */}
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1.2, opacity: 0 }}
                                        transition={{ delay: 0.5, duration: 1.5, repeat: Infinity }}
                                        className={`absolute inset-0 rounded-full ${isVictory ? 'bg-yellow-500/30' : 'bg-red-500/30'
                                            }`}
                                    />
                                </motion.div>

                                {/* Title */}
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className={`font-cinzel text-2xl font-bold text-center tracking-wider ${isVictory ? 'text-yellow-400' : 'text-red-400'
                                        }`}
                                >
                                    {isVictory ? 'VICTORY' : 'DEFEAT'}
                                </motion.h2>

                                {/* Win Badge */}
                                {isVictory && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="flex justify-center mt-2"
                                    >
                                        <span className="px-3 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-xs font-bold text-yellow-400 flex items-center gap-1">
                                            <Swords className="w-3 h-3" />
                                            +1 Win
                                        </span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-3">
                                {/* Target Info */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.45 }}
                                    className="text-center text-sm text-muted-foreground"
                                >
                                    {isVictory
                                        ? <span>Successfully raided <span className="text-foreground font-semibold">{targetName}</span></span>
                                        : <span><span className="text-foreground font-semibold">{targetName}</span>'s defenses were too strong</span>
                                    }
                                </motion.div>

                                {/* Status Badges */}
                                <div className="space-y-2">
                                    {/* Insurance Badge */}
                                    {insuranceActivated && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 }}
                                            className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2"
                                        >
                                            <Shield className="w-4 h-4 text-cyan-400" />
                                            <span className="text-xs font-semibold text-cyan-400">Insurance Protected You!</span>
                                        </motion.div>
                                    )}

                                    {/* Made Man Badge */}
                                    {opponentHasMadeMan && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.55 }}
                                            className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2"
                                        >
                                            <span className="text-lg">🏅</span>
                                            <span className="text-xs font-semibold text-yellow-400">
                                                {isVictory ? 'You defeated a Made Man' : 'Defeated by a Made Man'}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Results Grid */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="space-y-2"
                                >
                                    {/* Gains Section */}
                                    {hasGains && (
                                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-2">
                                            <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase tracking-wider">
                                                <TrendingUp className="w-3 h-3" />
                                                <span>Gains</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {cashGained > 0 && (
                                                    <div className="flex items-center gap-2 bg-black/30 rounded-md p-2">
                                                        <img src="/images/icons/cash.png" alt="" className="w-4 h-4" />
                                                        <span className="text-sm font-bold text-green-400">
                                                            +${cashGained.toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {vaultStolen > 0 && (
                                                    <div className="flex items-center gap-2 bg-black/30 rounded-md p-2">
                                                        <img src="/images/icons/thevault.png" alt="" className="w-4 h-4" />
                                                        <span className="text-sm font-bold text-yellow-400">
                                                            +${vaultStolen.toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {respectGained > 0 && (
                                                    <div className="flex items-center gap-2 bg-black/30 rounded-md p-2">
                                                        <img src="/images/icons/respect.png" alt="" className="w-4 h-4" />
                                                        <span className="text-sm font-bold text-orange-400">
                                                            +{respectGained}
                                                        </span>
                                                    </div>
                                                )}
                                                {xpGained > 0 && (
                                                    <div className="flex items-center gap-2 bg-black/30 rounded-md p-2">
                                                        <img src="/images/icons/xp.png" alt="" className="w-4 h-4" />
                                                        <span className="text-sm font-bold text-cyan-400">
                                                            +{xpGained} XP
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {itemsStolen.length > 0 && (
                                                <div className="flex items-center gap-2 bg-black/30 rounded-md p-2">
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
                                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
                                            <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold uppercase tracking-wider">
                                                <TrendingDown className="w-3 h-3" />
                                                <span>Losses</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {cashLost > 0 && (
                                                    <div className="flex items-center gap-2 bg-black/30 rounded-md p-2">
                                                        <img src="/images/icons/cash.png" alt="" className="w-4 h-4" />
                                                        <span className="text-sm font-bold text-red-400">
                                                            -${cashLost.toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {crewLost > 0 && (
                                                    <div className="flex flex-col gap-1 bg-black/30 rounded-md p-2 col-span-2">
                                                        <div className="flex items-center gap-2">
                                                            <Skull className="w-4 h-4 text-orange-400" />
                                                            <span className="text-sm font-bold text-orange-400">
                                                                {crewLost} crew member{crewLost > 1 ? 's' : ''} injured
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-orange-400/60">
                                                            Recovers at 1 per hour
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Insurance Note */}
                                    {insuranceActivated && (
                                        <p className="text-[10px] text-cyan-400/70 text-center">
                                            Insurance prevented additional losses
                                        </p>
                                    )}

                                    {/* No Results Message */}
                                    {!hasGains && !hasLosses && (
                                        <div className="bg-muted/10 rounded-lg p-4 text-center">
                                            <p className="text-sm text-muted-foreground">
                                                {isVictory
                                                    ? 'No loot was found this time.'
                                                    : 'You escaped without losing anything.'
                                                }
                                            </p>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Continue Button */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 }}
                                >
                                    <Button
                                        onClick={onClose}
                                        className={`w-full font-cinzel tracking-wider ${isVictory
                                            ? 'btn-gold'
                                            : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'
                                            }`}
                                    >
                                        Continue
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
