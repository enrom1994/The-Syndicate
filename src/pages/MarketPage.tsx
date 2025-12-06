import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface MarketItemProps {
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
    const [activeTab, setActiveTab] = useState('weapons');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingItem, setPendingItem] = useState<{ name: string; price: number } | null>(null);

    const weapons = [
        { name: 'Tommy Gun', description: 'Classic submachine gun', price: 5000, stat: '+15 Attack', image: '/images/blackmarket/tommygun.png' },
        { name: 'Brass Knuckles', description: 'Close combat weapon', price: 500, stat: '+5 Attack', image: '/images/blackmarket/brassknuckles.png' },
        { name: 'Switchblade', description: 'Concealed blade', price: 250, stat: '+3 Attack', image: '/images/blackmarket/switchblade.png' },
        { name: 'Sawed-off Shotgun', description: 'Short range devastation', price: 3000, stat: '+10 Attack', image: '/images/blackmarket/sawedoffshotgun.png' },
    ];

    const contraband = [
        { name: 'Whiskey Crate', description: 'Premium bootleg spirits', price: 2000, stat: 'Sells for $3,500', image: '/images/blackmarket/wiskeycrate.png' },
        { name: 'Cuban Cigars', description: 'Finest imported cigars', price: 1500, stat: 'Sells for $2,500', image: '/images/blackmarket/cubancigars.png' },
        { name: 'Morphine Vials', description: 'Medical grade supply', price: 5000, stat: 'Sells for $8,000', image: '/images/blackmarket/morphinevials.png' },
    ];

    const equipment = [
        { name: 'Armored Vest', description: 'Bullet-resistant protection', price: 8000, stat: '+20 Defense', image: '/images/blackmarket/armoredvest.png' },
        { name: 'Getaway Car', description: '1929 Ford Model A', price: 15000, stat: '+25% Escape chance', image: '/images/blackmarket/getawaycar.png' },
        { name: 'Safe House', description: 'Hidden location', price: 25000, stat: '+10% Income', image: '/images/blackmarket/safehouse.png' },
    ];

    const handleBuyClick = (name: string, price: number) => {
        setPendingItem({ name, price });
        setConfirmOpen(true);
    };

    const confirmPurchase = () => {
        if (pendingItem) {
            toast({
                title: 'Item Purchased!',
                description: `${pendingItem.name} has been added to your inventory.`,
            });
        }
        setConfirmOpen(false);
        setPendingItem(null);
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
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-cinzel text-xl font-bold text-foreground">Black Market</h1>
                            <p className="text-xs text-muted-foreground">Illegal goods & rare items</p>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/30 rounded-sm mb-4">
                            <TabsTrigger value="weapons" className="font-cinzel text-xs">Weapons</TabsTrigger>
                            <TabsTrigger value="contraband" className="font-cinzel text-xs">Contraband</TabsTrigger>
                            <TabsTrigger value="equipment" className="font-cinzel text-xs">Equipment</TabsTrigger>
                        </TabsList>

                        <TabsContent value="weapons" className="space-y-3 mt-0">
                            {weapons.map((item, index) => (
                                <MarketItem
                                    key={item.name}
                                    {...item}
                                    delay={0.1 * index}
                                    onBuy={() => handleBuyClick(item.name, item.price)}
                                />
                            ))}
                        </TabsContent>

                        <TabsContent value="contraband" className="space-y-3 mt-0">
                            {contraband.map((item, index) => (
                                <MarketItem
                                    key={item.name}
                                    {...item}
                                    delay={0.1 * index}
                                    onBuy={() => handleBuyClick(item.name, item.price)}
                                />
                            ))}
                        </TabsContent>

                        <TabsContent value="equipment" className="space-y-3 mt-0">
                            {equipment.map((item, index) => (
                                <MarketItem
                                    key={item.name}
                                    {...item}
                                    delay={0.1 * index}
                                    onBuy={() => handleBuyClick(item.name, item.price)}
                                />
                            ))}
                        </TabsContent>
                    </Tabs>
                </motion.div> {/* This motion.div was not closed, and the outer div was closed with a syntax error */}
            </div> {/* This closes the outer div */}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Confirm Purchase"
                description={`Buy ${pendingItem?.name} for $${pendingItem?.price.toLocaleString()}?`}
                onConfirm={confirmPurchase}
                confirmText="Buy"
            />
        </MainLayout >
    );
};

export default MarketPage;