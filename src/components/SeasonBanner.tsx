import { motion } from 'framer-motion';
import { Calendar, Clock, Trophy, Zap } from 'lucide-react';
import { GameIcon } from './GameIcon';

interface SeasonBannerProps {
    season: number;
    round: number;
    timeRemaining: string;
    topPrize?: string;
}

export const SeasonBanner = ({ season, round, timeRemaining, topPrize = '100 TON' }: SeasonBannerProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-4 mb-4"
        >
            {/* Main Banner */}
            <div className="noir-card p-4 border-primary/30 bg-gradient-to-r from-muted/20 via-primary/5 to-muted/20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-sm bg-gradient-gold flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div>
                            <h3 className="font-cinzel font-bold text-sm text-primary">Season {season}</h3>
                            <p className="text-xs text-muted-foreground">Round {round}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Top Prize</p>
                        <div className="flex items-center justify-end gap-1">
                            <GameIcon type="ton" className="w-5 h-5" />
                            <p className="font-cinzel font-bold text-sm text-primary">{topPrize}</p>
                        </div>
                    </div>
                </div>

                {/* Timer Bar */}
                <div className="flex items-center gap-3 bg-muted/20 rounded-sm p-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Round ends in</span>
                            <span className="font-inter font-bold text-xs text-foreground">{timeRemaining}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '65%' }}
                                transition={{ duration: 1.5, delay: 0.3 }}
                                className="h-full bg-gradient-gold rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

interface EnergyBarProps {
    energy: number;
    maxEnergy: number;
    regenTime?: string;
}

export const EnergyBar = ({ energy, maxEnergy, regenTime = '2m 30s' }: EnergyBarProps) => {
    const energyPercent = (energy / maxEnergy) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-3 noir-card p-4"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Energy</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-inter font-medium text-sm text-primary">{energy}/{maxEnergy}</span>
                    {energy < maxEnergy && (
                        <span className="text-xs text-muted-foreground">+1 in {regenTime}</span>
                    )}
                </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${energyPercent}%` }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                />
            </div>
        </motion.div>
    );
};
