import { motion } from 'framer-motion';
import { Package, Sword, Shield, Users, FlaskConical, Check, X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, InventoryItem as InventoryItemType, HiredCrew } from '@/hooks/useGameStore';

interface InventoryItemProps {
    id: string;
    name: string;
    quantity: number;
    stat?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
    category: 'weapon' | 'equipment' | 'contraband';
    iconUrl: string | null;  // Changed from React.ReactNode to string
    equipped?: boolean;
    isProcessing?: boolean;
    delay?: number;
    onEquip?: () => void;
    onUnequip?: () => void;
    onSell?: () => void;
}

const rarityColors = {
    common: 'border-muted-foreground/30',
    uncommon: 'border-green-500/50',
    rare: 'border-blue-500/50',
    legendary: 'border-primary/50',
};

const rarityBadgeColors = {
    common: 'bg-muted text-muted-foreground',
    uncommon: 'bg-green-500/20 text-green-500',
    rare: 'bg-blue-500/20 text-blue-500',
    legendary: 'bg-primary/20 text-primary',
};

const InventoryItemComponent = ({
    id, name, quantity, stat, rarity, category, iconUrl, equipped, isProcessing, delay = 0,
    onEquip, onUnequip, onSell
}: InventoryItemProps) => {
    // Fallback icon based on category
    const FallbackIcon = category === 'weapon' ? Sword : category === 'equipment' ? Shield : FlaskConical;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`noir-card p-3 border-l-2 ${rarityColors[rarity]} ${equipped ? 'ring-1 ring-primary' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {iconUrl ? (
                        <img
                            src={iconUrl}
                            alt={name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                                // On error, hide image and show fallback icon
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <FallbackIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-cinzel font-semibold text-sm text-foreground truncate">{name}</h3>
                        {equipped && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-sm">
                                EQUIPPED
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-sm ${rarityBadgeColors[rarity]}`}>
                            {rarity.toUpperCase()}
                        </span>
                        {stat && <span className="text-xs text-primary">{stat}</span>}
                    </div>
                </div>
                <div className="text-right mr-2">
                    <p className="font-cinzel font-bold text-sm text-foreground">x{quantity}</p>
                </div>
                {category === 'contraband' ? (
                    <Button
                        className="btn-gold h-8 px-2 text-xs"
                        onClick={onSell}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sell'}
                    </Button>
                ) : equipped ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={onUnequip}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                            <>
                                <X className="w-3 h-3 mr-1" />
                                Remove
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        className="btn-gold h-8 px-2 text-xs"
                        onClick={onEquip}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                            <>
                                <Check className="w-3 h-3 mr-1" />
                                Equip
                            </>
                        )}
                    </Button>
                )}
            </div>
        </motion.div>
    );
};

interface CrewMemberProps {
    name: string;
    type: string;
    quantity: number;
    attackBonus: number;
    defenseBonus: number;
    delay?: number;
}

const CrewMember = ({ name, type, quantity, attackBonus, defenseBonus, delay = 0 }: CrewMemberProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-3"
    >
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
                <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
                <p className="text-xs text-muted-foreground">{type} • x{quantity}</p>
            </div>
            <div className="text-right">
                {attackBonus > 0 && <p className="text-xs text-red-400">+{attackBonus} ATK</p>}
                {defenseBonus > 0 && <p className="text-xs text-blue-400">+{defenseBonus} DEF</p>}
            </div>
        </div>
    </motion.div>
);

const InventoryPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const {
        inventory,
        crew: hiredCrew,
        isLoadingInventory,
        loadInventory,
        equipItem,
        unequipItem,
        sellItem,
        getEquipmentLimits
    } = useGameStore();

    const [activeTab, setActiveTab] = useState('weapons');
    const [processingItemId, setProcessingItemId] = useState<string | null>(null);

    // Filter inventory by category
    const weapons = inventory.filter(i => i.category === 'weapon');
    const equipment = inventory.filter(i => i.category === 'equipment');
    const contraband = inventory.filter(i => i.category === 'contraband');

    const formatStat = (item: InventoryItemType): string => {
        if (item.attack_bonus > 0) return `+${item.attack_bonus} Attack`;
        if (item.defense_bonus > 0) return `+${item.defense_bonus} Defense`;
        if (item.income_bonus > 0) return `+${item.income_bonus}% Income`;
        if (item.sell_price > 0 && item.category === 'contraband') return `Sells for $${item.sell_price.toLocaleString()}`;
        return '';
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'weapon':
                return <Sword className="w-5 h-5 text-muted-foreground" />;
            case 'equipment':
                return <Shield className="w-5 h-5 text-muted-foreground" />;
            case 'contraband':
                return <FlaskConical className="w-5 h-5 text-muted-foreground" />;
            default:
                return <Package className="w-5 h-5 text-muted-foreground" />;
        }
    };

    const handleEquip = async (item: InventoryItemType) => {
        // Check equipment limits based on crew
        const { weaponSlots, equipmentSlots, equippedWeapons, equippedEquipment } = getEquipmentLimits();

        if (item.category === 'weapon' && equippedWeapons >= weaponSlots) {
            toast({
                title: 'No Weapon Slots',
                description: weaponSlots === 0
                    ? 'Hire Hitmen or Enforcers to equip weapons.'
                    : `You can only equip ${weaponSlots} weapons. Unequip one first or hire more crew.`,
                variant: 'destructive',
            });
            return;
        }

        if (item.category === 'equipment' && equippedEquipment >= equipmentSlots) {
            toast({
                title: 'No Equipment Slots',
                description: equipmentSlots === 0
                    ? 'Hire Bodyguards to equip defensive gear.'
                    : `You can only equip ${equipmentSlots} items. Unequip one first or hire more Bodyguards.`,
                variant: 'destructive',
            });
            return;
        }

        setProcessingItemId(item.id);
        try {
            const success = await equipItem(item.id);
            if (success) {
                await refetchPlayer(); // Refresh player stats
                toast({
                    title: 'Item Equipped!',
                    description: `${item.name} is now equipped.`,
                });
            } else {
                toast({
                    title: 'Error',
                    description: 'Failed to equip item.',
                    variant: 'destructive',
                });
            }
        } finally {
            setProcessingItemId(null);
        }
    };

    const handleUnequip = async (item: InventoryItemType) => {
        setProcessingItemId(item.id);
        try {
            const success = await unequipItem(item.id);
            if (success) {
                await refetchPlayer(); // Refresh player stats
                toast({
                    title: 'Item Removed',
                    description: `${item.name} has been unequipped.`,
                });
            } else {
                toast({
                    title: 'Error',
                    description: 'Failed to unequip item.',
                    variant: 'destructive',
                });
            }
        } finally {
            setProcessingItemId(null);
        }
    };

    const handleSell = async (item: InventoryItemType) => {
        setProcessingItemId(item.id);
        try {
            const success = await sellItem(item.id, 1);
            if (success) {
                toast({
                    title: 'Item Sold!',
                    description: `You earned $${item.sell_price.toLocaleString()} from selling ${item.name}.`,
                });
                await refetchPlayer();
            } else {
                toast({
                    title: 'Error',
                    description: 'Failed to sell item.',
                    variant: 'destructive',
                });
            }
        } finally {
            setProcessingItemId(null);
        }
    };

    // Calculate stat bonuses from equipped items
    const equippedItems = inventory.filter(i => i.is_equipped);
    const totalAttackBonus = equippedItems.reduce((sum, i) => sum + i.attack_bonus, 0) +
        hiredCrew.reduce((sum, c) => sum + (c.attack_bonus * c.quantity), 0);
    const totalDefenseBonus = equippedItems.reduce((sum, i) => sum + i.defense_bonus, 0) +
        hiredCrew.reduce((sum, c) => sum + (c.defense_bonus * c.quantity), 0);

    const totalItems = inventory.reduce((sum, i) => sum + i.quantity, 0);

    // Loading state
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
                style={{ backgroundImage: 'url(/images/backgrounds/warehouse.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Inventory</h1>
                        <p className="text-xs text-muted-foreground">{totalItems} items • {hiredCrew.length} crew types</p>
                    </div>
                </motion.div>

                {/* Equipped Stats Summary */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-4 mb-6"
                >
                    <h3 className="font-cinzel text-xs text-muted-foreground mb-2">EQUIPPED BONUSES</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <Sword className="w-4 h-4 text-red-400" />
                            <span className="text-xs text-muted-foreground">Attack:</span>
                            <span className="font-cinzel font-bold text-sm text-red-400">+{totalAttackBonus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-muted-foreground">Defense:</span>
                            <span className="font-cinzel font-bold text-sm text-blue-400">+{totalDefenseBonus}</span>
                        </div>
                    </div>
                    {/* Slot usage */}
                    {(() => {
                        const { weaponSlots, equipmentSlots, equippedWeapons, equippedEquipment } = getEquipmentLimits();
                        return (
                            <div className="flex gap-4 text-xs text-muted-foreground border-t border-muted/20 pt-2">
                                <span>Weapons: <span className={equippedWeapons >= weaponSlots ? 'text-red-400' : 'text-primary'}>{equippedWeapons}/{weaponSlots || 0}</span></span>
                                <span>Equipment: <span className={equippedEquipment >= equipmentSlots ? 'text-red-400' : 'text-primary'}>{equippedEquipment}/{equipmentSlots || 0}</span></span>
                            </div>
                        );
                    })()}
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="weapons" className="font-cinzel text-[10px]">
                            Weapons
                        </TabsTrigger>
                        <TabsTrigger value="equipment" className="font-cinzel text-[10px]">
                            Equip
                        </TabsTrigger>
                        <TabsTrigger value="contraband" className="font-cinzel text-[10px]">
                            Goods
                        </TabsTrigger>
                        <TabsTrigger value="crew" className="font-cinzel text-[10px]">
                            Crew
                        </TabsTrigger>
                    </TabsList>

                    {isLoadingInventory ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <TabsContent value="weapons" className="space-y-2 mt-0">
                                {weapons.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-8">No weapons owned</p>
                                ) : (
                                    weapons.map((item, index) => (
                                        <InventoryItemComponent
                                            key={item.id}
                                            id={item.id}
                                            name={item.name}
                                            quantity={item.quantity}
                                            stat={formatStat(item)}
                                            rarity={item.rarity}
                                            category={item.category}
                                            iconUrl={item.icon}
                                            equipped={item.is_equipped}
                                            isProcessing={processingItemId === item.id}
                                            delay={0.05 * index}
                                            onEquip={() => handleEquip(item)}
                                            onUnequip={() => handleUnequip(item)}
                                        />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="equipment" className="space-y-2 mt-0">
                                {equipment.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-8">No equipment owned</p>
                                ) : (
                                    equipment.map((item, index) => (
                                        <InventoryItemComponent
                                            key={item.id}
                                            id={item.id}
                                            name={item.name}
                                            quantity={item.quantity}
                                            stat={formatStat(item)}
                                            rarity={item.rarity}
                                            category={item.category}
                                            iconUrl={item.icon}
                                            equipped={item.is_equipped}
                                            isProcessing={processingItemId === item.id}
                                            delay={0.05 * index}
                                            onEquip={() => handleEquip(item)}
                                            onUnequip={() => handleUnequip(item)}
                                        />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="contraband" className="space-y-2 mt-0">
                                {contraband.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-8">No contraband to sell</p>
                                ) : (
                                    contraband.map((item, index) => (
                                        <InventoryItemComponent
                                            key={item.id}
                                            id={item.id}
                                            name={item.name}
                                            quantity={item.quantity}
                                            stat={formatStat(item)}
                                            rarity={item.rarity}
                                            category={item.category}
                                            iconUrl={item.icon}
                                            isProcessing={processingItemId === item.id}
                                            delay={0.05 * index}
                                            onSell={() => handleSell(item)}
                                        />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="crew" className="space-y-2 mt-0">
                                {hiredCrew.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-8">No crew hired yet</p>
                                ) : (
                                    hiredCrew.map((member, index) => (
                                        <CrewMember
                                            key={member.id}
                                            name={member.name}
                                            type={member.type}
                                            quantity={member.quantity}
                                            attackBonus={member.attack_bonus}
                                            defenseBonus={member.defense_bonus}
                                            delay={0.05 * index}
                                        />
                                    ))
                                )}
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>
        </MainLayout>
    );
};

export default InventoryPage;
