import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, DollarSign, Clock, ArrowUp, Loader2, Factory, Users, Package, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, OwnedBusiness, BusinessDefinition } from '@/hooks/useGameStore';
import { rewardCash } from '@/components/RewardAnimation';
import { supabase } from '@/lib/supabase';

interface BusinessCardProps {
    name: string;
    description: string;
    image: string;
    level: number;
    maxLevel: number;
    income: number;
    upgradeCost: number;
    cooldown: string;
    cooldownRemaining?: string;
    cooldownMinutes?: number;
    timeRemainingMinutes?: number;
    owned: boolean;
    canCollect: boolean;
    delay?: number;
    isProcessing?: boolean;
    isRushing?: boolean;
    rushCost?: number;
    onBuy: () => void;
    onUpgrade: () => void;
    onCollect: () => void;
    onRushCollect?: () => void;
}

const BusinessCard = ({
    name,
    description,
    image,
    level,
    maxLevel,
    income,
    upgradeCost,
    cooldown,
    cooldownRemaining,
    cooldownMinutes,
    timeRemainingMinutes,
    owned,
    canCollect,
    delay = 0,
    isProcessing = false,
    isRushing = false,
    rushCost = 5,
    onBuy,
    onUpgrade,
    onCollect,
    onRushCollect
}: BusinessCardProps) => {
    // Calculate progress percentage for cooldown bar
    const progressPercent = cooldownMinutes && timeRemainingMinutes !== undefined
        ? Math.max(0, Math.min(100, ((cooldownMinutes - timeRemainingMinutes) / cooldownMinutes) * 100))
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card p-4 relative overflow-hidden"
        >
            {/* Glow effect when ready to collect */}
            {canCollect && owned && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 pointer-events-none animate-pulse" />
            )}

            {/* Header: Large Image + Name + Level */}
            <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-20 h-20 rounded-md bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20 shadow-lg">
                    <img
                        src={image}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="w-10 h-10 text-primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/></svg></div>';
                        }}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-cinzel font-bold text-base text-foreground truncate">{name}</h3>
                        {owned && (
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-sm whitespace-nowrap">
                                Lv {level}/{maxLevel}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight line-clamp-2">{description}</p>
                </div>
            </div>

            {/* Stats Grid with Icons */}
            <div className={`grid ${owned ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-3`}>
                {/* Income */}
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-md p-2.5">
                    <div className="flex items-center gap-1 text-xs text-green-400/80 mb-1">
                        <img src="/images/icons/cash.png" alt="$" className="w-3 h-3" />
                        <span className="font-medium">Income</span>
                    </div>
                    <p className="font-cinzel font-bold text-sm text-green-400">${income.toLocaleString()}<span className="text-[10px] text-green-400/60">/hr</span></p>
                </div>

                {/* Cooldown */}
                <div className={`bg-gradient-to-br ${canCollect && owned ? 'from-primary/10 to-primary/5 border-primary/30' : 'from-yellow-500/10 to-orange-500/5 border-yellow-500/20'} border rounded-md p-2.5`}>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">Cooldown</span>
                    </div>
                    <p className={`font-cinzel font-bold text-sm ${canCollect && owned ? 'text-primary' : 'text-foreground'}`}>{cooldown}</p>
                </div>

                {/* Daily Income (owned only) */}
                {owned && (
                    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-md p-2.5">
                        <div className="flex items-center gap-1 text-xs text-cyan-400/80 mb-1">
                            <TrendingUp className="w-3 h-3" />
                            <span className="font-medium">Daily</span>
                        </div>
                        <p className="font-cinzel font-bold text-sm text-cyan-400">${(income * 24).toLocaleString()}</p>
                    </div>
                )}
            </div>

            {/* Progress Bar (owned only) */}
            {owned && (
                <div className="mb-4">
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full rounded-full ${canCollect ? 'bg-gradient-to-r from-primary to-primary/80' : 'bg-gradient-to-r from-yellow-500 to-orange-500'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5, delay: delay + 0.2 }}
                        />
                    </div>
                    {!canCollect && cooldownRemaining && (
                        <p className="text-[10px] text-muted-foreground mt-1 text-center">Ready in {cooldownRemaining}</p>
                    )}
                </div>
            )}

            {/* Buttons Section */}
            {owned ? (
                <div className="space-y-2">
                    {/* Row 1: Upgrade Button */}
                    <Button
                        className="w-full btn-gold text-xs h-9"
                        disabled={level >= maxLevel || isProcessing}
                        onClick={onUpgrade}
                    >
                        {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : level >= maxLevel ? (
                            '⭐ MAX LEVEL'
                        ) : (
                            <>
                                <ArrowUp className="w-4 h-4 mr-1" />
                                Upgrade — ${upgradeCost.toLocaleString()}
                            </>
                        )}
                    </Button>

                    {/* Row 2: Collect + Rush side by side */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className={`flex-1 text-xs h-9 ${canCollect ? 'border-primary text-primary hover:bg-primary/10' : ''}`}
                            disabled={isProcessing || !canCollect}
                            onClick={onCollect}
                        >
                            {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <img src="/images/icons/cash.png" alt="$" className="w-4 h-4 mr-1" />
                                    {canCollect ? 'Collect Now' : cooldownRemaining || 'Waiting...'}
                                </>
                            )}
                        </Button>

                        {/* Rush Collect Button - only show when on cooldown */}
                        {!canCollect && onRushCollect && (
                            <Button
                                variant="outline"
                                className="text-xs h-9 px-3 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 group"
                                disabled={isRushing}
                                onClick={onRushCollect}
                            >
                                {isRushing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <img src="/images/icons/diamond.png" alt="💎" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        <span className="font-bold">{rushCost}</span>
                                    </div>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <Button className="w-full btn-gold text-xs h-9" onClick={onBuy} disabled={isProcessing}>
                    {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Briefcase className="w-4 h-4 mr-1" />
                            Buy for ${upgradeCost.toLocaleString()}
                        </>
                    )}
                </Button>
            )}
        </motion.div>
    );
};

const formatCooldown = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
};

