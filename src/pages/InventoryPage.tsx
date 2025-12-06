import { motion } from 'framer-motion';
import { Package, Sword, Shield, Users, FlaskConical, Check, X } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface InventoryItemProps {
    name: string;
    quantity: number;
    stat?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
    icon: React.ReactNode;
    equipped?: boolean;
    delay?: number;
    onEquip?: () => void;
    onUnequip?: () => void;
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

const InventoryItem = ({ name, quantity, stat, rarity, icon, equipped, delay = 0, onEquip, onUnequip }: InventoryItemProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className={`noir-card p-3 border-l-2 ${rarityColors[rarity]} ${equipped ? 'ring-1 ring-primary' : ''}`}
    >
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center shrink-0">
                {icon}
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
            {equipped ? (
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={onUnequip}>
                    <X className="w-3 h-3 mr-1" />
                    Remove
                </Button>
            ) : (
                <Button className="btn-gold h-8 px-2 text-xs" onClick={onEquip}>
                    <Check className="w-3 h-3 mr-1" />
                    Equip
                </Button>
            )}
        </div>
    </motion.div>
);

interface CrewMemberProps {
    name: string;
    type: string;
    level: number;
    stat: string;
    delay?: number;
}

const CrewMember = ({ name, type, level, stat, delay = 0 }: CrewMemberProps) => (
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
                <p className="text-xs text-muted-foreground">{type} • Lv. {level}</p>
            </div>
            <div className="text-right">
                <p className="text-xs text-primary">{stat}</p>
            </div>
        </div>
    </motion.div>
);

const InventoryPage = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('weapons');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'equip' | 'unequip' | 'sell'; item: string } | null>(null);

    const [weapons, setWeapons] = useState([
        { name: 'Tommy Gun', quantity: 2, stat: '+15 Attack', rarity: 'rare' as const, icon: <Sword className="w-5 h-5 text-muted-foreground" />, equipped: true },
        { name: 'Brass Knuckles', quantity: 5, stat: '+5 Attack', rarity: 'common' as const, icon: <Sword className="w-5 h-5 text-muted-foreground" />, equipped: false },
        { name: 'Switchblade', quantity: 8, stat: '+3 Attack', rarity: 'common' as const, icon: <Sword className="w-5 h-5 text-muted-foreground" />, equipped: false },
        { name: 'Sawed-off Shotgun', quantity: 1, stat: '+10 Attack', rarity: 'uncommon' as const, icon: <Sword className="w-5 h-5 text-muted-foreground" />, equipped: false },
    ]);

    const [equipment, setEquipment] = useState([
        { name: 'Armored Vest', quantity: 1, stat: '+20 Defense', rarity: 'rare' as const, icon: <Shield className="w-5 h-5 text-muted-foreground" />, equipped: true },
        { name: 'Fedora Hat', quantity: 1, stat: '+5 Respect', rarity: 'uncommon' as const, icon: <Shield className="w-5 h-5 text-muted-foreground" />, equipped: false },
        { name: 'Gold Watch', quantity: 1, stat: '+10% Income', rarity: 'legendary' as const, icon: <Shield className="w-5 h-5 text-muted-foreground" />, equipped: true },
    ]);

    const contraband = [
        { name: 'Whiskey Crate', quantity: 12, stat: 'Sells for $3,500', rarity: 'common' as const, icon: <FlaskConical className="w-5 h-5 text-muted-foreground" /> },
        { name: 'Cuban Cigars', quantity: 8, stat: 'Sells for $2,500', rarity: 'uncommon' as const, icon: <FlaskConical className="w-5 h-5 text-muted-foreground" /> },
        { name: 'Morphine Vials', quantity: 3, stat: 'Sells for $8,000', rarity: 'rare' as const, icon: <FlaskConical className="w-5 h-5 text-muted-foreground" /> },
    ];

    const crew = [
        { name: 'Luca Brasi', type: 'Enforcer', level: 5, stat: '+25 Defense' },
        { name: 'Rocco Lampone', type: 'Hitman', level: 4, stat: '+20 Attack' },
        { name: 'Al Neri', type: 'Bodyguard', level: 3, stat: '+15 Defense' },
        { name: 'Willie Cicci', type: 'Driver', level: 2, stat: '+10% Escape' },
        { name: 'Carlo Rizzi', type: 'Accountant', level: 2, stat: '+5% Income' },
    ];

    const handleEquip = (item: string, category: 'weapons' | 'equipment') => {
        if (category === 'weapons') {
            setWeapons(prev => prev.map(w => ({ ...w, equipped: w.name === item ? true : w.equipped })));
        } else {
            setEquipment(prev => prev.map(e => ({ ...e, equipped: e.name === item ? true : e.equipped })));
        }
        toast({
            title: 'Item Equipped!',
            description: `${item} is now equipped.`,
        });
    };

    const handleUnequip = (item: string, category: 'weapons' | 'equipment') => {
        if (category === 'weapons') {
            setWeapons(prev => prev.map(w => ({ ...w, equipped: w.name === item ? false : w.equipped })));
        } else {
            setEquipment(prev => prev.map(e => ({ ...e, equipped: e.name === item ? false : e.equipped })));
        }
        toast({
            title: 'Item Removed',
            description: `${item} has been unequipped.`,
        });
    };

    const handleSellAll = () => {
        setPendingAction({ type: 'sell', item: 'all contraband' });
        setConfirmOpen(true);
    };

    const confirmAction = () => {
        if (pendingAction?.type === 'sell') {
            const total = 12 * 3500 + 8 * 2500 + 3 * 8000;
            toast({
                title: 'Contraband Sold!',
                description: `You earned $${total.toLocaleString()} from selling all contraband.`,
            });
        }
        setConfirmOpen(false);
        setPendingAction(null);
    };

    const totalItems = weapons.reduce((sum, w) => sum + w.quantity, 0) +
        equipment.reduce((sum, e) => sum + e.quantity, 0) +
        contraband.reduce((sum, c) => sum + c.quantity, 0);

    // Calculate stat bonuses from equipped items
    const equippedWeapons = weapons.filter(w => w.equipped);
    const equippedEquipment = equipment.filter(e => e.equipped);
    const totalAttackBonus = equippedWeapons.reduce((sum, w) => sum + parseInt(w.stat?.replace(/[^0-9]/g, '') || '0'), 0);
    const totalDefenseBonus = equippedEquipment.filter(e => e.stat?.includes('Defense')).reduce((sum, e) => sum + parseInt(e.stat?.replace(/[^0-9]/g, '') || '0'), 0);

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
                        <p className="text-xs text-muted-foreground">{totalItems} items • {crew.length} crew members</p>
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
                    <div className="grid grid-cols-2 gap-3">
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

                    <TabsContent value="weapons" className="space-y-2 mt-0">
                        {weapons.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-8">No weapons owned</p>
                        ) : (
                            weapons.map((item, index) => (
                                <InventoryItem
                                    key={item.name}
                                    {...item}
                                    delay={0.05 * index}
                                    onEquip={() => handleEquip(item.name, 'weapons')}
                                    onUnequip={() => handleUnequip(item.name, 'weapons')}
                                />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="equipment" className="space-y-2 mt-0">
                        {equipment.map((item, index) => (
                            <InventoryItem
                                key={item.name}
                                {...item}
                                delay={0.05 * index}
                                onEquip={() => handleEquip(item.name, 'equipment')}
                                onUnequip={() => handleUnequip(item.name, 'equipment')}
                            />
                        ))}
                    </TabsContent>

                    <TabsContent value="contraband" className="space-y-2 mt-0">
                        {contraband.map((item, index) => (
                            <InventoryItem key={item.name} {...item} delay={0.05 * index} />
                        ))}
                        <Button className="w-full mt-4 btn-gold text-xs" onClick={handleSellAll}>
                            Sell All Contraband
                        </Button>
                    </TabsContent>

                    <TabsContent value="crew" className="space-y-2 mt-0">
                        {crew.map((member, index) => (
                            <CrewMember key={member.name} {...member} delay={0.05 * index} />
                        ))}
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Sell All Contraband?"
                description="This will sell all your contraband items for a total of $86,000. Are you sure?"
                onConfirm={confirmAction}
                confirmText="Sell"
            />
        </MainLayout>
    );
};

export default InventoryPage;
