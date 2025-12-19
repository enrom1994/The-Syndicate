import { motion } from 'framer-motion';
import { ShoppingBag, Store, Loader2, Minus, Plus, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useGameStore, ItemDefinition } from '@/hooks/useGameStore';
import { useAuth } from '@/contexts/AuthContext';

interface MarketItemProps {
    id: string;
    name: string;
    description: string;
    price: number;
    stat?: string;
    image: string;
    delay?: number;
    onBuy: () => void;
}

const MarketItem = ({ name, description, price, stat, image, delay = 0, onBuy }: MarketItemProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-3 h-full flex flex-col"
    >
        {/* Icon at Top - No Border */}
        <div className="flex flex-col items-center mb-2 flex-1">
            <div className="w-12 h-12 flex items-center justify-center shrink-0 mb-1.5">
                <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-contain drop-shadow-lg"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="w-10 h-10 text-primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div>';
                    }}
                />
            </div>

            {/* Name and Stat Badge */}
            <div className="text-center w-full">
                <h3 className="font-cinzel font-bold text-[11px] text-foreground mb-0.5 line-clamp-1">{name}</h3>
                {stat && (
                    <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                        {stat}
                    </span>
                )}
                <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2 mt-1 h-[2.5em]">{description}</p>
            </div>
        </div>

        {/* Price Display */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded p-1.5 mb-2">
            <p className="font-cinzel font-bold text-xs text-primary text-center">${price.toLocaleString()}</p>
        </div>

        {/* Buy Button - Centered & Compact */}
        <div className="flex justify-center mt-auto">
            <Button className="btn-gold text-[10px] h-7 px-3 w-full" onClick={onBuy}>
                <ShoppingBag className="w-3 h-3 mr-1" />
                Buy
            </Button>
        </div>
    </motion.div>
);

const MarketPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const {
        buyItem,
        itemDefinitions,
        loadDefinitions,
        isLoadingDefinitions: isStoreLoading
    } = useGameStore();

    const [activeTab, setActiveTab] = useState('weapons');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingItem, setPendingItem] = useState<ItemDefinition | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        loadDefinitions();
    }, []);

    const handleBuyClick = (item: ItemDefinition) => {
        setPendingItem(item);
        setQuantity(1); // Reset quantity when opening dialog
        setConfirmOpen(true);
    };

    const incrementQuantity = () => setQuantity(q => Math.min(q + 1, 99));
    const decrementQuantity = () => setQuantity(q => Math.max(q - 1, 1));
    const setQuickQuantity = (amount: number) => setQuantity(Math.min(amount, 99));
    const totalPrice = pendingItem ? pendingItem.buy_price * quantity : 0;

    const confirmPurchase = async () => {
        if (!pendingItem) return;

        setIsProcessing(true);
        try {
            const success = await buyItem(pendingItem.id, quantity);
            if (success) {
                toast({
                    title: 'Purchase Successful!',
                    description: `${quantity}x ${pendingItem.name} added to your inventory.`,
                });
                setConfirmOpen(false);
            } else {
                toast({
                    title: 'Purchase Failed',
                    description: 'Insufficient funds or transaction error.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Purchase error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
            setPendingItem(null);
        }
    };

    // Filter items by category (contraband removed - only via production/auction)
    // Also filter by is_purchasable to exclude disabled items like Diamond Ring
    const weapons = itemDefinitions.filter(i => i.category === 'weapon' && i.is_purchasable !== false);
    const equipment = itemDefinitions.filter(i => i.category === 'equipment' && i.is_purchasable !== false);

    const formatStat = (item: ItemDefinition) => {
        if (item.attack_bonus > 0) return `+${item.attack_bonus} Attack`;
        if (item.defense_bonus > 0) return `+${item.defense_bonus} Defense`;
        // income_bonus removed: not implemented in collect_business_income RPC
        return '';
    };

    // Map logic to get images based on name (temporary fallback or DB column)
    // Assuming DB has image_url or we map locally. The DB schema usually has image_url.
    // Checking previous code: mock data had image paths.
    // If DB doesn't have image paths, we might need a helper.
    // Let's assume DB has 'image_url' or we map by name slug.

    // Helper to get image based on category
    const getImage = (item: ItemDefinition) => {
        // Clean slug: remove non-alphanumeric (fixes "Sawed-Off" -> "sawedoff")
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Route to category-specific folder
        if (item.category === 'weapon') return `/images/weapons/${slug}.png`;
        if (item.category === 'equipment') return `/images/equipment/${slug}.png`;
        if (item.category === 'contraband') return `/images/contraband/${slug}.png`;
        return `/images/icons/inventory.png`;
    };

    return (
        <MainLayout>
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/black_market.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
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
                                <h1 className="font-cinzel text-xl font-bold text-foreground">Black Market</h1>
                                <p className="text-xs text-muted-foreground">Illegal goods & rare items</p>
                            </div>
                        </div>

                        {/* Diamond Shop Button */}
                        <Button
                            className="btn-gold h-8 px-3 py-1 text-xs font-semibold flex items-center gap-1.5 border border-yellow-500/50"
                            onClick={() => navigate('/shop')}
                        >
                            <img src="/images/icons/diamond.png" alt="💎" className="w-4 h-4" />
                            <span>Shop</span>
                        </Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/30 rounded-sm mb-4">
                            <TabsTrigger value="weapons" className="font-cinzel text-xs">Weapons</TabsTrigger>
                            <TabsTrigger value="equipment" className="font-cinzel text-xs">Equipment</TabsTrigger>
                        </TabsList>

                        <TabsContent value="weapons" className="mt-0">
                            {weapons.length === 0 && !isStoreLoading && (
                                <p className="text-center text-muted-foreground text-xs py-8">No weapons available.</p>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                {weapons.map((item, index) => (
                                    <MarketItem
                                        key={item.id}
                                        id={item.id}
                                        name={item.name}
                                        description={item.description || ''}
                                        price={item.buy_price}
                                        stat={formatStat(item)}
                                        image={getImage(item)}
                                        delay={0.05 * index}
                                        onBuy={() => handleBuyClick(item)}
                                    />
                                ))}
                            </div>
                        </TabsContent>


                        <TabsContent value="equipment" className="mt-0">
                            {equipment.length === 0 && !isStoreLoading && (
                                <p className="text-center text-muted-foreground text-xs py-8">No equipment available.</p>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                {equipment.map((item, index) => (
                                    <MarketItem
                                        key={item.id}
                                        id={item.id}
                                        name={item.name}
                                        description={item.description || ''}
                                        price={item.buy_price}
                                        stat={formatStat(item)}
                                        image={getImage(item)}
                                        delay={0.05 * index}
                                        onBuy={() => handleBuyClick(item)}
                                    />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground">Confirm Purchase</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            {pendingItem?.name}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Quick Select Buttons */}
                    <div className="flex justify-center gap-2 py-2">
                        {[1, 5, 10, 50].map(n => (
                            <Button
                                key={n}
                                variant={quantity === n ? "default" : "outline"}
                                size="sm"
                                className="text-xs px-3"
                                onClick={() => setQuickQuantity(n)}
                            >
                                x{n}
                            </Button>
                        ))}
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-center gap-4 py-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={decrementQuantity}
                            disabled={quantity <= 1}
                        >
                            <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-cinzel text-2xl font-bold w-12 text-center">{quantity}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={incrementQuantity}
                            disabled={quantity >= 99}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Total Price */}
                    <div className="text-center pb-2">
                        <p className="text-xs text-muted-foreground">Total Price</p>
                        <p className="font-cinzel text-xl font-bold text-primary">${totalPrice.toLocaleString()}</p>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-inter">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPurchase}
                            className="btn-gold"
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Buy ${quantity}x`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout >
    );
};

export default MarketPage;