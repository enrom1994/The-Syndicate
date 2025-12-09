import { motion } from 'framer-motion';
import { Package, Sword, Shield, Users, FlaskConical, Loader2, Lock, Unlock, Gavel, Plus, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
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
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, InventoryItem as InventoryItemType, HiredCrew, AssignmentLimits } from '@/hooks/useGameStore';

// Rarity colors
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

// Inventory Item Component - New design with assignment display
interface InventoryItemProps {
    item: InventoryItemType;
    isProcessing: boolean;
    onAssign: () => void;
    onMoveToSafe: () => void;
    onMoveFromSafe: () => void;
    onSell?: () => void;
    delay?: number;
}

const InventoryItemComponent = ({
    item, isProcessing, onAssign, onMoveToSafe, onMoveFromSafe, onSell, delay = 0
}: InventoryItemProps) => {
    const FallbackIcon = item.category === 'weapon' ? Sword : item.category === 'equipment' ? Shield : FlaskConical;
    const hasAssigned = item.assigned_quantity > 0;

    const formatStat = (): string => {
        if (item.attack_bonus > 0) return `+${item.attack_bonus} ATK`;
        if (item.defense_bonus > 0) return `+${item.defense_bonus} DEF`;
        if (item.income_bonus > 0) return `+${item.income_bonus}% Income`;
        return '';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`noir-card p-3 border-l-2 ${rarityColors[item.rarity]} ${hasAssigned ? 'ring-1 ring-primary/50' : ''}`}
        >
            <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.icon ? (
                        <img
                            src={item.icon}
                            alt={item.name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : (
                        <FallbackIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>

                {/* Name & Stats */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-cinzel font-semibold text-sm text-foreground truncate">{item.name}</h3>
                        {item.location === 'safe' && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-500 rounded-sm flex items-center gap-0.5">
                                <Lock className="w-2 h-2" /> SAFE
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-sm ${rarityBadgeColors[item.rarity]}`}>
                            {item.rarity.toUpperCase()}
                        </span>
                        <span className="text-xs text-primary">{formatStat()}</span>
                    </div>
                </div>

                {/* Quantity & Assignment */}
                <div className="text-right mr-2">
                    <p className="font-cinzel font-bold text-sm text-foreground">x{item.quantity}</p>
                    {item.category !== 'contraband' && (
                        <p className={`text-[10px] ${hasAssigned ? 'text-primary' : 'text-muted-foreground'}`}>
                            {item.assigned_quantity}/{item.quantity} armed
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                {item.category === 'contraband' ? (
                    <Button className="btn-gold h-8 px-2 text-xs" onClick={onSell}>
                        <Gavel className="w-3 h-3 mr-1" />
                        Auction
                    </Button>
                ) : item.location === 'safe' ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={onMoveFromSafe}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                            <>
                                <Unlock className="w-3 h-3 mr-1" />
                                Remove
                            </>
                        )}
                    </Button>
                ) : (
                    <div className="flex gap-1">
                        <Button
                            className="btn-gold h-8 px-2 text-xs"
                            onClick={onAssign}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-1.5 text-xs"
                            onClick={onMoveToSafe}
                            disabled={isProcessing || item.assigned_quantity > 0}
                            title={item.assigned_quantity > 0 ? 'Unassign first' : 'Move to Safe'}
                        >
                            <Lock className="w-3 h-3" />
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Crew Member Component
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
    const navigate = useNavigate();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const {
        inventory,
        crew: hiredCrew,
        isLoadingInventory,
        loadInventory,
        assignEquipment,
        sellItem,
        moveToSafe,
        moveFromSafe,
        getAssignmentLimits,
    } = useGameStore();

    const [activeTab, setActiveTab] = useState('weapons');
    const [processingItemId, setProcessingItemId] = useState<string | null>(null);

    // Assignment dialog state
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItemType | null>(null);
    const [assignQuantity, setAssignQuantity] = useState(0);
    const [limits, setLimits] = useState<AssignmentLimits | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);

    // Load assignment limits on mount
    useEffect(() => {
        const loadLimits = async () => {
            const data = await getAssignmentLimits();
            if (data) setLimits(data);
        };
        loadLimits();
    }, [getAssignmentLimits, inventory]);

    // Filter inventory by category
    const weapons = inventory.filter(i => i.category === 'weapon');
    const equipment = inventory.filter(i => i.category === 'equipment');
    const contraband = inventory.filter(i => i.category === 'contraband');

    // Calculate totals
    const totalCrew = hiredCrew.reduce((sum, c) => sum + c.quantity, 0);
    const totalAssignedWeapons = weapons.reduce((sum, w) => sum + w.assigned_quantity, 0);
    const totalAssignedEquipment = equipment.reduce((sum, e) => sum + e.assigned_quantity, 0);

    // Calculate attack/defense bonuses from assigned items + crew
    const assignedAttackBonus = weapons.reduce((sum, w) => sum + (w.attack_bonus * w.assigned_quantity), 0) +
        hiredCrew.reduce((sum, c) => sum + (c.attack_bonus * c.quantity), 0);
    const assignedDefenseBonus = equipment.reduce((sum, e) => sum + (e.defense_bonus * e.assigned_quantity), 0) +
        hiredCrew.reduce((sum, c) => sum + (c.defense_bonus * c.quantity), 0);

    const totalItems = inventory.reduce((sum, i) => sum + i.quantity, 0);

    // Open assignment dialog
    const openAssignDialog = (item: InventoryItemType) => {
        setSelectedItem(item);
        setAssignQuantity(item.assigned_quantity);
        setAssignDialogOpen(true);
    };

    // Handle assignment
    const handleAssign = async () => {
        if (!selectedItem) return;

        setIsAssigning(true);
        try {
            const result = await assignEquipment(selectedItem.id, assignQuantity);
            if (result.success) {
                toast({
                    title: 'Equipment Updated',
                    description: result.message,
                });
                await refetchPlayer();
                // Refresh limits
                const newLimits = await getAssignmentLimits();
                if (newLimits) setLimits(newLimits);
            } else {
                toast({
                    title: 'Failed',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Assignment error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsAssigning(false);
            setAssignDialogOpen(false);
            setSelectedItem(null);
        }
    };

    const handleSell = (item: InventoryItemType) => {
        navigate('/auction');
    };

    const handleMoveToSafe = async (item: InventoryItemType) => {
        setProcessingItemId(item.id);
        try {
            const success = await moveToSafe(item.id);
            if (success) {
                toast({
                    title: 'Item Secured!',
                    description: `${item.name} moved to safe. Protected from theft!`,
                });
            } else {
                toast({
                    title: 'Error',
                    description: 'Failed to move item to safe.',
                    variant: 'destructive',
                });
            }
        } finally {
            setProcessingItemId(null);
        }
    };

    const handleMoveFromSafe = async (item: InventoryItemType) => {
        setProcessingItemId(item.id);
        try {
            const success = await moveFromSafe(item.id);
            if (success) {
                toast({
                    title: 'Item Retrieved',
                    description: `${item.name} moved to inventory.`,
                });
            } else {
                toast({
                    title: 'Cooldown Active',
                    description: 'Item is still in cooldown. Wait before removing from safe.',
                    variant: 'destructive',
                });
            }
        } finally {
            setProcessingItemId(null);
        }
    };

    // Calculate max assignable for dialog
    const getMaxAssignable = (): number => {
        if (!selectedItem || !limits) return 0;

        const currentlyAssigned = selectedItem.category === 'weapon'
            ? totalAssignedWeapons - selectedItem.assigned_quantity
            : totalAssignedEquipment - selectedItem.assigned_quantity;

        const slotsRemaining = totalCrew - currentlyAssigned;
        return Math.min(selectedItem.quantity, Math.max(0, slotsRemaining));
    };

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
                    <img src="/images/icons/inventory.png" alt="Inventory" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Inventory</h1>
                        <p className="text-xs text-muted-foreground">{totalItems} items • {hiredCrew.length} crew types</p>
                    </div>
                </motion.div>

                {/* Combat Stats Summary */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-4 mb-6"
                >
                    <h3 className="font-cinzel text-xs text-muted-foreground mb-2">COMBAT STATS</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <Sword className="w-4 h-4 text-red-400" />
                            <span className="text-xs text-muted-foreground">Attack:</span>
                            <span className="font-cinzel font-bold text-sm text-red-400">+{assignedAttackBonus.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-muted-foreground">Defense:</span>
                            <span className="font-cinzel font-bold text-sm text-blue-400">+{assignedDefenseBonus.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Armed Crew Status */}
                    <div className="border-t border-muted/20 pt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Armed Crew (Weapons)</span>
                            <span className={totalAssignedWeapons < totalCrew ? 'text-yellow-400' : 'text-green-400'}>
                                {totalAssignedWeapons}/{totalCrew}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-red-400 transition-all"
                                style={{ width: `${totalCrew > 0 ? (totalAssignedWeapons / totalCrew) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Armored Crew (Equipment)</span>
                            <span className={totalAssignedEquipment < totalCrew ? 'text-yellow-400' : 'text-green-400'}>
                                {totalAssignedEquipment}/{totalCrew}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-400 transition-all"
                                style={{ width: `${totalCrew > 0 ? (totalAssignedEquipment / totalCrew) * 100 : 0}%` }}
                            />
                        </div>
                        {(totalAssignedWeapons < totalCrew || totalAssignedEquipment < totalCrew) && (
                            <p className="text-[10px] text-yellow-400 mt-2">
                                ⚠️ {Math.max(totalCrew - totalAssignedWeapons, totalCrew - totalAssignedEquipment)} crew members are unarmed/unarmored
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Inventory Tabs */}
                <Tabs defaultValue="weapons" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full grid grid-cols-4 mb-4">
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
                                            item={item}
                                            isProcessing={processingItemId === item.id}
                                            delay={0.05 * index}
                                            onAssign={() => openAssignDialog(item)}
                                            onMoveToSafe={() => handleMoveToSafe(item)}
                                            onMoveFromSafe={() => handleMoveFromSafe(item)}
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
                                            item={item}
                                            isProcessing={processingItemId === item.id}
                                            delay={0.05 * index}
                                            onAssign={() => openAssignDialog(item)}
                                            onMoveToSafe={() => handleMoveToSafe(item)}
                                            onMoveFromSafe={() => handleMoveFromSafe(item)}
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
                                            item={item}
                                            isProcessing={processingItemId === item.id}
                                            delay={0.05 * index}
                                            onAssign={() => { }}
                                            onMoveToSafe={() => handleMoveToSafe(item)}
                                            onMoveFromSafe={() => handleMoveFromSafe(item)}
                                            onSell={() => handleSell(item)}
                                        />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="crew" className="space-y-2 mt-0">
                                {hiredCrew.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-8">No crew hired</p>
                                ) : (
                                    hiredCrew.map((member, index) => (
                                        <CrewMember
                                            key={member.id}
                                            name={member.name}
                                            type={member.type}
                                            quantity={member.quantity}
                                            attackBonus={member.attack_bonus * member.quantity}
                                            defenseBonus={member.defense_bonus * member.quantity}
                                            delay={0.05 * index}
                                        />
                                    ))
                                )}
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>

            {/* Assignment Dialog */}
            <AlertDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground">
                            Assign {selectedItem?.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Arm your crew with this {selectedItem?.category}. Assigned items provide combat bonuses.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {selectedItem && (
                        <div className="py-4 space-y-4">
                            {/* Current Stats */}
                            <div className="bg-muted/20 p-3 rounded-lg space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Owned</span>
                                    <span className="text-foreground font-bold">{selectedItem.quantity}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Currently Assigned</span>
                                    <span className="text-primary font-bold">{selectedItem.assigned_quantity}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Total Crew</span>
                                    <span className="text-foreground font-bold">{totalCrew}</span>
                                </div>
                                <div className="flex justify-between text-xs border-t border-muted/30 pt-2">
                                    <span className="text-muted-foreground">Max Assignable</span>
                                    <span className="text-green-400 font-bold">{getMaxAssignable()}</span>
                                </div>
                            </div>

                            {/* Quantity Selector */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Assign Quantity:</span>
                                    <span className="font-cinzel font-bold text-lg text-primary">{assignQuantity}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAssignQuantity(Math.max(0, assignQuantity - 10))}
                                        disabled={assignQuantity <= 0}
                                    >
                                        <Minus className="w-3 h-3" />
                                    </Button>
                                    <Slider
                                        value={[assignQuantity]}
                                        onValueChange={(v) => setAssignQuantity(v[0])}
                                        max={getMaxAssignable()}
                                        min={0}
                                        step={1}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAssignQuantity(Math.min(getMaxAssignable(), assignQuantity + 10))}
                                        disabled={assignQuantity >= getMaxAssignable()}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>

                                {/* Quick buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => setAssignQuantity(0)}
                                    >
                                        None
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => setAssignQuantity(Math.floor(getMaxAssignable() / 2))}
                                    >
                                        Half
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => setAssignQuantity(getMaxAssignable())}
                                    >
                                        Max
                                    </Button>
                                </div>
                            </div>

                            {/* Bonus Preview */}
                            <div className="bg-primary/10 p-3 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Combat Bonus from this item:</p>
                                {selectedItem.category === 'weapon' ? (
                                    <p className="font-cinzel font-bold text-red-400">
                                        +{(selectedItem.attack_bonus * assignQuantity).toLocaleString()} Attack
                                    </p>
                                ) : (
                                    <p className="font-cinzel font-bold text-blue-400">
                                        +{(selectedItem.defense_bonus * assignQuantity).toLocaleString()} Defense
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isAssigning}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAssign}
                            className="btn-gold"
                            disabled={isAssigning}
                        >
                            {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default InventoryPage;
