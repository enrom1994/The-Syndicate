import { motion } from 'framer-motion';
import { ShoppingBag, Store, Loader2, Minus, Plus } from 'lucide-react';
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
        className="noir-card p-3 flex items-center gap-3"
    >
        <div className="w-16 h-16 rounded-sm overflow-hidden shrink-0 bg-muted/30">
            <img
                src={image}
                alt={name}
                className="w-full h-full object-cover"
            />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
            {stat && <p className="text-xs text-primary mt-1">{stat}</p>}
        </div>
        <div className="text-right shrink-0">
            <p className="font-cinzel font-bold text-sm text-primary">${price.toLocaleString()}</p>
            <Button size="sm" className="mt-2 btn-gold text-xs px-3 py-1 h-auto" onClick={onBuy}>
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
    const weapons = itemDefinitions.filter(i => i.category === 'weapon');
    const equipment = itemDefinitions.filter(i => i.category === 'equipment');

    const formatStat = (item: ItemDefinition) => {
        if (item.attack_bonus > 0) return `+${item.attack_bonus} Attack`;
        if (item.defense_bonus > 0) return `+${item.defense_bonus} Defense`;
        if (item.income_bonus > 0) return `+${item.income_bonus}% Income`;
        return '';
    };

    // Map logic to get images based on name (temporary fallback or DB column)
    // Assuming DB has image_url or we map locally. The DB schema usually has image_url.
    // Checking previous code: mock data had image paths.
    // If DB doesn't have image paths, we might need a helper.
    // Let's assume DB has 'image_url' or we map by name slug.

    // Helper to get image
    // Helper to get image
    const getImage = (item: ItemDefinition) => {
        // Clean slug: remove non-alphanumeric (fixes "Sawed-Off" -> "sawedoff")
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Manual overrides for known missing assets
        if (slug === 'goldenrevolver') return '/images/blackmarket/goldenrevolver.png';

        return `/images/blackmarket/${slug}.png`;
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
                        <Button
                            size="sm"
                            className="btn-gold h-auto px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(212,175,55,0.6)] hover:shadow-[0_0_20px_rgba(212,175,55,0.8)] transition-shadow"
                            onClick={() => navigate('/shop')}
                        >
                            <Store className="w-4 h-4" />
                            Shop
                        </Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/30 rounded-sm mb-4">
                            <TabsTrigger value="weapons" className="font-cinzel text-xs">Weapons</TabsTrigger>
                            <TabsTrigger value="equipment" className="font-cinzel text-xs">Equipment</TabsTrigger>
                        </TabsList>

                        <TabsContent value="weapons" className="space-y-3 mt-0">
                            {weapons.length === 0 && !isStoreLoading && (
                                <p className="text-center text-muted-foreground text-xs py-8">No weapons available.</p>
                            )}
                            {weapons.map((item, index) => (
                                <MarketItem
                                    key={item.id}
                                    id={item.id}
                                    name={item.name}
                                    description={item.description || ''}
                                    price={item.buy_price}
                                    stat={formatStat(item)}
                                    image={getImage(item)}
                                    delay={0.1 * index}
                                    onBuy={() => handleBuyClick(item)}
                                />
                            ))}
                        </TabsContent>


                        <TabsContent value="equipment" className="space-y-3 mt-0">
                            {equipment.length === 0 && !isStoreLoading && (
                                <p className="text-center text-muted-foreground text-xs py-8">No equipment available.</p>
                            )}
                            {equipment.map((item, index) => (
                                <MarketItem
                                    key={item.id}
                                    id={item.id}
                                    name={item.name}
                                    description={item.description || ''}
                                    price={item.buy_price}
                                    stat={formatStat(item)}
                                    image={getImage(item)}
                                    delay={0.1 * index}
                                    onBuy={() => handleBuyClick(item)}
                                />
                            ))}
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