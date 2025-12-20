import { motion } from 'framer-motion';
import { Trophy, Crown, DollarSign, Swords, Star, Medal, Loader2, Users } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
    rank: number;
    player_id: string;
    username: string;
    value: number;
    has_made_man?: boolean;
}

interface LeaderboardEntryProps {
    rank: number;
    name: string;
    family?: string;
    value: string;
    isYou?: boolean;
    delay?: number;
    hasMadeMan?: boolean;
    isFamily?: boolean;
}

const LeaderboardEntryComponent = ({ rank, name, family, value, isYou, delay = 0, hasMadeMan, isFamily }: LeaderboardEntryProps) => {
    const getRankIcon = () => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`flex items-center gap-3 p-3 rounded-sm ${isYou
                ? 'bg-primary/10 border border-primary/30'
                : rank <= 3
                    ? 'bg-gradient-to-r from-muted/40 to-transparent'
                    : 'bg-muted/20'
                }`}
        >
            <div className="w-8 h-8 flex items-center justify-center">
                {getRankIcon()}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-1.5">
                    <p className={`font-cinzel font-semibold text-sm ${isYou ? 'text-primary' : 'text-foreground'}`}>
                        {name}
                    </p>
                    {/* Made Man Badge */}
                    {hasMadeMan && !isFamily && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 border border-amber-300 shadow-lg shadow-amber-500/30" title="Made Man">
                            <svg className="w-2.5 h-2.5 text-amber-900" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" /></svg>
                        </span>
                    )}
                    {isYou && <span className="text-xs font-inter text-muted-foreground">(You)</span>}
                </div>
                {family && <p className="text-xs text-muted-foreground">{family}</p>}
                {isFamily && <p className="text-xs text-muted-foreground">Family</p>}
            </div>
            <p className="font-cinzel font-bold text-sm text-primary">{value}</p>
        </motion.div>
    );
};

