import { motion } from 'framer-motion';
import { Target, Clock, User, Plus, Loader2, Skull, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { RankBadge, RankName, RANK_THRESHOLDS } from '@/components/RankBadge';

interface NPCBounty {
    id: string;
    type: 'npc';
    target_name: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    min_reward: number;
    max_reward: number;
    respect_reward: number;
    required_level: number;
    cooldown_hours: number;
    available_at: string | null;
    is_available: boolean;
}

interface PlayerBounty {
    id: string;
    type: 'player';
    target_player_id: string;
    target_name: string;
    target_level: number;
    bounty_amount: number;
    placed_by: string;
    placed_by_player_id?: string; // Added field
    expires_at: string;
    time_remaining: number;
}

interface MyBounty {
    id: string;
    target_player_id: string;
    target_name: string;
    bounty_amount: number;
    status: 'active' | 'claimed' | 'expired' | 'cancelled';
    expires_at: string;
    time_remaining: number;
    claimed_by: string | null;
}

interface SearchResult {
    id: string;
    username: string | null;
    first_name: string | null;
    level: number;
    respect: number;
    has_active_bounty: boolean;
}

const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    hard: 'text-red-400 bg-red-500/20',
};

const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const BountyBoardPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer } = useAuth();
    const [activeTab, setActiveTab] = useState('npc');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Data
    const [npcBounties, setNpcBounties] = useState<NPCBounty[]>([]);
    const [playerBounties, setPlayerBounties] = useState<PlayerBounty[]>([]);
    const [myBounties, setMyBounties] = useState<MyBounty[]>([]);

    // Place bounty form
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState<SearchResult | null>(null);
    const [bountyAmount, setBountyAmount] = useState('');
    const [bountyDuration, setBountyDuration] = useState(24);

    // Confirmation dialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        type: 'hunt_npc' | 'hunt_player' | 'place' | 'cancel';
        id?: string;
        name?: string;
        amount?: number;
    } | null>(null);

    // Load bounties
    useEffect(() => {
        if (player?.id) {
            loadBounties();
        }
    }, [player?.id]);

    const loadBounties = async () => {
        if (!player?.id) return;

        try {
            const { data, error } = await supabase.rpc('get_bounties', {
                requester_id: player.id
            });

            if (error) throw error;

            setNpcBounties(data.npc_bounties || []);
            setPlayerBounties(data.player_bounties || []);
            setMyBounties(data.my_bounties || []);
        } catch (error) {
            console.error('Failed to load bounties:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Search players
    const handleSearch = async () => {
        if (!player?.id || searchQuery.length < 2) return;

        setIsSearching(true);
        try {
            const { data, error } = await supabase.rpc('search_players_for_bounty', {
                searcher_id: player.id,
                search_query: searchQuery,
                result_limit: 10
            });

            if (error) throw error;
            setSearchResults(data || []);
        } catch (error: any) {
            console.error('Search failed:', error);
            toast({
                title: 'Search Error',
                description: error.message || 'Failed to search players',
                variant: 'destructive'
            });
        } finally {
            setIsSearching(false);
        }
    };

    // Hunt NPC bounty
    const handleHuntNPC = (bounty: NPCBounty) => {
        setPendingAction({
            type: 'hunt_npc',
            id: bounty.id,
            name: bounty.target_name
        });
        setConfirmOpen(true);
    };

    // Hunt player bounty
    const handleHuntPlayer = (bounty: PlayerBounty) => {
        setPendingAction({
            type: 'hunt_player',
            id: bounty.id,
            name: bounty.target_name,
            amount: bounty.bounty_amount
        });
        setConfirmOpen(true);
    };

    // Place bounty
    const handlePlaceBounty = () => {
        if (!selectedTarget) return;
        const amount = parseInt(bountyAmount);
        if (amount < 10000) {
            toast({ title: 'Error', description: 'Minimum bounty is $10,000', variant: 'destructive' });
            return;
        }
        setPendingAction({
            type: 'place',
            id: selectedTarget.id,
            name: selectedTarget.username || selectedTarget.first_name || 'Unknown',
            amount
        });
        setConfirmOpen(true);
    };

    // Cancel bounty
    const handleCancel = (bounty: MyBounty) => {
        setPendingAction({
            type: 'cancel',
            id: bounty.id,
            name: bounty.target_name,
            amount: bounty.bounty_amount
        });
        setConfirmOpen(true);
    };

    // Confirm action
    const confirmAction = async () => {
        if (!player?.id || !pendingAction) return;

        setConfirmOpen(false);
        setIsProcessing(true);

        try {
            if (pendingAction.type === 'hunt_npc') {
                const { data, error } = await supabase.rpc('claim_npc_bounty', {
                    hunter_id: player.id,
                    definition_id: pendingAction.id
                });

                if (error) throw error;

                if (data?.success) {
                    haptic.success();
                    toast({
                        title: 'Bounty Claimed!',
                        description: data.message,
                    });
                    await refetchPlayer();
                } else {
                    toast({
                        title: 'Failed',
                        description: data?.message || 'Could not claim bounty',
                        variant: 'destructive',
                    });
                }
            } else if (pendingAction.type === 'hunt_player') {
                const { data, error } = await supabase.rpc('claim_player_bounty', {
                    hunter_id: player.id,
                    bounty_id: pendingAction.id
                });

                if (error) throw error;

                if (data?.success) {
                    haptic.success();
                    toast({
                        title: data.won ? 'Target Eliminated!' : 'Hunt Failed',
                        description: data.message,
                        variant: data.won ? 'default' : 'destructive',
                    });
                    await refetchPlayer();
                } else {
                    toast({
                        title: 'Failed',
                        description: data?.message || 'Could not claim bounty',
                        variant: 'destructive',
                    });
                }
            } else if (pendingAction.type === 'place') {
                const { data, error } = await supabase.rpc('place_bounty', {
                    placer_id: player.id,
                    target_id: pendingAction.id,
                    amount: pendingAction.amount,
                    hours_duration: bountyDuration
                });

                if (error) throw error;

                if (data?.success) {
                    haptic.success();
                    toast({
                        title: 'Bounty Placed!',
                        description: data.message,
                    });
                    setSelectedTarget(null);
                    setBountyAmount('');
                    setSearchQuery('');
                    setSearchResults([]);
                    await refetchPlayer();
                } else {
                    toast({
                        title: 'Failed',
                        description: data?.message || 'Could not place bounty',
                        variant: 'destructive',
                    });
                }
            } else if (pendingAction.type === 'cancel') {
                const { data, error } = await supabase.rpc('cancel_bounty', {
                    canceller_id: player.id,
                    bounty_id: pendingAction.id
                });

                if (error) throw error;

                if (data?.success) {
                    haptic.success();
                    toast({
                        title: 'Bounty Cancelled',
                        description: data.message,
                    });
                    await refetchPlayer();
                } else {
                    toast({
                        title: 'Failed',
                        description: data?.message || 'Could not cancel bounty',
                        variant: 'destructive',
                    });
                }
            }

            await loadBounties();
        } catch (error) {
            console.error('Action failed:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
            setPendingAction(null);
        }
    };

    const durationOptions = [3, 6, 12, 24, 48];

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            {/* Background */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/attack.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <img src="/images/icons/bounty.png" alt="Bounty Board" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Bounty Board</h1>
                        <p className="text-xs text-muted-foreground">Hunt targets or place bounties</p>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="npc" className="font-cinzel text-[10px]">Contracts</TabsTrigger>
                        <TabsTrigger value="players" className="font-cinzel text-[10px]">Player Hits</TabsTrigger>
                        <TabsTrigger value="mine" className="font-cinzel text-[10px]">My Bounties</TabsTrigger>
                        <TabsTrigger value="place" className="font-cinzel text-[10px]">Place</TabsTrigger>
                    </TabsList>

                    {/* NPC Bounties Tab */}
                    <TabsContent value="npc" className="space-y-2 mt-0">
                        {npcBounties.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No contracts available</p>
                        ) : (
                            npcBounties.map((bounty, index) => (
                                <motion.div
                                    key={bounty.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`noir-card p-4 ${!bounty.is_available ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                            <Skull className="w-6 h-6 text-destructive" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-cinzel font-semibold text-sm text-foreground">{bounty.target_name}</h3>
                                                <span className={`px-1.5 py-0.5 text-[10px] rounded-sm ${difficultyColors[bounty.difficulty]}`}>
                                                    {bounty.difficulty.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{bounty.description}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                {(() => {
                                                    const getRequiredRank = (): RankName => {
                                                        if (bounty.required_level >= 30) return 'Boss';
                                                        if (bounty.required_level >= 15) return 'Underboss';
                                                        if (bounty.required_level >= 8) return 'Caporegime';
                                                        if (bounty.required_level >= 5) return 'Soldier';
                                                        if (bounty.required_level >= 3) return 'Enforcer';
                                                        return 'Street Thug';
                                                    };
                                                    const requiredRank = getRequiredRank();
                                                    return requiredRank !== 'Street Thug' ? (
                                                        <span className="flex items-center gap-1">
                                                            <RankBadge rank={requiredRank} size="sm" />
                                                            {requiredRank}+
                                                        </span>
                                                    ) : null;
                                                })()}
                                                <span>+{bounty.respect_reward} Respect</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-cinzel font-bold text-sm text-primary flex items-center gap-1">
                                                <GameIcon type="cash" className="w-4 h-4" />
                                                {bounty.min_reward.toLocaleString()}-{bounty.max_reward.toLocaleString()}
                                            </p>
                                            {bounty.is_available ? (
                                                <Button
                                                    size="sm"
                                                    className="btn-gold text-[10px] mt-1"
                                                    onClick={() => handleHuntNPC(bounty)}
                                                    disabled={isProcessing || (player?.respect || 0) < RANK_THRESHOLDS[(() => {
                                                        if (bounty.required_level >= 30) return 'Boss';
                                                        if (bounty.required_level >= 15) return 'Underboss';
                                                        if (bounty.required_level >= 8) return 'Caporegime';
                                                        if (bounty.required_level >= 5) return 'Soldier';
                                                        if (bounty.required_level >= 3) return 'Enforcer';
                                                        return 'Street Thug';
                                                    })() as RankName]}
                                                >
                                                    Hunt
                                                </Button>
                                            ) : (
                                                <p className="text-[10px] text-muted-foreground mt-1">Cooldown</p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>

                    {/* Player Bounties Tab */}
                    <TabsContent value="players" className="space-y-2 mt-0">
                        {playerBounties.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No active player bounties</p>
                        ) : (
                            playerBounties.map((bounty, index) => (
                                <motion.div
                                    key={bounty.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="noir-card p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                            <User className="w-6 h-6 text-red-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-cinzel font-semibold text-sm text-foreground">{bounty.target_name}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span>Lvl {bounty.target_level}</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTimeRemaining(bounty.time_remaining)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">Posted by: {bounty.placed_by}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-cinzel font-bold text-lg text-primary flex items-center gap-1">
                                                <GameIcon type="cash" className="w-5 h-5" />
                                                {bounty.bounty_amount.toLocaleString()}
                                            </p>
                                            <Button
                                                size="sm"
                                                className="btn-gold text-[10px] mt-1"
                                                onClick={() => handleHuntPlayer(bounty)}
                                                disabled={isProcessing || bounty.placed_by_player_id === player?.id}
                                            >
                                                {bounty.placed_by_player_id === player?.id ? 'Yours' : 'Hunt'}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>

                    {/* My Bounties Tab */}
                    <TabsContent value="mine" className="space-y-2 mt-0">
                        {myBounties.length === 0 ? (
                            <div className="text-center py-12">
                                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                                <p className="text-sm text-muted-foreground">No bounties placed</p>
                            </div>
                        ) : (
                            myBounties.map((bounty, index) => (
                                <motion.div
                                    key={bounty.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`noir-card p-4 ${bounty.status === 'claimed' ? 'border-l-2 border-green-500' : bounty.status !== 'active' ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-cinzel font-semibold text-sm text-foreground">{bounty.target_name}</h3>
                                            <div className="flex items-center gap-2 mt-1 text-xs">
                                                <span className="text-primary font-bold">${bounty.bounty_amount.toLocaleString()}</span>
                                                {bounty.status === 'active' && (
                                                    <span className="text-muted-foreground">• {formatTimeRemaining(bounty.time_remaining)}</span>
                                                )}
                                            </div>
                                            {bounty.claimed_by && (
                                                <p className="text-[10px] text-green-400 mt-1">Claimed by: {bounty.claimed_by}</p>
                                            )}
                                        </div>
                                        {bounty.status === 'active' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => handleCancel(bounty)}
                                                disabled={isProcessing}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        {bounty.status === 'claimed' && (
                                            <span className="text-green-400 text-xs font-bold">CLAIMED</span>
                                        )}
                                        {bounty.status === 'expired' && (
                                            <span className="text-muted-foreground text-xs">EXPIRED</span>
                                        )}
                                        {bounty.status === 'cancelled' && (
                                            <span className="text-muted-foreground text-xs">CANCELLED</span>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </TabsContent>

                    {/* Place Bounty Tab */}
                    <TabsContent value="place" className="mt-0">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="noir-card p-4"
                        >
                            <h3 className="font-cinzel font-semibold text-sm text-foreground mb-4">Place a Bounty</h3>

                            {/* Cost info */}
                            <div className="bg-muted/20 p-3 rounded-sm mb-4 text-xs">
                                <div className="flex items-center gap-2 text-primary">
                                    <img src="/images/icons/diamond.png" alt="diamonds" className="w-5 h-5" />
                                    <span>Costs 150 Diamonds to place a bounty</span>
                                </div>
                                <p className="text-muted-foreground mt-1">Max 2 active bounties. 50% refund on cancellation.</p>
                            </div>

                            {/* Search for target */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Search Player</label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Enter player name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-muted/30 border-border/50"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={handleSearch}
                                            disabled={searchQuery.length < 2 || isSearching}
                                        >
                                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && !selectedTarget && (
                                    <div className="bg-muted/20 rounded-sm max-h-40 overflow-y-auto">
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => setSelectedTarget(result)}
                                                disabled={result.has_active_bounty}
                                                className={`w-full p-2 text-left border-b border-border/20 last:border-0 hover:bg-muted/30 ${result.has_active_bounty ? 'opacity-50' : ''}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm">{result.username || result.first_name}</span>
                                                    <span className="text-xs text-muted-foreground">Lvl {result.level}</span>
                                                </div>
                                                {result.has_active_bounty && (
                                                    <span className="text-[10px] text-yellow-400">Already has bounty</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Selected Target */}
                                {selectedTarget && (
                                    <div className="bg-primary/10 border border-primary/30 p-3 rounded-sm">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-semibold">{selectedTarget.username || selectedTarget.first_name}</p>
                                                <p className="text-xs text-muted-foreground">Level {selectedTarget.level}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedTarget(null)}
                                            >
                                                Change
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Bounty Amount */}
                                {selectedTarget && (
                                    <>
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block">Bounty Amount (min $10,000)</label>
                                            <Input
                                                type="number"
                                                placeholder="10000"
                                                value={bountyAmount}
                                                onChange={(e) => setBountyAmount(e.target.value)}
                                                className="bg-muted/30 border-border/50"
                                                min={10000}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {durationOptions.map((hours) => (
                                                    <Button
                                                        key={hours}
                                                        size="sm"
                                                        variant={bountyDuration === hours ? 'default' : 'outline'}
                                                        className={bountyDuration === hours ? 'btn-gold' : ''}
                                                        onClick={() => setBountyDuration(hours)}
                                                    >
                                                        {hours}h
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full btn-gold"
                                            onClick={handlePlaceBounty}
                                            disabled={!bountyAmount || parseInt(bountyAmount) < 10000 || isProcessing}
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Place Bounty (150
                                                    <img src="/images/icons/diamond.png" alt="diamonds" className="w-4 h-4 mx-1" />
                                                    )
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={
                    pendingAction?.type === 'hunt_npc' ? 'Hunt Contract?' :
                        pendingAction?.type === 'hunt_player' ? 'Hunt Target?' :
                            pendingAction?.type === 'place' ? 'Place Bounty?' :
                                'Cancel Bounty?'
                }
                description={
                    pendingAction?.type === 'hunt_npc' ? `Hunt ${pendingAction.name}? This costs 5 stamina.` :
                        pendingAction?.type === 'hunt_player' ? `Hunt ${pendingAction.name} for $${pendingAction.amount?.toLocaleString()}? This costs 10 stamina.` :
                            pendingAction?.type === 'place' ? `Place $${pendingAction.amount?.toLocaleString()} bounty on ${pendingAction.name} for ${bountyDuration}h? Cost: 150 Diamonds + bounty amount` :
                                `Cancel bounty on ${pendingAction?.name}? You'll receive 50% refund ($${((pendingAction?.amount || 0) / 2).toLocaleString()}).`
                }
                onConfirm={confirmAction}
                confirmText={
                    pendingAction?.type === 'hunt_npc' || pendingAction?.type === 'hunt_player' ? 'Hunt' :
                        pendingAction?.type === 'place' ? 'Place' :
                            'Cancel Bounty'
                }
                variant={pendingAction?.type === 'cancel' ? 'destructive' : 'default'}
            />
        </MainLayout>
    );
};

export default BountyBoardPage;
