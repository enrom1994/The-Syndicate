import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Users, ChevronRight, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { Link, useNavigate } from 'react-router-dom';

interface TournamentData {
    has_tournament: boolean;
    tournament?: {
        id: string;
        name: string;
        description: string;
        prize_amount: number;
        prize_currency: string;
        starts_at: string;
        ends_at: string;
        ranking_metric: string;
        eligibility: string;
        is_started: boolean;
        is_ended: boolean;
        participant_count: number;
    };
    player?: {
        is_founder: boolean;
        is_registered: boolean;
        current_rank: number | null;
        current_networth: number | null;
    };
}

interface CountdownTime {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const calculateTimeRemaining = (endDate: string): CountdownTime => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
};

const formatNumber = (num: number): string => num.toString().padStart(2, '0');

export const FoundersTournamentBanner = () => {
    const { player } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    // Fetch tournament data
    useEffect(() => {
        const fetchTournament = async () => {
            if (!player?.id) {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase.rpc('get_current_tournament' as any, {
                    player_id_input: player.id
                });

                if (error) throw error;
                setTournamentData(data as TournamentData);
            } catch (error) {
                console.error('Failed to fetch tournament:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTournament();
    }, [player?.id]);

    // Countdown timer
    useEffect(() => {
        if (!tournamentData?.tournament?.ends_at) return;

        const interval = setInterval(() => {
            setCountdown(calculateTimeRemaining(tournamentData.tournament!.ends_at));
        }, 1000);

        // Initial set
        setCountdown(calculateTimeRemaining(tournamentData.tournament.ends_at));

        return () => clearInterval(interval);
    }, [tournamentData?.tournament?.ends_at]);

    // Handle registration
    const handleRegister = async () => {
        if (!player?.id || !tournamentData?.tournament?.id) return;

        setIsRegistering(true);
        haptic.medium();

        try {
            const { data, error } = await supabase.rpc('register_for_tournament' as any, {
                tournament_id_input: tournamentData.tournament.id,
                player_id_input: player.id
            });

            if (error) throw error;

            const response = data as { success: boolean; message?: string; error?: string };

            if (response.success) {
                haptic.success();
                toast({
                    title: '🏆 Registered!',
                    description: response.message || 'You are now in the tournament!',
                });

                // Refresh data
                const { data: newData } = await supabase.rpc('get_current_tournament' as any, {
                    player_id_input: player.id
                });
                setTournamentData(newData as TournamentData);

                // Navigate to leaderboard
                navigate('/ranks');
            } else {
                toast({
                    title: 'Registration Failed',
                    description: response.error || 'Could not register',
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            toast({
                title: 'Error',
                description: error?.message || 'Failed to register',
                variant: 'destructive',
            });
        } finally {
            setIsRegistering(false);
        }
    };

    // Don't render conditions
    if (isLoading) return null;
    if (!tournamentData?.has_tournament) return null;
    if (!tournamentData.tournament) return null;

    const { tournament, player: playerStatus } = tournamentData;

    // Hide if tournament ended
    if (tournament.is_ended) return null;

    // Hide if founders-only and not a founder
    if (tournament.eligibility === 'founders_only' && !playerStatus?.is_founder) {
        return null;
    }

    const isRegistered = playerStatus?.is_registered || false;
    const isStarted = tournament.is_started;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-4 my-2"
        >
            {/* Outer glow container */}
            <div className="relative">
                {/* Subtle pulsing glow */}
                <motion.div
                    className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 rounded-lg blur-sm"
                    animate={{ opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="relative overflow-hidden rounded-lg border border-amber-400/60 bg-gradient-to-br from-amber-950/95 via-amber-900/90 to-amber-950/95">
                    {/* Shimmer effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent skew-x-12"
                        animate={{ x: ['-200%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                    />

                    {/* Art Deco corners - smaller */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-amber-400/50" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-amber-400/50" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-amber-400/50" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-amber-400/50" />

                    <div className="relative z-10 p-3">
                        {/* Header Row - Title + Prize inline */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                <h3 className="font-cinzel font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200">
                                    {tournament.name}
                                </h3>
                            </div>
                            {/* Prize badge */}
                            <motion.div
                                className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-full border border-amber-400/40"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <span className="text-base font-bold text-amber-100">{tournament.prize_amount}</span>
                                <img
                                    src="/images/icons/ton_symbol.png"
                                    alt="TON"
                                    className="w-4 h-4 object-contain"
                                />
                            </motion.div>
                        </div>

                        {/* Subtitle + Countdown Row */}
                        <div className="flex items-center justify-between mb-2 text-[10px]">
                            <span className="text-amber-100/80">Highest Net Worth Wins</span>
                            <div className="flex items-center gap-1 text-amber-300/90">
                                <Clock className="w-3 h-3" />
                                <span className="font-mono">
                                    {formatNumber(countdown.days)}d {formatNumber(countdown.hours)}h {formatNumber(countdown.minutes)}m
                                </span>
                            </div>
                        </div>

                        {/* Stats Row - Compact */}
                        <div className="flex items-center justify-center gap-3 text-[10px] text-amber-300/70 mb-2">
                            <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{tournament.participant_count} Entrants</span>
                            </div>
                            <span>•</span>
                            <span>Skill-Based Only</span>
                        </div>

                        {/* CTA Button */}
                        <AnimatePresence mode="wait">
                            {isRegistered ? (
                                <motion.div
                                    key="registered"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2"
                                >
                                    {playerStatus?.current_rank && (
                                        <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-500/10 rounded border border-amber-500/30">
                                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                                            <span className="text-xs text-amber-200">
                                                Rank <span className="font-bold">#{playerStatus.current_rank}</span>
                                            </span>
                                        </div>
                                    )}
                                    <Link to="/ranks" className="flex-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-8 text-xs border-amber-400/50 text-amber-200 hover:bg-amber-500/20"
                                        >
                                            Leaderboard
                                            <ChevronRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </Link>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="register"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <motion.div
                                        animate={{
                                            boxShadow: ['0 0 10px rgba(251,191,36,0.2)', '0 0 20px rgba(251,191,36,0.4)', '0 0 10px rgba(251,191,36,0.2)'],
                                        }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="rounded overflow-hidden"
                                    >
                                        <Button
                                            onClick={handleRegister}
                                            disabled={isRegistering}
                                            size="sm"
                                            className="w-full h-9 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 text-black font-cinzel font-bold tracking-wider text-xs"
                                        >
                                            {isRegistering ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                                    Registering...
                                                </>
                                            ) : (
                                                '🏆 CLAIM YOUR SPOT'
                                            )}
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

