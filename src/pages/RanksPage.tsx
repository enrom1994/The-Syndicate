import { motion } from 'framer-motion';
import { Trophy, Crown, DollarSign, MapPin, Skull, Star, Medal } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeaderboardEntryProps {
    rank: number;
    name: string;
    family?: string;
    value: string;
    isYou?: boolean;
    delay?: number;
}

const LeaderboardEntry = ({ rank, name, family, value, isYou, delay = 0 }: LeaderboardEntryProps) => {
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

const RanksPage = () => {
    const [activeTab, setActiveTab] = useState('networth');

    const netWorthLeaders = [
        { rank: 1, name: 'Don Corleone', family: 'The Corleone Family', value: '$482M' },
        { rank: 2, name: 'Al Capone', family: 'Chicago Outfit', value: '$356M' },
        { rank: 3, name: 'Lucky Luciano', family: 'Commission', value: '$298M' },
        { rank: 4, name: 'Meyer Lansky', family: 'The Syndicate', value: '$245M' },
        { rank: 5, name: 'Bugsy Siegel', family: 'Las Vegas', value: '$198M' },
        { rank: 1247, name: 'Michael', family: 'The Corleone Family', value: '$12.5M', isYou: true },
    ];

    const territoryLeaders = [
        { rank: 1, name: 'The Gambino Family', value: '24 Zones' },
        { rank: 2, name: 'Chicago Outfit', value: '21 Zones' },
        { rank: 3, name: 'The Corleone Family', value: '18 Zones' },
        { rank: 4, name: 'Five Points Gang', value: '15 Zones' },
        { rank: 5, name: 'Purple Gang', value: '12 Zones' },
    ];

    const killLeaders = [
        { rank: 1, name: 'Mad Dog Coll', family: 'Independent', value: '847 Kills' },
        { rank: 2, name: 'Albert Anastasia', family: 'Murder Inc.', value: '723 Kills' },
        { rank: 3, name: 'Lepke Buchalter', family: 'Murder Inc.', value: '654 Kills' },
        { rank: 4, name: 'Tony Accardo', family: 'Chicago Outfit', value: '532 Kills' },
        { rank: 5, name: 'Frank Nitti', family: 'Chicago Outfit', value: '489 Kills' },
    ];

    const respectLeaders = [
        { rank: 1, name: 'Don Corleone', family: 'The Corleone Family', value: '98,542' },
        { rank: 2, name: 'Carlo Gambino', family: 'The Gambino Family', value: '87,231' },
        { rank: 3, name: 'Frank Costello', family: 'The Luciano Family', value: '76,892' },
        { rank: 4, name: 'Joe Bonanno', family: 'The Bonanno Family', value: '65,423' },
        { rank: 5, name: 'Tommy Lucchese', family: 'The Lucchese Family', value: '54,321' },
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
                        <span className="font-cinzel font-bold text-2xl text-primary">#1,247</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground">Net Worth</p>
                            <p className="font-cinzel font-bold text-sm text-foreground">$12.5M</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Respect</p>
                            <p className="font-cinzel font-bold text-sm text-foreground">2,847</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Kills</p>
                            <p className="font-cinzel font-bold text-sm text-foreground">42</p>
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

                    <TabsContent value="networth" className="space-y-2 mt-0">
                        <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Top Net Worth</h3>
                        {netWorthLeaders.map((entry, index) => (
                            <LeaderboardEntry key={entry.rank + entry.name} {...entry} delay={0.05 * index} />
                        ))}
                    </TabsContent>

                    <TabsContent value="territory" className="space-y-2 mt-0">
                        <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Territory Control (Families)</h3>
                        {territoryLeaders.map((entry, index) => (
                            <LeaderboardEntry key={entry.rank + entry.name} {...entry} delay={0.05 * index} />
                        ))}
                    </TabsContent>

                    <TabsContent value="kills" className="space-y-2 mt-0">
                        <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Most Kills</h3>
                        {killLeaders.map((entry, index) => (
                            <LeaderboardEntry key={entry.rank + entry.name} {...entry} delay={0.05 * index} />
                        ))}
                    </TabsContent>

                    <TabsContent value="respect" className="space-y-2 mt-0">
                        <h3 className="font-cinzel text-xs text-muted-foreground mb-2">Highest Respect</h3>
                        {respectLeaders.map((entry, index) => (
                            <LeaderboardEntry key={entry.rank + entry.name} {...entry} delay={0.05 * index} />
                        ))}
                    </TabsContent>
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
