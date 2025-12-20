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
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-4 my-3"
        >
            {/* Outer glow container */}
            <div className="relative">
                {/* Animated pulsing glow */}
                <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-yellow-400/40 to-amber-500/30 rounded-xl blur-md"
                    animate={{
                        opacity: [0.4, 0.7, 0.4],
                        scale: [1, 1.02, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="relative overflow-hidden rounded-lg border-2 border-amber-400/70 bg-gradient-to-br from-amber-950/90 via-amber-900/80 to-amber-950/90 shadow-2xl">
                    {/* Animated shimmer effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/15 to-transparent skew-x-12"
                        animate={{ x: ['-200%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                    />

                    {/* Sparkle particles */}
                    <motion.div
                        className="absolute top-4 right-8 w-1.5 h-1.5 bg-amber-300 rounded-full"
                        animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                        className="absolute top-8 left-12 w-1 h-1 bg-yellow-300 rounded-full"
                        animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    />
                    <motion.div
                        className="absolute bottom-12 right-16 w-1 h-1 bg-amber-200 rounded-full"
                        animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                    />

                    {/* Art Deco corner decorations */}
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-amber-400/60" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-amber-400/60" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-amber-400/60" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-amber-400/60" />

                    <div className="relative z-10 p-5">
                        {/* Header with animated trophies */}
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <motion.div
                                animate={{ rotate: [-5, 5, -5], y: [0, -2, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <Trophy className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                            </motion.div>
                            <h3 className="font-cinzel font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 tracking-widest drop-shadow-lg">
                                {tournament.name}
                            </h3>
                            <motion.div
                                animate={{ rotate: [5, -5, 5], y: [0, -2, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <Trophy className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                            </motion.div>
                        </div>

                        {/* Subheadline */}
                        <p className="text-center text-sm text-amber-100/90 mb-4 font-medium">
                            Highest Net Worth Wins
                        </p>

                        {/* DRAMATIC Prize Display */}
                        <motion.div
                            className="flex items-center justify-center gap-3 mb-5 py-3 px-4 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 rounded-lg border border-amber-400/30"
                            animate={{ boxShadow: ['0 0 20px rgba(251,191,36,0.1)', '0 0 30px rgba(251,191,36,0.3)', '0 0 20px rgba(251,191,36,0.1)'] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <span className="text-xs text-amber-300 uppercase tracking-widest font-semibold">Grand Prize:</span>
                            <div className="flex items-center gap-2">
                                <motion.span
                                    className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    {tournament.prize_amount}
                                </motion.span>
                                <motion.img
                                    src="/images/icons/ton_symbol.png"
                                    alt="TON"
                                    className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(56,178,254,0.6)]"
                                    animate={{ rotate: [0, 5, 0, -5, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                />
                            </div>
                        </motion.div>

                        {/* Countdown Timer */}
                        <div className="flex items-center justify-center gap-2 mb-4 bg-black/30 rounded-lg py-2 px-3">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-amber-300/90 font-medium">
                                {isStarted ? 'Ends in:' : 'Starts in:'}
                            </span>
                            <div className="flex items-center gap-1 font-mono text-sm">
                                <span className="bg-amber-800/60 px-2 py-1 rounded text-amber-100 font-bold">{formatNumber(countdown.days)}</span>
                                <span className="text-amber-400/70 text-xs">d</span>
                                <span className="bg-amber-800/60 px-2 py-1 rounded text-amber-100 font-bold">{formatNumber(countdown.hours)}</span>
                                <span className="text-amber-400/70 text-xs">h</span>
                                <span className="bg-amber-800/60 px-2 py-1 rounded text-amber-100 font-bold">{formatNumber(countdown.minutes)}</span>
                                <span className="text-amber-400/70 text-xs">m</span>
                                <span className="bg-amber-800/60 px-1.5 py-1 rounded text-amber-100 font-bold text-xs">{formatNumber(countdown.seconds)}</span>
                                <span className="text-amber-400/70 text-[10px]">s</span>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-center gap-4 text-xs text-amber-300/80 mb-4">
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span className="font-medium">{tournament.participant_count} Entrants</span>
                            </div>
                            <span className="text-amber-500/50">•</span>
                            <span className="font-medium">Skill-Based • No Random Winners</span>
                        </div>

                        {/* Player Status / CTA */}
                        <AnimatePresence mode="wait">
                            {isRegistered ? (
                                <motion.div
                                    key="registered"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-3"
                                >
                                    {/* Rank display */}
                                    {playerStatus?.current_rank && (
                                        <div className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 rounded-lg border border-amber-500/40">
                                            <Crown className="w-5 h-5 text-amber-400" />
                                            <span className="text-sm text-amber-200">
                                                Your Rank: <span className="font-bold text-lg text-amber-100">#{playerStatus.current_rank}</span>
                                            </span>
                                        </div>
                                    )}

                                    {/* View Leaderboard link */}
                                    <Link to="/ranks" className="block">
                                        <Button
                                            variant="outline"
                                            className="w-full border-amber-400/60 text-amber-200 hover:bg-amber-500/20 hover:border-amber-400 font-cinzel tracking-wide"
                                        >
                                            <span>View Leaderboard</span>
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </Link>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="register"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <motion.div
                                        animate={{
                                            boxShadow: [
                                                '0 0 20px rgba(251,191,36,0.3)',
                                                '0 0 35px rgba(251,191,36,0.5)',
                                                '0 0 20px rgba(251,191,36,0.3)',
                                            ],
                                        }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="rounded-lg overflow-hidden"
                                    >
                                        <Button
                                            onClick={handleRegister}
                                            disabled={isRegistering}
                                            className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 text-black font-cinzel font-bold tracking-widest py-4 text-base shadow-xl border-2 border-amber-300/50"
                                        >
                                            {isRegistering ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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

                        {/* Flavor text */}
                        <p className="text-center text-[10px] text-amber-400/60 italic mt-4">
                            Only the sharpest minds rise to the top.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

