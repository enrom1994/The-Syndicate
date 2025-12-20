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
            <div className="relative overflow-hidden rounded-lg border-2 border-amber-500/60 bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-amber-900/40 shadow-lg">
                {/* Animated shimmer effect */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />

                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400/50" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400/50" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400/50" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400/50" />

                <div className="relative z-10 p-4">
                    {/* Header */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <h3 className="font-cinzel font-bold text-lg text-amber-200 tracking-wider">
                            {tournament.name}
                        </h3>
                        <Trophy className="w-5 h-5 text-amber-400" />
                    </div>

                    {/* Subheadline */}
                    <p className="text-center text-sm text-amber-100/90 mb-4">
                        Highest Net Worth Wins
                    </p>

                    {/* Prize Display */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-xs text-amber-300/80 uppercase tracking-wide">Prize:</span>
                        <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/40">
                            <span className="text-lg font-bold text-amber-100">{tournament.prize_amount}</span>
                            <img
                                src="/images/icons/ton_symbol.png"
                                alt="TON"
                                className="w-5 h-5 object-contain"
                            />
                        </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="flex items-center justify-center gap-1 mb-4">
                        <Clock className="w-4 h-4 text-amber-400/80" />
                        <span className="text-xs text-amber-300/80 mr-1">
                            {isStarted ? 'Ends in:' : 'Starts in:'}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-sm text-amber-100">
                            <span className="bg-amber-900/50 px-1.5 py-0.5 rounded">{formatNumber(countdown.days)}</span>
                            <span className="text-amber-400/60">d</span>
                            <span className="bg-amber-900/50 px-1.5 py-0.5 rounded">{formatNumber(countdown.hours)}</span>
                            <span className="text-amber-400/60">h</span>
                            <span className="bg-amber-900/50 px-1.5 py-0.5 rounded">{formatNumber(countdown.minutes)}</span>
                            <span className="text-amber-400/60">m</span>
                            <span className="bg-amber-900/50 px-1.5 py-0.5 rounded text-xs">{formatNumber(countdown.seconds)}</span>
                            <span className="text-amber-400/60 text-xs">s</span>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-center gap-4 text-xs text-amber-300/70 mb-4">
                        <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{tournament.participant_count} Entrants</span>
                        </div>
                        <span className="text-amber-500/40">•</span>
                        <span>Skill-Based Only</span>
                    </div>

                    {/* Player Status / CTA */}
                    <AnimatePresence mode="wait">
                        {isRegistered ? (
                            <motion.div
                                key="registered"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-2"
                            >
                                {/* Rank display */}
                                {playerStatus?.current_rank && (
                                    <div className="flex items-center justify-center gap-2 py-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                                        <Crown className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm text-amber-200">
                                            Your Rank: <span className="font-bold">#{playerStatus.current_rank}</span>
                                        </span>
                                    </div>
                                )}

                                {/* View Leaderboard link */}
                                <Link to="/ranks" className="block">
                                    <Button
                                        variant="outline"
                                        className="w-full border-amber-500/50 text-amber-200 hover:bg-amber-500/20 hover:border-amber-500"
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
                                <Button
                                    onClick={handleRegister}
                                    disabled={isRegistering}
                                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-cinzel font-bold tracking-wider py-3 shadow-lg"
                                >
                                    {isRegistering ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Registering...
                                        </>
                                    ) : (
                                        'CLAIM YOUR SPOT'
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Flavor text */}
                    <p className="text-center text-[10px] text-amber-400/50 italic mt-3">
                        Only the sharpest minds rise to the top.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
