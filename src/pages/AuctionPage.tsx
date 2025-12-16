import { motion } from 'framer-motion';
import { Gavel, Clock, Plus, DollarSign, Diamond, Loader2, Package, Flame, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/hooks/useGameStore';

interface AuctionListing {
    id: string;
    seller_id: string;
    seller_name: string;
    item_id: string;
    item_name: string;
    item_description: string;
    quantity: number;
    currency: 'cash' | 'diamonds';
    starting_bid: number;
    current_bid: number | null;
    buy_now_price: number;
    current_bidder_id: string | null;
    expires_at: string;
    created_at: string;
    is_my_listing: boolean;
    is_my_bid: boolean;
}

interface ContrabandItem {
    id: string;
    item_id: string;
    name: string;
    quantity: number;
}

interface RecentSale {
    item_name: string;
    quantity: number;
    sale_price: number;
    currency: 'cash' | 'diamonds';
    sold_at: string;
    seller_name: string;
}

const AuctionPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer } = useAuth();
    const { inventory, loadInventory } = useGameStore();

    const [activeTab, setActiveTab] = useState('browse');
    const [listings, setListings] = useState<AuctionListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Create listing dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ContrabandItem | null>(null);
    const [listingQty, setListingQty] = useState(1);
    const [listingCurrency, setListingCurrency] = useState<'cash' | 'diamonds'>('cash');
    const [startingBid, setStartingBid] = useState('');
    const [buyNowPrice, setBuyNowPrice] = useState('');

    // Bid dialog
    const [bidOpen, setBidOpen] = useState(false);
    const [bidListing, setBidListing] = useState<AuctionListing | null>(null);
    const [bidAmount, setBidAmount] = useState('');

    // Recent sales
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

    // Get contraband from inventory
    const contraband = inventory.filter(i => i.category === 'contraband');

    const fetchListings = async () => {
        if (!player?.id) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_active_auctions', {
                viewer_id: player.id
            });
            if (error) throw error;
            setListings(data || []);
        } catch (error) {
            console.error('Failed to fetch auctions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
        fetchRecentSales();
        loadInventory();
    }, [player?.id]);

    const fetchRecentSales = async () => {
        try {
            const { data } = await supabase.rpc('get_recent_sales', { limit_count: 5 });
            if (data) setRecentSales(data);
        } catch (e) {
            console.error('Failed to fetch recent sales:', e);
        }
    };

    const handleCreateListing = async () => {
        if (!selectedItem || !startingBid || !buyNowPrice) return;
        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('create_auction_listing', {
                seller_id_input: player?.id,
                item_id_input: selectedItem.item_id,
                quantity_input: listingQty,
                currency_input: listingCurrency,
                starting_bid_input: parseInt(startingBid),
                buy_now_price_input: parseInt(buyNowPrice),
                duration_hours: 24
            });
            if (error) throw error;
            if (data?.success) {
                toast({ title: 'Listing Created!', description: `${listingQty}x ${selectedItem.name} listed for auction` });
                setCreateOpen(false);
                await fetchListings();
                await loadInventory();
                await refetchPlayer();
            } else {
                toast({ title: 'Failed', description: data?.message || 'Could not create listing', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Create listing error:', error);
            toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePlaceBid = async () => {
        if (!bidListing || !bidAmount) return;
        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('place_auction_bid', {
                bidder_id_input: player?.id,
                auction_id_input: bidListing.id,
                bid_amount_input: parseInt(bidAmount)
            });
            if (error) throw error;
            if (data?.success) {
                toast({ title: 'Bid Placed!', description: `Bid of ${bidAmount} ${bidListing.currency} placed` });
                setBidOpen(false);
                await fetchListings();
                await refetchPlayer();
            } else {
                toast({ title: 'Failed', description: data?.message || 'Could not place bid', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Bid error:', error);
            toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBuyNow = async (listing: AuctionListing) => {
        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('buy_auction_now', {
                buyer_id_input: player?.id,
                auction_id_input: listing.id
            });
            if (error) throw error;
            if (data?.success) {
                toast({ title: 'Purchase Complete!', description: `Bought ${listing.quantity}x ${listing.item_name}` });
                await fetchListings();
                await loadInventory();
                await refetchPlayer();
            } else {
                toast({ title: 'Failed', description: data?.message || 'Could not buy', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Buy now error:', error);
            toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancelListing = async (listing: AuctionListing) => {
        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('cancel_auction_listing', {
                seller_id_input: player?.id,
                auction_id_input: listing.id
            });
            if (error) throw error;
            if (data?.success) {
                toast({ title: 'Cancelled', description: 'Listing cancelled and item returned' });
                await fetchListings();
                await loadInventory();
            } else {
                toast({ title: 'Failed', description: data?.message || 'Cannot cancel', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Cancel error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTimeRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // Get item image from name - Auction is exclusively for contraband
    const getItemImage = (itemName: string) => {
        const slug = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `/images/contraband/${slug}.png`;
    };

    const myListings = listings.filter(l => l.is_my_listing);
    const myBids = listings.filter(l => l.is_my_bid && !l.is_my_listing);

    return (
        <MainLayout>
            <div className="py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <img src="/images/icons/auctionhouse.png" alt="Auction House" className="w-12 h-12 object-contain" />
                            <div>
                                <h1 className="font-cinzel text-xl font-bold text-foreground">Auction House</h1>
                                <p className="text-xs text-muted-foreground">Trade contraband with other players</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="btn-gold text-xs"
                            onClick={() => {
                                setSelectedItem(null);
                                setListingQty(1);
                                setStartingBid('');
                                setBuyNowPrice('');
                                setCreateOpen(true);
                            }}
                            disabled={contraband.length === 0}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            List Item
                        </Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                            <TabsTrigger value="browse" className="font-cinzel text-xs">Browse</TabsTrigger>
                            <TabsTrigger value="recent" className="font-cinzel text-xs">Sales</TabsTrigger>
                            <TabsTrigger value="my-listings" className="font-cinzel text-xs">My List</TabsTrigger>
                            <TabsTrigger value="my-bids" className="font-cinzel text-xs">My Bids</TabsTrigger>
                        </TabsList>

                        <TabsContent value="browse" className="space-y-3 mt-0">
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : listings.length === 0 ? (
                                <p className="text-center text-muted-foreground text-xs py-8">No active auctions</p>
                            ) : (
                                listings.filter(l => !l.is_my_listing).map(listing => (
                                    <motion.div
                                        key={listing.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="noir-card p-4"
                                    >
                                        <div className="flex gap-3 mb-3">
                                            <img
                                                src={getItemImage(listing.item_name)}
                                                alt={listing.item_name}
                                                className="w-12 h-12 rounded object-cover bg-muted"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }}
                                            />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-cinzel font-bold text-foreground">
                                                            {listing.quantity}x {listing.item_name}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground">by {listing.seller_name}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTimeRemaining(listing.expires_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                            <div>
                                                <p className="text-muted-foreground">Current Bid</p>
                                                <p className="font-bold flex items-center gap-1">
                                                    {listing.currency === 'diamonds' ? <Diamond className="w-3 h-3 text-blue-400" /> : <DollarSign className="w-3 h-3 text-green-400" />}
                                                    {listing.current_bid || listing.starting_bid}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Buy Now</p>
                                                <p className="font-bold flex items-center gap-1">
                                                    {listing.currency === 'diamonds' ? <Diamond className="w-3 h-3 text-blue-400" /> : <DollarSign className="w-3 h-3 text-green-400" />}
                                                    {listing.buy_now_price}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 text-xs"
                                                onClick={() => {
                                                    setBidListing(listing);
                                                    setBidAmount(String((listing.current_bid || listing.starting_bid) + 1));
                                                    setBidOpen(true);
                                                }}
                                            >
                                                Place Bid
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 btn-gold text-xs"
                                                onClick={() => handleBuyNow(listing)}
                                                disabled={isProcessing}
                                            >
                                                Buy Now
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </TabsContent>

                        {/* Recent Sales Tab */}
                        <TabsContent value="recent" className="space-y-3 mt-0">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                <span className="text-xs text-muted-foreground">Recent market activity</span>
                            </div>
                            {recentSales.length === 0 ? (
                                <p className="text-center text-muted-foreground text-xs py-8">No recent sales</p>
                            ) : (
                                recentSales.map((sale, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="noir-card p-3 flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="font-cinzel text-sm text-foreground">
                                                {sale.quantity}x {sale.item_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Sold by {sale.seller_name || 'Unknown'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm flex items-center gap-1 justify-end">
                                                {sale.currency === 'diamonds' ? (
                                                    <Diamond className="w-3 h-3 text-blue-400" />
                                                ) : (
                                                    <DollarSign className="w-3 h-3 text-green-400" />
                                                )}
                                                {sale.sale_price?.toLocaleString()}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="my-listings" className="space-y-3 mt-0">
                            {myListings.length === 0 ? (
                                <p className="text-center text-muted-foreground text-xs py-8">You have no active listings</p>
                            ) : (
                                myListings.map(listing => (
                                    <motion.div
                                        key={listing.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="noir-card p-4"
                                    >
                                        <div className="flex gap-3 mb-3">
                                            <img
                                                src={getItemImage(listing.item_name)}
                                                alt={listing.item_name}
                                                className="w-12 h-12 rounded object-cover bg-muted"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }}
                                            />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-cinzel font-bold text-foreground">
                                                        {listing.quantity}x {listing.item_name}
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTimeRemaining(listing.expires_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-3">
                                            {listing.current_bid ? (
                                                <span className="text-primary">Current bid: {listing.current_bid} {listing.currency}</span>
                                            ) : (
                                                <span>No bids yet</span>
                                            )}
                                        </div>
                                        {!listing.current_bidder_id && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="w-full text-xs"
                                                onClick={() => handleCancelListing(listing)}
                                                disabled={isProcessing}
                                            >
                                                Cancel Listing
                                            </Button>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="my-bids" className="space-y-3 mt-0">
                            {myBids.length === 0 ? (
                                <p className="text-center text-muted-foreground text-xs py-8">You have no active bids</p>
                            ) : (
                                myBids.map(listing => (
                                    <motion.div
                                        key={listing.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="noir-card p-4"
                                    >
                                        <div className="flex gap-3 mb-2">
                                            <img
                                                src={getItemImage(listing.item_name)}
                                                alt={listing.item_name}
                                                className="w-12 h-12 rounded object-cover bg-muted"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }}
                                            />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-cinzel font-bold text-foreground">
                                                        {listing.quantity}x {listing.item_name}
                                                    </h3>
                                                    <span className="text-xs text-primary font-bold">WINNING</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Your bid: {listing.current_bid} {listing.currency}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTimeRemaining(listing.expires_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>

            {/* Create Listing Dialog */}
            <AlertDialog open={createOpen} onOpenChange={setCreateOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground">Create Listing</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            10 💎 listing fee
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Item Selection */}
                        <div className="space-y-2">
                            <Label className="text-xs">Select Contraband</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {contraband.map(item => (
                                    <Button
                                        key={item.id}
                                        variant={selectedItem?.id === item.id ? "default" : "outline"}
                                        size="sm"
                                        className="text-xs justify-start"
                                        onClick={() => {
                                            setSelectedItem({ id: item.id, item_id: item.item_id, name: item.name, quantity: item.quantity });
                                            setListingQty(1);
                                        }}
                                    >
                                        <Package className="w-3 h-3 mr-1" />
                                        {item.name} ({item.quantity})
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {selectedItem && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-xs">Quantity (max {selectedItem.quantity})</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={selectedItem.quantity}
                                        value={listingQty}
                                        onChange={e => setListingQty(Math.min(parseInt(e.target.value) || 1, selectedItem.quantity))}
                                        className="h-9"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs">Currency</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={listingCurrency === 'cash' ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setListingCurrency('cash')}
                                        >
                                            <DollarSign className="w-3 h-3 mr-1" />
                                            Cash
                                        </Button>
                                        <Button
                                            variant={listingCurrency === 'diamonds' ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setListingCurrency('diamonds')}
                                        >
                                            <Diamond className="w-3 h-3 mr-1" />
                                            Diamonds
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Starting Bid</Label>
                                        <Input
                                            type="number"
                                            placeholder="100"
                                            value={startingBid}
                                            onChange={e => setStartingBid(e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Buy Now</Label>
                                        <Input
                                            type="number"
                                            placeholder="500"
                                            value={buyNowPrice}
                                            onChange={e => setBuyNowPrice(e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCreateListing}
                            className="btn-gold"
                            disabled={!selectedItem || !startingBid || !buyNowPrice || isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'List for 10 💎'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Place Bid Dialog */}
            <AlertDialog open={bidOpen} onOpenChange={setBidOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground">Place Bid</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            {bidListing?.quantity}x {bidListing?.item_name}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        <Label className="text-xs">Your Bid ({bidListing?.currency})</Label>
                        <Input
                            type="number"
                            value={bidAmount}
                            onChange={e => setBidAmount(e.target.value)}
                            className="h-9 mt-2"
                            min={(bidListing?.current_bid || bidListing?.starting_bid || 0) + 1}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            Minimum: {(bidListing?.current_bid || bidListing?.starting_bid || 0) + 1}
                        </p>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handlePlaceBid}
                            className="btn-gold"
                            disabled={isProcessing || !bidAmount}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Place Bid'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default AuctionPage;