const canCollectFromBusiness = (lastCollected: string, cooldownMinutes: number): boolean => {
    const lastCollectedDate = new Date(lastCollected);
    const now = new Date();
    const minutesPassed = (now.getTime() - lastCollectedDate.getTime()) / (1000 * 60);
    return minutesPassed >= cooldownMinutes;
};

const getTimeRemainingMinutes = (lastCollected: string, cooldownMinutes: number): number => {
    const lastDate = new Date(lastCollected);
    const now = new Date();
    const minutesPassed = (now.getTime() - lastDate.getTime()) / (1000 * 60);
    return Math.max(0, cooldownMinutes - minutesPassed);
};

const calculateRushCost = (timeRemainingMinutes: number, totalCooldownMinutes: number): number => {
    if (timeRemainingMinutes <= 0) return 0;
    // Formula: (timeRemaining / totalCooldown) * 10, minimum 1 diamond
    return Math.max(1, Math.ceil((timeRemainingMinutes / totalCooldownMinutes) * 10));
};

const BusinessPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const {
        businesses: ownedBusinesses,
        businessDefinitions,
        isLoadingBusinesses,
        isLoadingDefinitions,
        loadBusinesses,
        buyBusiness,
        upgradeBusiness,
        collectIncome,
        rushBusinessCollect
    } = useGameStore();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        type: 'buy' | 'upgrade' | 'collect';
        business: string;
        businessId: string;
        playerBusinessId?: string;
        cost: number;
    } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('manage');
    const [recipes, setRecipes] = useState<any[]>([]);
    const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
    const [producingRecipeId, setProducingRecipeId] = useState<string | null>(null);
    const [rushingId, setRushingId] = useState<string | null>(null);

    // Load production recipes
    useEffect(() => {
        if (player?.id && activeTab === 'produce') {
            loadRecipes();
        }
    }, [player?.id, activeTab]);

    const loadRecipes = async () => {
        if (!player?.id) return;
        setIsLoadingRecipes(true);
        try {
            const { data, error } = await supabase.rpc('get_production_recipes', {
                target_player_id: player.id
            });
            if (error) throw error;
            setRecipes(data || []);
        } catch (error) {
            console.error('Error loading recipes:', error);
        } finally {
            setIsLoadingRecipes(false);
        }
    };

    const handleProduce = async (recipeId: string) => {
        if (!player?.id) return;
        setProducingRecipeId(recipeId);
        try {
            const { data, error } = await supabase.rpc('produce_contraband', {
                producer_id: player.id,
                target_recipe_id: recipeId
            });
            if (error) throw error;

            if (data?.success) {
                toast({
                    title: 'Production Complete!',
                    description: data.message,
                });
                await loadRecipes(); // Refresh cooldowns
            } else {
                toast({
                    title: 'Production Failed',
                    description: data?.message || 'Unable to produce.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Production error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setProducingRecipeId(null);
        }
    };

    // Map owned businesses to their IDs for quick lookup
    const ownedBusinessMap = new Map<string, OwnedBusiness>(
        ownedBusinesses.map(b => [b.business_id, b])
    );

    // Combine definitions with owned status
    const allBusinesses = businessDefinitions.map(def => {
        const owned = ownedBusinessMap.get(def.id);
        const cooldownMinutes = owned?.collect_cooldown_minutes || def.collect_cooldown_minutes;
        const timeRemaining = owned ? getTimeRemainingMinutes(owned.last_collected, cooldownMinutes) : 0;
        const rushCost = owned ? calculateRushCost(timeRemaining, cooldownMinutes) : 0;

        return {
            ...def,
            owned: !!owned,
            level: owned?.level || 0,
            income_per_hour: owned ? owned.income_per_hour : def.base_income_per_hour,
            upgrade_cost: owned ? owned.upgrade_cost : def.base_purchase_cost,
            playerBusinessId: owned?.id,
            canCollect: owned ? canCollectFromBusiness(owned.last_collected, owned.collect_cooldown_minutes) : false,
            lastCollected: owned?.last_collected,
            cooldownMinutes,
            timeRemainingMinutes: timeRemaining,
            rushCost,
        };
    });

    // Calculate cooldown remaining as formatted string
    const getCooldownRemaining = (lastCollected: string | undefined, cooldownMinutes: number): string => {
        if (!lastCollected) return '';
        const lastDate = new Date(lastCollected);
        const now = new Date();
        const minutesPassed = (now.getTime() - lastDate.getTime()) / (1000 * 60);
        const remaining = Math.max(0, cooldownMinutes - minutesPassed);
        if (remaining <= 0) return '';
        const hours = Math.floor(remaining / 60);
        const mins = Math.floor(remaining % 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const handleAction = (
        type: 'buy' | 'upgrade' | 'collect',
        businessName: string,
        businessId: string,
        cost: number,
        playerBusinessId?: string
    ) => {
        setPendingAction({ type, business: businessName, businessId, cost, playerBusinessId });
        if (type === 'collect') {
            // Direct collect without confirmation
            performCollect(playerBusinessId!);
        } else {
            setConfirmOpen(true);
        }
    };

    const performCollect = async (playerBusinessId: string) => {
        setIsProcessing(true);
        try {
            const income = await collectIncome(playerBusinessId);
            if (income > 0) {
                rewardCash(income); // Show reward animation
                toast({
                    title: 'Income Collected!',
                    description: `You collected $${income.toLocaleString()} from your business.`,
                });
                await refetchPlayer();
            } else {
                toast({
                    title: 'Nothing to Collect',
                    description: 'Come back later to collect more income.',
                });
            }
        } catch (error) {
            console.error('Collection error:', error);
            toast({
                title: 'Error',
                description: 'Failed to collect income. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
            setPendingAction(null);
        }
    };

    const handleRushCollect = async (playerBusinessId: string, businessName: string) => {
        setRushingId(playerBusinessId);
        try {
            const result = await rushBusinessCollect(playerBusinessId);
            if (result.success) {
                if (result.income_collected) {
                    rewardCash(result.income_collected);
                }
                toast({
                    title: '⚡ Rush Collect!',
                    description: `Collected $${result.income_collected?.toLocaleString()} from ${businessName} (5💎)`,
                });
                await refetchPlayer();
            } else {
                toast({
                    title: 'Rush Failed',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Rush collect error:', error);
            toast({
                title: 'Error',
                description: 'Failed to rush collect.',
                variant: 'destructive',
            });
        } finally {
            setRushingId(null);
        }
    };

    const confirmAction = async () => {
        if (!pendingAction) return;

        setIsProcessing(true);
        setConfirmOpen(false);

        try {
            let success = false;

            if (pendingAction.type === 'buy') {
                success = await buyBusiness(pendingAction.businessId);
            } else if (pendingAction.type === 'upgrade' && pendingAction.playerBusinessId) {
                success = await upgradeBusiness(pendingAction.playerBusinessId);
            }

            if (success) {
                toast({
                    title: pendingAction.type === 'buy' ? 'Business Purchased!' : 'Business Upgraded!',
                    description: `${pendingAction.business} ${pendingAction.type === 'buy' ? 'is now yours' : 'has been upgraded'}!`,
                });
                await refetchPlayer();
            } else {
                toast({
                    title: 'Insufficient Funds',
                    description: `You don't have enough cash for this ${pendingAction.type === 'buy' ? 'purchase' : 'upgrade'}.`,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Business action error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
            setPendingAction(null);
        }
    };

    const totalIncome = ownedBusinesses.reduce((sum, b) => sum + b.income_per_hour, 0);

    // Loading state
    if (isAuthLoading || isLoadingDefinitions) {
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
                style={{ backgroundImage: 'url(/images/backgrounds/business.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <img src="/images/icons/business.png" alt="Business" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Business Empire</h1>
                        <p className="text-xs text-muted-foreground">Invest in income-generating ventures</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-4 mb-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Hourly Income</p>
                            <p className="font-cinzel font-bold text-2xl text-primary flex items-center gap-1">
                                <TrendingUp className="w-5 h-5" />
                                ${totalIncome.toLocaleString()}/hr
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Businesses Owned</p>
                            <p className="font-cinzel font-bold text-lg text-foreground">
                                {ownedBusinesses.length}/{businessDefinitions.length}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="manage" className="font-cinzel text-xs">Manage</TabsTrigger>
                        <TabsTrigger value="produce" className="font-cinzel text-xs">
                            <Factory className="w-3 h-3 mr-1" /> Produce
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manage" className="mt-0">

                        {isLoadingBusinesses ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allBusinesses.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No businesses available</p>
                                ) : (
                                    allBusinesses.map((business, index) => (
                                        <BusinessCard
                                            key={business.id}
                                            name={business.name}
                                            description={business.description || ''}
                                            image={business.image_url || `/images/businesses/${business.name.toLowerCase().replace(/\s+/g, '')}.png`}
                                            level={business.level}
                                            maxLevel={business.max_level}
                                            income={business.income_per_hour}
                                            upgradeCost={business.upgrade_cost}
                                            cooldown={formatCooldown(business.collect_cooldown_minutes)}
                                            cooldownRemaining={getCooldownRemaining(business.lastCollected, business.cooldownMinutes)}
                                            cooldownMinutes={business.cooldownMinutes}
                                            timeRemainingMinutes={business.timeRemainingMinutes}
                                            owned={business.owned}
                                            canCollect={business.canCollect}
                                            delay={0.1 * index}
                                            isProcessing={isProcessing && pendingAction?.businessId === business.id}
                                            isRushing={rushingId === business.playerBusinessId}
                                            rushCost={business.rushCost}
                                            onBuy={() => handleAction('buy', business.name, business.id, business.base_purchase_cost)}
                                            onUpgrade={() => handleAction('upgrade', business.name, business.id, business.upgrade_cost, business.playerBusinessId)}
                                            onCollect={() => handleAction('collect', business.name, business.id, 0, business.playerBusinessId)}
                                            onRushCollect={business.owned && business.playerBusinessId ? () => handleRushCollect(business.playerBusinessId!, business.name) : undefined}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="produce" className="mt-0">
                        {isLoadingRecipes ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : recipes.length === 0 ? (
                            <div className="noir-card p-8 text-center">
                                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">No production recipes available.</p>
                                <p className="text-xs text-muted-foreground mt-1">Own businesses to unlock production.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recipes.map((recipe, index) => (
                                    <motion.div
                                        key={recipe.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.1 * index }}
                                        className={`noir-card p-4 ${!recipe.owns_business ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h3 className="font-cinzel font-semibold text-sm text-foreground">{recipe.business_name}</h3>
                                                <p className="text-xs text-muted-foreground">Produces: {recipe.output_item_name}</p>
                                            </div>
                                            {recipe.owns_business && (
                                                <span className="text-xs text-primary">Lv. {recipe.business_level}</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div className="bg-muted/20 rounded-sm p-2 text-center">
                                                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                                                    <Users className="w-3 h-3" />
                                                    <span>Crew Cost</span>
                                                </div>
                                                <p className={`font-cinzel font-bold text-sm ${recipe.crew_owned >= recipe.crew_required ? 'text-green-400' : 'text-red-400'}`}>
                                                    {recipe.crew_owned}/{recipe.crew_required}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">{recipe.crew_name}</p>
                                            </div>
                                            <div className="bg-muted/20 rounded-sm p-2 text-center">
                                                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                                                    <Package className="w-3 h-3" />
                                                    <span>Output</span>
                                                </div>
                                                <p className="font-cinzel font-bold text-sm text-primary">{recipe.output_quantity}x</p>
                                                <p className="text-[10px] text-muted-foreground">+Lv bonus</p>
                                            </div>
                                            <div className="bg-muted/20 rounded-sm p-2 text-center">
                                                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>Cooldown</span>
                                                </div>
                                                <p className="font-cinzel font-bold text-sm text-foreground">{recipe.cooldown_hours}h</p>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full btn-gold text-xs"
                                            disabled={
                                                !recipe.can_produce ||
                                                producingRecipeId === recipe.id
                                            }
                                            onClick={() => handleProduce(recipe.id)}
                                        >
                                            {producingRecipeId === recipe.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : !recipe.owns_business ? (
                                                'Need Business'
                                            ) : recipe.crew_owned < recipe.crew_required ? (
                                                `Need ${recipe.crew_required - recipe.crew_owned} more ${recipe.crew_name}`
                                            ) : recipe.last_produced_at && !recipe.can_produce ? (
                                                'On Cooldown'
                                            ) : (
                                                <><Factory className="w-4 h-4 mr-1" /> Produce</>
                                            )}
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={pendingAction?.type === 'buy' ? 'Purchase Business?' : 'Upgrade Business?'}
                description={`This will cost $${pendingAction?.cost.toLocaleString()}. Are you sure you want to proceed?`}
                onConfirm={confirmAction}
            />
        </MainLayout>
    );
};

export default BusinessPage;
