import { motion } from 'framer-motion';
import { Trophy, Crown, DollarSign, MapPin, Skull, Star, Medal, Loader2 } from 'lucide-react';
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
}

interface LeaderboardEntryProps {
    rank: number;
    name: string;
    family?: string;
    value: string;
    isYou?: boolean;
    delay?: number;
}

const LeaderboardEntryComponent = ({ rank, name, family, value, isYou, delay = 0 }: LeaderboardEntryProps) => {
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
                <p className={`font-cinzel font-semibold text-sm ${isYou ? 'text-primary' : 'text-foreground'}`}>
                    {name} {isYou && <span className="text-xs font-inter">(You)</span>}
                </p>
                {family && <p className="text-xs text-muted-foreground">{family}</p>}
            </div>
            <p className="font-cinzel font-bold text-sm text-primary">{value}</p>
        </motion.div>
    );
};

const formatValue = (value: number, type: string): string => {
    if (type === 'networth') {
        if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value.toLocaleString()}`;
    }
    if (type === 'kills') {
        return `${value.toLocaleString()} Kills`;
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
        kills: [],
        respect: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [playerRank, setPlayerRank] = useState<{ networth: number; respect: number; kills: number } | null>(null);

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
            // Get player's net worth rank
            const netWorth = await supabase.rpc('calculate_net_worth', {
                player_id_input: player.id,
            });

            // Count players with higher values to estimate rank
            const { count: networthRank } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .gt('cash', player.cash);

            const { count: respectRank } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .gt('respect', player.respect);

            const { count: killsRank } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .gt('total_kills', player.total_kills);

            setPlayerRank({
                networth: (networthRank || 0) + 1,
                respect: (respectRank || 0) + 1,
                kills: (killsRank || 0) + 1,
            });
        } catch (error) {
            console.error('Error calculating player rank:', error);
        }
    }, [player]);

    useEffect(() => {
        const loadAllLeaderboards = async () => {
            setIsLoading(true);

            const [networth, kills, respect] = await Promise.all([
                fetchLeaderboard('networth'),
                fetchLeaderboard('kills'),
                fetchLeaderboard('respect'),
            ]);

            setLeaderboardData({
                networth,
                kills,
                respect,
            });

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
        }));
    };

    const getPlayerNetWorth = () => {
        if (!player) return 0;
        return player.cash + player.banked_cash;
    };

    // Territory is not implemented in DB yet - placeholder
    const territoryLeaders = [
        { rank: 1, name: 'The Gambino Family', value: '24 Zones' },
        { rank: 2, name: 'Chicago Outfit', value: '21 Zones' },
        { rank: 3, name: 'The Corleone Family', value: '18 Zones' },
        { rank: 4, name: 'Five Points Gang', value: '15 Zones' },
        { rank: 5, name: 'Purple Gang', value: '12 Zones' },
    ];

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
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Leaderboard</h1>
                        <p className="text-xs text-muted-foreground">Season 1 • 8 days remaining</p>
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
                            <p className="text-xs text-muted-foreground">Kills</p>
                            <p className="font-cinzel font-bold text-sm text-foreground">
                                {player?.total_kills ?? 0}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="networth" className="font-cinzel text-[10px] p-2">
                            <DollarSign className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="territory" className="font-cinzel text-[10px] p-2">
                            <MapPin className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="kills" className="font-cinzel text-[10px] p-2">
                            <Skull className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="respect" className="font-cinzel text-[10px] p-2">
                            <Star className="w-4 h-4" />
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

                            <TabsContent value="territory" className="space-y-2 mt-0">
                                <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Territory Control (Families)</h3>
                                {territoryLeaders.map((entry, index) => (
                                    <LeaderboardEntryComponent key={entry.rank + entry.name} {...entry} delay={0.05 * index} />
                                ))}
                            </TabsContent>

                            <TabsContent value="kills" className="space-y-2 mt-0">
                                <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Most Kills</h3>
                                {leaderboardData.kills.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-4">No kills recorded yet</p>
                                ) : (
                                    leaderboardData.kills.map((entry, index) => (
                                        <LeaderboardEntryComponent
                                            key={entry.rank + entry.player_id}
                                            rank={Number(entry.rank)}
                                            name={entry.username || `Player ${entry.player_id.slice(0, 6)}`}
                                            value={formatValue(entry.value, 'kills')}
                                            isYou={entry.player_id === player?.id}
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
                    className="mt-6 noir-card p-4 text-center"
                >
                    <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-cinzel font-bold text-sm text-foreground">Season Rewards</h3>
                    <p className="text-xs text-muted-foreground mt-1">Top 100 players receive TON prizes</p>
                    <p className="font-cinzel font-bold text-lg text-primary mt-2">🏆 500 TON Pool</p>
                </motion.div>
            </div>
        </MainLayout>
    );
};

export default RanksPage;
