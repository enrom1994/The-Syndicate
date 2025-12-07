import { motion } from 'framer-motion';
import { Store, Zap, Shield, TrendingUp, Clock, Star, Crown } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';

interface PackageProps {
    name: string;
    price: string;
    diamonds: number;
    bonus?: string;
    popular?: boolean;
    delay?: number;
    onBuy: () => void;
}

const DiamondPackage = ({ name, price, diamonds, bonus, popular, delay = 0, onBuy }: PackageProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className={`noir-card p-4 relative ${popular ? 'ring-2 ring-primary' : ''}`}
    >
        {popular && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] rounded-sm">
                BEST VALUE
            </span>
        )}
        <div className="text-center mb-3">
            <h3 className="font-cinzel font-bold text-sm text-foreground">{name}</h3>
            {bonus && <p className="text-[10px] text-green-400">+{bonus} Bonus!</p>}
        </div>
        <div className="flex items-center justify-center gap-1 mb-3">
            <GameIcon type="diamond" className="w-8 h-8" /> // Increased size
            <span className="font-cinzel font-bold text-xl text-foreground">{diamonds.toLocaleString()}</span>
        </div>
        <Button className="w-full btn-gold text-xs" onClick={onBuy}>
            {price}
        </Button>
    </motion.div>
);

interface BoosterProps {
    name: string;
    description: string;
    icon: React.ReactNode;
    price: number;
    duration: string;
    delay?: number;
    onBuy: () => void;
}

const BoosterItem = ({ name, description, icon, price, duration, delay = 0, onBuy }: BoosterProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
                <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{duration}</span>
                </div>
            </div>
            <Button className="btn-gold text-xs shrink-0" onClick={onBuy}>
                <GameIcon type="diamond" className="w-5 h-5 mr-1" /> // Increased size
                {price}
            </Button>
        </div>
    </motion.div>
);

const ShopPage = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('diamonds');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPurchase, setPendingPurchase] = useState<{ name: string; price: string } | null>(null);

    const diamonds = 150; // Player's current diamonds

    const diamondPackages = [
        { name: 'Small', price: '1 TON', diamonds: 120 },
        { name: 'Standard', price: '3 TON', diamonds: 420, bonus: '60' },
        { name: 'Value', price: '10 TON', diamonds: 1600, bonus: '400', popular: true },
        { name: 'Godfather', price: '30 TON', diamonds: 5000, bonus: '1500' },
    ];

    const boosters = [
        { name: '2x Income', description: 'Double business income', icon: <TrendingUp className="w-5 h-5 text-green-400" />, price: 50, duration: '24 hours' },
        { name: '2x Attack', description: 'Double attack power', icon: <Zap className="w-5 h-5 text-red-400" />, price: 30, duration: '12 hours' },
        { name: 'Shield', description: 'Immune to attacks', icon: <Shield className="w-5 h-5 text-blue-400" />, price: 100, duration: '6 hours' },
        { name: 'VIP Pass', description: 'All bonuses active', icon: <Crown className="w-5 h-5 text-primary" />, price: 200, duration: '24 hours' },
    ];

    const protectionPacks = [
        { name: 'Basic Protection', price: '0.1 TON', description: 'Immune from PvP for 1 hour', duration: '1 hour' },
        { name: 'Standard Protection', price: '0.4 TON', description: 'Immune + Stealth mode', duration: '6 hours' },
        { name: 'Premium Protection', price: '1 TON', description: 'All protections + Attack boost', duration: '24 hours' },
    ];

    const handleBuy = (name: string, price: string) => {
        setPendingPurchase({ name, price });
        setConfirmOpen(true);
    };

    const confirmPurchase = () => {
        if (pendingPurchase) {
            toast({
                title: 'Purchase Successful!',
                description: `You bought ${pendingPurchase.name}!`,
            });
        }
        setConfirmOpen(false);
        setPendingPurchase(null);
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
                    className="flex items-center justify-between mb-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                            <Store className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-cinzel text-xl font-bold text-foreground">Shop</h1>
                            <p className="text-xs text-muted-foreground">Premium items and boosters</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 noir-card px-3 py-1.5">
                        <GameIcon type="diamond" className="w-8 h-8" /> // Increased size
                        <span className="font-cinzel font-bold text-sm text-foreground">{diamonds}</span>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="diamonds" className="font-cinzel text-[10px]">
                            Diamonds
                        </TabsTrigger>
                        <TabsTrigger value="boosters" className="font-cinzel text-[10px]">
                            Boosters
                        </TabsTrigger>
                        <TabsTrigger value="protection" className="font-cinzel text-[10px]">
                            Protection
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="diamonds" className="mt-0">
                        <div className="grid grid-cols-2 gap-3">
                            {diamondPackages.map((pkg, index) => (
                                <DiamondPackage
                                    key={pkg.name}
                                    {...pkg}
                                    delay={0.1 * index}
                                    onBuy={() => handleBuy(pkg.name, pkg.price)}
                                />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="boosters" className="space-y-2 mt-0">
                        {boosters.map((booster, index) => (
                            <BoosterItem
                                key={booster.name}
                                {...booster}
                                delay={0.1 * index}
                                onBuy={() => handleBuy(booster.name, `${booster.price} 💎`)}
                            />
                        ))}
                    </TabsContent>

                    <TabsContent value="protection" className="space-y-2 mt-0">
                        {protectionPacks.map((pack, index) => (
                            <motion.div
                                key={pack.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 * index }}
                                className="noir-card p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-cinzel font-semibold text-sm text-foreground">{pack.name}</h3>
                                        <p className="text-xs text-muted-foreground">{pack.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground">{pack.duration}</span>
                                        </div>
                                    </div>
                                    <Button className="btn-gold text-xs shrink-0" onClick={() => handleBuy(pack.name, pack.price)}>
                                        {pack.price}
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Confirm Purchase"
                description={`Buy ${pendingPurchase?.name} for ${pendingPurchase?.price}?`}
                onConfirm={confirmPurchase}
                confirmText="Buy"
            />
        </MainLayout>
    );
};

export default ShopPage;