import { motion } from 'framer-motion';
import { DollarSign, Package, Loader2, TrendingUp, BadgeDollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
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

interface BlackMarketItem {
    item_id: string;
    item_name: string;
    rarity: string;
    quantity: number;
    market_price: number;
    total_value: number;
}

const BlackMarketPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer } = useAuth();
    const { inventory, loadInventory } = useGameStore();

    const [marketItems, setMarketItems] = useState<BlackMarketItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Sell dialog
    const [sellOpen, setSellOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<BlackMarketItem | null>(null);
    const [sellQty, setSellQty] = useState(1);

    const fetchMarketPrices = async () => {
        if (!player?.id) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_black_market_prices', {
                player_id_input: player.id
            });
            if (error) throw error;
            setMarketItems(data || []);
        } catch (error) {
            console.error('Failed to fetch market prices:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMarketPrices();
        loadInventory();
    }, [player?.id]);

    const handleSellToMarket = async () => {
        if (!selectedItem || sellQty <= 0) return;
        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('sell_to_black_market', {
                seller_id_input: player?.id,
                item_id_input: selectedItem.item_id,
                quantity_input: sellQty
            });
            if (error) throw error;
            if (data?.success) {
                toast({
                    title: '💰 Sold!',
                    description: `Sold ${sellQty}x ${selectedItem.item_name} for $${data.total_payout?.toLocaleString()}`
                });
                setSellOpen(false);
                await fetchMarketPrices();
                await loadInventory();
                await refetchPlayer();
            } else {
                toast({
                    title: 'Failed',
                    description: data?.message || 'Could not sell',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Sell error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const getItemImage = (itemName: string) => {
        const slug = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `/images/contraband/${slug}.png`;
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'text-gray-400';
            case 'uncommon': return 'text-green-400';
            case 'rare': return 'text-blue-400';
            case 'legendary': return 'text-primary';
            default: return 'text-muted-foreground';
        }
    };

    const getRarityRate = (rarity: string) => {
        switch (rarity) {
            case 'common': return '70%';
            case 'uncommon': return '75%';
            case 'rare': return '80%';
            default: return '75%';
        }
    };

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
                            <img src="/images/icons/blackmarket.png" alt="Black Market" className="w-12 h-12 object-contain" />
                            <div>
                                <h1 className="font-cinzel text-xl font-bold text-foreground">Black Market Sellers</h1>
                                <p className="text-xs text-muted-foreground">Instant cash for contraband</p>
                            </div>
                        </div>
                    </div>

                    {/* Market Info */}
                    <div className="noir-card p-4 mb-4 border-l-4 border-primary/50">
                        <div className="flex items-start gap-3">
                            <BadgeDollarSign className="w-5 h-5 text-primary mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-cinzel font-bold text-sm text-foreground mb-1">Market Rates</h3>
                                <p className="text-xs text-muted-foreground mb-2">
                                    The Black Market buys contraband instantly at rarity-scaled rates:
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center">
                                        <p className="text-gray-400">Common</p>
                                        <p className="font-bold text-foreground">70%</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-green-400">Uncommon</p>
                                        <p className="font-bold text-foreground">75%</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-blue-400">Rare</p>
                                        <p className="font-bold text-foreground">80%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contraband Inventory */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">
                                Your contraband ({marketItems.length} items, ${marketItems.reduce((sum, item) => sum + item.total_value, 0).toLocaleString()} total value)
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : marketItems.length === 0 ? (
                            <div className="text-center py-8">
                                <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                <p className="text-sm text-muted-foreground">No contraband to sell</p>
                                <p className="text-xs text-muted-foreground mt-1">Get contraband from Heists or PvP attacks</p>
                            </div>
                        ) : (
                            marketItems.map(item => (
                                <motion.div
                                    key={item.item_id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="noir-card p-4"
                                >
                                    <div className="flex gap-3 mb-3">
                                        <img
                                            src={getItemImage(item.item_name)}
                                            alt={item.item_name}
                                            className="w-12 h-12 rounded object-cover bg-muted"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png'; }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-cinzel font-bold text-foreground">
                                                        {item.quantity}x {item.item_name}
                                                    </h3>
                                                    <p className={`text-xs ${getRarityColor(item.rarity)} capitalize`}>
                                                        {item.rarity} • {getRarityRate(item.rarity)} rate
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                        <div>
                                            <p className="text-muted-foreground">Market Price</p>
                                            <p className="font-bold flex items-center gap-1 text-green-400">
                                                <DollarSign className="w-3 h-3" />
                                                {item.market_price.toLocaleString()} each
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Total Value</p>
                                            <p className="font-bold flex items-center gap-1 text-primary">
                                                <DollarSign className="w-3 h-3" />
                                                {item.total_value.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full btn-gold text-xs"
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setSellQty(item.quantity);
                                            setSellOpen(true);
                                        }}
                                        disabled={isProcessing}
                                    >
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        Sell to Market
                                    </Button>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Sell Confirmation Dialog */}
            <AlertDialog open={sellOpen} onOpenChange={setSellOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground">Sell to Black Market</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            {selectedItem?.item_name} • ${selectedItem?.market_price.toLocaleString()} each
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs">Quantity (max {selectedItem?.quantity})</Label>
                            <Input
                                type="number"
                                min={1}
                                max={selectedItem?.quantity || 1}
                                value={sellQty}
                                onChange={e => setSellQty(Math.min(parseInt(e.target.value) || 1, selectedItem?.quantity || 1))}
                                className="h-9"
                            />
                        </div>

                        <div className="noir-card p-3 bg-muted/20">
                            <p className="text-xs text-muted-foreground mb-1">You will receive:</p>
                            <p className="font-bold text-lg flex items-center gap-1 text-green-400">
                                <DollarSign className="w-5 h-5" />
                                {((selectedItem?.market_price || 0) * sellQty).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSellToMarket}
                            className="btn-gold"
                            disabled={isProcessing || sellQty <= 0}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sell Now'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default BlackMarketPage;
