import { motion } from 'framer-motion';
import { ShoppingBag, Store, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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

    useEffect(() => {
        loadDefinitions();
    }, []);

    const handleBuyClick = (item: ItemDefinition) => {
        setPendingItem(item);
        setConfirmOpen(true);
    };

    const confirmPurchase = async () => {
        if (!pendingItem) return;

        setIsProcessing(true);
        try {
            const success = await buyItem(pendingItem.id, 1);
            if (success) {
                toast({
                    title: 'Purchase Successful!',
                    description: `${pendingItem.name} has been added to your inventory.`,
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

    // Filter items by category
    const weapons = itemDefinitions.filter(i => i.category === 'weapon');
    const contraband = itemDefinitions.filter(i => i.category === 'contraband');
    const equipment = itemDefinitions.filter(i => i.category === 'equipment');

    const formatStat = (item: ItemDefinition) => {
        if (item.attack_bonus > 0) return `+${item.attack_bonus} Attack`;
        if (item.defense_bonus > 0) return `+${item.defense_bonus} Defense`;
        if (item.income_bonus > 0) return `+${item.income_bonus}% Income`;
        if (item.category === 'contraband' && item.sell_price) return `Sells for $${item.sell_price}`;
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
                            <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="font-cinzel text-xl font-bold text-foreground">Black Market</h1>
                                <p className="text-xs text-muted-foreground">Illegal goods & rare items</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            onClick={() => navigate('/shop')}
                        >
                            <Store className="w-4 h-4" />
                            Shop
                        </Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/30 rounded-sm mb-4">
                            <TabsTrigger value="weapons" className="font-cinzel text-xs">Weapons</TabsTrigger>
                            <TabsTrigger value="contraband" className="font-cinzel text-xs">Contraband</TabsTrigger>
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

                        <TabsContent value="contraband" className="space-y-3 mt-0">
                            {contraband.length === 0 && !isStoreLoading && (
                                <p className="text-center text-muted-foreground text-xs py-8">No contraband available.</p>
                            )}
                            {contraband.map((item, index) => (
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

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Confirm Purchase"
                description={`Buy ${pendingItem?.name} for $${pendingItem?.buy_price.toLocaleString()}?`}
                onConfirm={confirmPurchase}
                confirmText={isProcessing ? "Buying..." : "Buy"}
            />
        </MainLayout >
    );
};

export default MarketPage;