const formatValue = (value: number, type: string): string => {
    if (type === 'networth' || type === 'families') {
        if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value.toLocaleString()}`;
    }
    if (type === 'wins') {
        return `${value.toLocaleString()} Wins`;
    }
    if (type === 'respect') {
        return value.toLocaleString();
    }
    return value.toLocaleString();
};

const RanksPage = () => {
    const [activeTab, setActiveTab] = useState('networth');
    const [leaderboardData, setLeaderboardData] = useState<Record<string, LeaderboardEntry[]>>({
        networth: [],
        wins: [],
        respect: [],
        families: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [playerRank, setPlayerRank] = useState<{ networth: number; respect: number; wins: number } | null>(null);
    const [seasonInfo, setSeasonInfo] = useState<{ name: string; days_remaining: number; prize_pool: string } | null>(null);

    const { player } = useAuth();

    const fetchLeaderboard = useCallback(async (type: string) => {
        try {
            const { data, error } = await supabase.rpc('get_leaderboard', {
                leaderboard_type: type,
                limit_count: 10,
            });

            if (error) {
                console.error(`Error fetching ${type} leaderboard:`, error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error(`Error fetching ${type} leaderboard:`, error);
            return [];
        }
    }, []);

    const calculatePlayerRank = useCallback(async () => {
        if (!player?.id) return;

        try {
            // Use RPC for accurate net worth ranking (includes banked_cash)
            const { data: rankData } = await supabase.rpc('get_player_rank' as any, {
                player_id_input: player.id
            });

            const rankResult = rankData as { rank: number; networth: number; total_players: number }[] | null;

            const { count: respectRank } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .gt('respect', player.respect || 0);

            const { count: winsRank } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .gt('total_attacks_won', player.total_attacks_won || 0);

            setPlayerRank({
                networth: rankResult?.[0]?.rank || 1,
                respect: (respectRank || 0) + 1,
                wins: (winsRank || 0) + 1,
            });
        } catch (error) {
            console.error('Error calculating player rank:', error);
        }
    }, [player]);

    useEffect(() => {
        const loadAllLeaderboards = async () => {
            setIsLoading(true);

            const [networth, wins, respect, families] = await Promise.all([
                fetchLeaderboard('networth'),
                fetchLeaderboard('wins'),
                fetchLeaderboard('respect'),
                fetchLeaderboard('families'),
            ]);

            setLeaderboardData({
                networth,
                wins,
                respect,
                families,
            });

            // Load season info
            try {
                const { data } = await supabase.rpc('get_current_season');
                if (data) {
                    const seasonData = data as any;
                    setSeasonInfo({
                        name: seasonData.name || 'Season 1',
                        days_remaining: seasonData.days_remaining || 0,
                        prize_pool: seasonData.prize_pool || '500 TON'
                    });
                }
            } catch (err) {
                // Season RPC might not exist, use defaults
                setSeasonInfo({
                    name: 'Season 1',
                    days_remaining: 14,
                    prize_pool: '500 TON'
                });
            }

            await calculatePlayerRank();
            setIsLoading(false);
        };

        loadAllLeaderboards();
    }, [fetchLeaderboard, calculatePlayerRank]);

    const getCurrentLeaderboard = () => {
        const data = leaderboardData[activeTab] || [];
        return data.map((entry) => ({
            rank: Number(entry.rank),
            name: entry.username || `Player ${entry.player_id.slice(0, 6)}`,
            value: formatValue(entry.value, activeTab),
            isYou: entry.player_id === player?.id,
            hasMadeMan: entry.has_made_man || false,
            isFamily: activeTab === 'families',
        }));
    };

    const getPlayerNetWorth = () => {
        if (!player) return 0;
        return player.cash + player.banked_cash;
    };

    return (
        <MainLayout>
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/warehouse.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <img src="/images/icons/fedora.png" alt="Leaderboard" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Leaderboard</h1>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-4 mb-6"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Your Rank</span>
                        <span className="font-cinzel font-bold text-2xl text-primary">
                            #{playerRank?.networth?.toLocaleString() ?? '---'}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground">Net Worth</p>
                            <p className="font-cinzel font-bold text-sm text-foreground">
                                {formatValue(getPlayerNetWorth(), 'networth')}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Respect</p>
                            <p className="font-cinzel font-bold text-sm text-foreground">
                                {player?.respect?.toLocaleString() ?? 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Wins</p>
                            <p className="text-[10px] text-muted-foreground/60">PvP Victories</p>
                            <p className="font-cinzel font-bold text-sm text-foreground">
                                {player?.total_attacks_won ?? 0}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="networth" className="font-cinzel text-[10px] p-2">
                            <DollarSign className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="wins" className="font-cinzel text-[10px] p-2">
                            <Swords className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="respect" className="font-cinzel text-[10px] p-2">
                            <Star className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="families" className="font-cinzel text-[10px] p-2">
                            <Users className="w-4 h-4" />
                        </TabsTrigger>
                    </TabsList>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <TabsContent value="networth" className="space-y-2 mt-0">
                                <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Top Net Worth</h3>
                                {getCurrentLeaderboard().length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-4">No players yet</p>
                                ) : (
                                    getCurrentLeaderboard().map((entry, index) => (
                                        <LeaderboardEntryComponent key={entry.rank + entry.name} {...entry} delay={0.05 * index} />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="wins" className="space-y-2 mt-0">
                                <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Most Wins</h3>
                                {leaderboardData.wins.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-4">No wins recorded yet</p>
                                ) : (
                                    leaderboardData.wins.map((entry, index) => (
                                        <LeaderboardEntryComponent
                                            key={entry.rank + entry.player_id}
                                            rank={Number(entry.rank)}
                                            name={entry.username || `Player ${entry.player_id.slice(0, 6)}`}
                                            value={formatValue(entry.value, 'wins')}
                                            isYou={entry.player_id === player?.id}
                                            hasMadeMan={entry.has_made_man}
                                            delay={0.05 * index}
                                        />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="respect" className="space-y-2 mt-0">
                                <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Highest Respect</h3>
                                {leaderboardData.respect.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-4">No respect earned yet</p>
                                ) : (
                                    leaderboardData.respect.map((entry, index) => (
                                        <LeaderboardEntryComponent
                                            key={entry.rank + entry.player_id}
                                            rank={Number(entry.rank)}
                                            name={entry.username || `Player ${entry.player_id.slice(0, 6)}`}
                                            value={formatValue(entry.value, 'respect')}
                                            isYou={entry.player_id === player?.id}
                                            hasMadeMan={entry.has_made_man}
                                            delay={0.05 * index}
                                        />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="families" className="space-y-2 mt-0">
                                <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Top Families</h3>
                                {leaderboardData.families.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-4">No families yet</p>
                                ) : (
                                    leaderboardData.families.map((entry, index) => (
                                        <LeaderboardEntryComponent
                                            key={entry.rank + entry.player_id}
                                            rank={Number(entry.rank)}
                                            name={entry.username}
                                            value={`${entry.value.toLocaleString()} Respect`}
                                            isFamily={true}
                                            delay={0.05 * index}
                                        />
                                    ))
                                )}
                            </TabsContent>
                        </>
                    )}
                </Tabs>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-6 noir-card p-4 text-center relative overflow-hidden"
                >
                    {/* Blurred placeholder overlay */}
                    <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10 flex items-center justify-center">
                        <p className="font-cinzel text-sm text-muted-foreground">Coming Soon</p>
                    </div>
                    <Trophy className="w-8 h-8 text-primary mx-auto mb-2 opacity-50" />
                    <h3 className="font-cinzel font-bold text-sm text-foreground opacity-50">Season Rewards</h3>
                    <p className="text-xs text-muted-foreground mt-1 opacity-50">Top 100 players receive TON prizes</p>
                    <p className="font-cinzel font-bold text-lg text-primary mt-2 opacity-50">🏆 Prize Pool TBD</p>
                </motion.div>
            </div>
        </MainLayout>
    );
};

export default RanksPage;
