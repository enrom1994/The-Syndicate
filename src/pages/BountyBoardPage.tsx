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

// Import extracted bounty components and types
import {
    NPCBounty,
    PlayerBounty,
    MyBounty,
    SearchResult,
    DIFFICULTY_COLORS,
    formatTimeRemaining,
    NPCBountyCard,
    PlayerBountyCard,
    MyBountyCard,
} from '@/components/bounty';

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
            const { data: rawData, error } = await supabase.rpc('get_bounties', {
                requester_id: player.id
            });

            if (error) throw error;

            const data = rawData as unknown as { npc_bounties: NPCBounty[], player_bounties: PlayerBounty[], my_bounties: MyBounty[] };
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
            setSearchResults(data as unknown as SearchResult[] || []);
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
    const handleCancelBounty = (bounty: string | MyBounty) => {
        const bId = typeof bounty === 'string' ? bounty : bounty.id;
        const targetBounty = myBounties.find(b => b.id === bId);
        if (!targetBounty) return;
        setPendingAction({
            type: 'cancel',
            id: targetBounty.id,
            name: targetBounty.target_name,
            amount: targetBounty.bounty_amount
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

                const response = data as unknown as { success: boolean; message: string };

                if (response?.success) {
                    haptic.success();
                    toast({
                        title: 'Bounty Claimed!',
                        description: response.message,
                    });
                    await refetchPlayer();
                } else {
                    toast({
                        title: 'Failed',
                        description: response?.message || 'Could not claim bounty',
                        variant: 'destructive',
                    });
                }
            } else if (pendingAction.type === 'hunt_player') {
                const { data, error } = await supabase.rpc('claim_player_bounty', {
                    hunter_id: player.id,
                    bounty_id: pendingAction.id
                });

                if (error) throw error;

                const response = data as unknown as { success: boolean; message: string; won?: boolean };

                if (response?.success) {
                    haptic.success();
                    toast({
                        title: response.won ? 'Target Eliminated!' : 'Hunt Failed',
                        description: response.message,
                        variant: response.won ? 'default' : 'destructive',
                    });
                    await refetchPlayer();
                } else {
                    toast({
                        title: 'Failed',
                        description: response?.message || 'Could not claim bounty',
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

                const response = data as unknown as { success: boolean; message: string };

                if (response?.success) {
                    haptic.success();
                    toast({
                        title: 'Bounty Placed!',
                        description: response.message,
                    });
                    setSelectedTarget(null);
                    setBountyAmount('');
                    setSearchQuery('');
                    setSearchResults([]);
                    await refetchPlayer();
                } else {
                    toast({
                        title: 'Failed',
                        description: response?.message || 'Could not place bounty',
                        variant: 'destructive',
                    });
                }
            } else if (pendingAction.type === 'cancel') {
                const { data, error } = await supabase.rpc('cancel_bounty', {
                    canceller_id: player.id,
                    bounty_id: pendingAction.id
                });

                if (error) throw error;

                const response = data as unknown as { success: boolean; message: string };

                if (response?.success) {
                    haptic.success();
                    toast({
                        title: 'Bounty Cancelled',
                        description: response.message,
                    });
                    await refetchPlayer();
                } else {
                    toast({
                        title: 'Failed',
                        description: response?.message || 'Could not cancel bounty',
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

                    <TabsContent value="npc" className="space-y-2 mt-0">
                        {npcBounties.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No contracts available</p>
                        ) : (
                            npcBounties.map((bounty, index) => (
                                <NPCBountyCard
                                    key={bounty.id}
                                    bounty={bounty}
                                    index={index}
                                    isProcessing={isProcessing}
                                    playerRespect={player?.respect || 0}
                                    onHunt={handleHuntNPC}
                                />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="players" className="space-y-2 mt-0">
                        {playerBounties.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No active player bounties</p>
                        ) : (
                            playerBounties.map((bounty, index) => (
                                <PlayerBountyCard
                                    key={bounty.id}
                                    bounty={bounty}
                                    index={index}
                                    isProcessing={isProcessing}
                                    onHunt={handleHuntPlayer}
                                />
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
                                <MyBountyCard
                                    key={bounty.id}
                                    bounty={bounty}
                                    index={index}
                                    isProcessing={isProcessing}
                                    onCancel={() => handleCancelBounty(bounty.id)}
                                />
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
