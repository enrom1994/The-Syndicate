import { motion } from 'framer-motion';
import { Store, Zap, Shield, TrendingUp, Clock, Crown, Loader2, Bot } from 'lucide-react';
import { useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { GameIcon } from '@/components/GameIcon';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { TON_RECEIVING_ADDRESS, toNanoTon } from '@/lib/ton-config';

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
            <GameIcon type="diamond" className="w-8 h-8" />
            <span className="font-cinzel font-bold text-xl text-foreground">{diamonds.toLocaleString()}</span>
        </div>
        <Button className="w-full btn-gold text-xs" onClick={onBuy}>
            {price}
        </Button>
    </motion.div>
);

interface BoosterProps {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    price: number;
    duration: string;
    isProcessing?: boolean;
    delay?: number;
    onBuy: () => void;
}

const BoosterItem = ({ id, name, description, icon, price, duration, isProcessing, delay = 0, onBuy }: BoosterProps) => (
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
            <Button
                className="btn-gold text-xs shrink-0"
                onClick={onBuy}
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <GameIcon type="diamond" className="w-5 h-5 mr-1" />
                        {price}
                    </>
                )}
            </Button>
        </div>
    </motion.div>
);

const boosterTypes = [
    { id: '2x_income', name: '2x Income', description: 'Double business income', icon: <TrendingUp className="w-5 h-5 text-green-400" />, price: 50, duration_minutes: 1440 },
    { id: '2x_attack', name: '2x Attack', description: 'Double attack power', icon: <Zap className="w-5 h-5 text-red-400" />, price: 30, duration_minutes: 720 },
    { id: 'shield', name: 'Shield', description: 'Immune to attacks', icon: <Shield className="w-5 h-5 text-blue-400" />, price: 100, duration_minutes: 360 },
    { id: 'vip_pass', name: 'VIP Pass', description: 'All bonuses active', icon: <Crown className="w-5 h-5 text-primary" />, price: 200, duration_minutes: 1440 },
];

const formatDuration = (minutes: number): string => {
    if (minutes >= 1440) return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`;
    if (minutes >= 60) return `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;
    return `${minutes} minutes`;
};

const ShopPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const [tonConnectUI] = useTonConnectUI();

    const [activeTab, setActiveTab] = useState('diamonds');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPurchase, setPendingPurchase] = useState<{
        type: 'diamonds' | 'booster' | 'protection';
        name: string;
        price: string;
        boosterId?: string;
        diamondCost?: number;
        tonAmount?: number;
        diamondsToCredit?: number;
        protectionMinutes?: number;
    } | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [hasAutoCollect, setHasAutoCollect] = useState(player?.auto_collect_businesses ?? false);

    const diamondPackages = [
        { name: 'Small', price: '1 TON', tonAmount: 1, diamonds: 120 },
        { name: 'Standard', price: '3 TON', tonAmount: 3, diamonds: 420, bonus: '60' },
        { name: 'Value', price: '10 TON', tonAmount: 10, diamonds: 1600, bonus: '400', popular: true },
        { name: 'Godfather', price: '30 TON', tonAmount: 30, diamonds: 5000, bonus: '1500' },
    ];

    const protectionPacks = [
        { id: 'basic', name: 'Basic Protection', price: '0.05 TON', description: 'Immune from PvP for 1 hour', duration: '1 hour', durationMinutes: 60 },
        { id: 'standard', name: 'Standard Protection', price: '0.35 TON', description: 'Immune + Stealth mode', duration: '6 hours', durationMinutes: 360 },
        { id: 'premium', name: 'Premium Protection', price: '1.5 TON', description: 'All protections + Attack boost', duration: '24 hours', durationMinutes: 1440 },
    ];

    const handleBuyDiamonds = (name: string, price: string, tonAmount: number, diamonds: number) => {
        if (!tonConnectUI.wallet) {
            tonConnectUI.openModal();
            return;
        }
        setPendingPurchase({
            type: 'diamonds',
            name,
            price,
            tonAmount,
            diamondsToCredit: diamonds
        });
        setConfirmOpen(true);
    };

    const handleBuyBooster = (booster: typeof boosterTypes[0]) => {
        if ((player?.diamonds ?? 0) < booster.price) {
            toast({
                title: 'Not Enough Diamonds',
                description: `You need ${booster.price} diamonds for this booster.`,
                variant: 'destructive',
            });
            return;
        }
        setPendingPurchase({
            type: 'booster',
            name: booster.name,
            price: `${booster.price} 💎`,
            boosterId: booster.id,
            diamondCost: booster.price,
        });
        setConfirmOpen(true);
    };

    const handleBuyProtection = (pack: typeof protectionPacks[0]) => {
        if (!tonConnectUI.wallet) {
            tonConnectUI.openModal();
            return;
        }
        const tonAmount = parseFloat(pack.price.replace(' TON', ''));
        setPendingPurchase({
            type: 'protection',
            name: pack.name,
            price: pack.price,
            tonAmount,
            protectionMinutes: pack.durationMinutes,
        });
        setConfirmOpen(true);
    };

    const handleBuyAutoCollect = () => {
        if (!tonConnectUI.wallet) {
            tonConnectUI.openModal();
            return;
        }
        if (hasAutoCollect) {
            toast({
                title: 'Already Owned',
                description: 'You already have Auto-Collector enabled!',
            });
            return;
        }
        setPendingPurchase({
            type: 'auto_collect' as any,
            name: 'Business Auto-Collector',
            price: '5 TON',
            tonAmount: 5,
        });
        setConfirmOpen(true);
    };

    const confirmPurchase = async () => {
        if (!pendingPurchase || !player) return;

        setConfirmOpen(false);
        setProcessingId(pendingPurchase.boosterId || pendingPurchase.name);

        try {
            if (pendingPurchase.type === 'booster' && pendingPurchase.boosterId) {
                // Use the activate_booster RPC which handles diamond deduction and insertion
                const { data, error } = await supabase.rpc('activate_booster', {
                    player_id_input: player.id,
                    booster_type_input: pendingPurchase.boosterId,
                });

                if (error) {
                    throw error;
                }

                if (!data?.success) {
                    throw new Error(data?.message || 'Failed to activate booster');
                }

                // Find booster details for toast message
                const booster = boosterTypes.find(b => b.id === pendingPurchase.boosterId);

                haptic.success();
                await refetchPlayer();

                toast({
                    title: 'Booster Activated!',
                    description: `${pendingPurchase.name} is now active for ${formatDuration(booster?.duration_minutes || 60)}.`,
                });
            } else if (pendingPurchase.type === 'diamonds' && pendingPurchase.tonAmount && pendingPurchase.diamondsToCredit) {
                // Send TON transaction
                const transaction = {
                    validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
                    messages: [
                        {
                            address: TON_RECEIVING_ADDRESS,
                            amount: toNanoTon(pendingPurchase.tonAmount).toString(),
                        }
                    ]
                };

                await tonConnectUI.sendTransaction(transaction);

                // Credit diamonds after successful payment
                await supabase.rpc('increment_diamonds', {
                    player_id_input: player.id,
                    amount: pendingPurchase.diamondsToCredit,
                    source: 'ton_purchase',
                });

                haptic.success();
                await refetchPlayer();

                toast({
                    title: 'Diamonds Purchased!',
                    description: `You received ${pendingPurchase.diamondsToCredit.toLocaleString()} diamonds!`,
                });
            } else if (pendingPurchase.type === 'protection' && pendingPurchase.tonAmount && pendingPurchase.protectionMinutes) {
                // Send TON transaction
                const transaction = {
                    validUntil: Math.floor(Date.now() / 1000) + 600,
                    messages: [
                        {
                            address: TON_RECEIVING_ADDRESS,
                            amount: toNanoTon(pendingPurchase.tonAmount).toString(),
                        }
                    ]
                };

                await tonConnectUI.sendTransaction(transaction);

                // Apply protection shield booster
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + pendingPurchase.protectionMinutes);

                await supabase.from('player_boosters').upsert({
                    player_id: player.id,
                    booster_type: 'shield',
                    expires_at: expiresAt.toISOString(),
                }, { onConflict: 'player_id,booster_type' });

                haptic.success();
                await refetchPlayer();

                toast({
                    title: 'Protection Activated!',
                    description: `You are protected for the next ${pendingPurchase.protectionMinutes >= 60 ? `${pendingPurchase.protectionMinutes / 60} hours` : `${pendingPurchase.protectionMinutes} minutes`}!`,
                });
            } else if ((pendingPurchase.type as string) === 'auto_collect' && pendingPurchase.tonAmount) {
                // Send TON transaction for Auto-Collector
                const transaction = {
                    validUntil: Math.floor(Date.now() / 1000) + 600,
                    messages: [
                        {
                            address: TON_RECEIVING_ADDRESS,
                            amount: toNanoTon(pendingPurchase.tonAmount).toString(),
                        }
                    ]
                };

                await tonConnectUI.sendTransaction(transaction);

                // Activate auto-collect in database
                const { data, error } = await supabase.rpc('purchase_auto_collect', {
                    target_player_id: player.id
                });

                if (error) throw error;
                if (!data?.success) throw new Error(data?.message || 'Failed to activate');

                haptic.success();
                setHasAutoCollect(true);
                await refetchPlayer();

                toast({
                    title: 'Auto-Collector Activated! 🤖',
                    description: 'Your businesses will now auto-collect income!',
                });
            }
        } catch (error) {
            console.error('Purchase error:', error);
            haptic.error();
            toast({
                title: 'Purchase Failed',
                description: 'An error occurred. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setProcessingId(null);
            setPendingPurchase(null);
        }
    };

    if (isAuthLoading) {
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
                        <GameIcon type="diamond" className="w-8 h-8" />
                        <span className="font-cinzel font-bold text-sm text-foreground">{player?.diamonds ?? 0}</span>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="diamonds" className="font-cinzel text-[10px]">
                            Diamonds
                        </TabsTrigger>
                        <TabsTrigger value="boosters" className="font-cinzel text-[10px]">
                            Boosters
                        </TabsTrigger>
                        <TabsTrigger value="protection" className="font-cinzel text-[10px]">
                            Protection
                        </TabsTrigger>
                        <TabsTrigger value="upgrades" className="font-cinzel text-[10px]">
                            Upgrades
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="diamonds" className="mt-0">
                        <div className="grid grid-cols-2 gap-3">
                            {diamondPackages.map((pkg, index) => (
                                <DiamondPackage
                                    key={pkg.name}
                                    {...pkg}
                                    delay={0.1 * index}
                                    onBuy={() => handleBuyDiamonds(pkg.name, pkg.price, pkg.tonAmount, pkg.diamonds)}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-4">
                            Purchases require TON wallet connection
                        </p>
                    </TabsContent>

                    <TabsContent value="boosters" className="space-y-2 mt-0">
                        {boosterTypes.map((booster, index) => (
                            <BoosterItem
                                key={booster.id}
                                id={booster.id}
                                name={booster.name}
                                description={booster.description}
                                icon={booster.icon}
                                price={booster.price}
                                duration={formatDuration(booster.duration_minutes)}
                                isProcessing={processingId === booster.id}
                                delay={0.1 * index}
                                onBuy={() => handleBuyBooster(booster)}
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
                                    <Button
                                        className="btn-gold text-xs shrink-0"
                                        onClick={() => handleBuyProtection(pack)}
                                    >
                                        {pack.price}
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </TabsContent>

                    <TabsContent value="upgrades" className="space-y-3 mt-0">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className={`noir-card p-4 ${hasAutoCollect ? 'opacity-60' : 'ring-2 ring-primary'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center shrink-0">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-cinzel font-bold text-sm text-foreground">Business Auto-Collector</h3>
                                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded">PERMANENT</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Automatically collects income from all your businesses every hour. Never miss out on earnings again!
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        <li className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            ✓ Auto-collect from all businesses
                                        </li>
                                        <li className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            ✓ Works 24/7, even offline
                                        </li>
                                        <li className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            ✓ One-time purchase, forever yours
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <Button
                                className="w-full mt-4 btn-gold"
                                onClick={handleBuyAutoCollect}
                                disabled={hasAutoCollect || processingId === 'auto_collect'}
                            >
                                {hasAutoCollect ? (
                                    '✓ Already Owned'
                                ) : processingId === 'auto_collect' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    '5 TON - Buy Now'
                                )}
                            </Button>
                        </motion.div>

                        <p className="text-xs text-muted-foreground text-center">
                            Premium upgrades are permanent and never expire
                        </p>
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