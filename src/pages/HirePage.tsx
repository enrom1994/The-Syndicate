import { motion } from 'framer-motion';
import { Users, Shield, Sword, DollarSign, Star, Plus } from 'lucide-react';
import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface CrewMemberCardProps {
    name: string;
    type: 'Enforcer' | 'Bodyguard' | 'Hitman' | 'Driver' | 'Accountant';
    description: string;
    attackBonus: number;
    defenseBonus: number;
    cost: number;
    upkeep: number;
    available: number;
    delay?: number;
    onHire: () => void;
}

const typeIcons = {
    Enforcer: <Sword className="w-5 h-5" />,
    Bodyguard: <Shield className="w-5 h-5" />,
    Hitman: <Sword className="w-5 h-5" />,
    Driver: <Users className="w-5 h-5" />,
    Accountant: <DollarSign className="w-5 h-5" />,
};

const typeColors = {
    Enforcer: 'text-red-400',
    Bodyguard: 'text-blue-400',
    Hitman: 'text-purple-400',
    Driver: 'text-green-400',
    Accountant: 'text-yellow-400',
};

const CrewMemberCard = ({
    name,
    type,
    description,
    attackBonus,
    defenseBonus,
    cost,
    upkeep,
    available,
    delay = 0,
    onHire
}: CrewMemberCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                <span className="text-primary-foreground">{typeIcons[type]}</span>
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{name}</h3>
                    <span className={`text-xs font-medium ${typeColors[type]}`}>{type}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3 text-center">
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">ATK</p>
                <p className="font-cinzel font-bold text-sm text-red-400">+{attackBonus}</p>
            </div>
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">DEF</p>
                <p className="font-cinzel font-bold text-sm text-blue-400">+{defenseBonus}</p>
            </div>
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">Cost</p>
                <p className="font-cinzel font-bold text-sm text-primary">${cost.toLocaleString()}</p>
            </div>
            <div className="bg-muted/20 rounded-sm p-2">
                <p className="text-[10px] text-muted-foreground">Upkeep</p>
                <p className="font-cinzel font-bold text-sm text-muted-foreground">${upkeep}/hr</p>
            </div>
        </div>

        <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
                <Star className="w-3 h-3 inline mr-1" />
                {available} available
            </span>
            <Button className="btn-gold text-xs" onClick={onHire} disabled={available === 0}>
                <Plus className="w-4 h-4 mr-1" />
                Hire
            </Button>
        </div>
    </motion.div>
);

const HirePage = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('all');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingHire, setPendingHire] = useState<{ name: string; cost: number } | null>(null);

    const crewMembers = [
        {
            name: 'Street Thug',
            type: 'Enforcer' as const,
            description: 'Basic muscle for your operations',
            attackBonus: 2,
            defenseBonus: 1,
            cost: 1000,
            upkeep: 50,
            available: 99
        },
        {
            name: 'Bodyguard',
            type: 'Bodyguard' as const,
            description: 'Protects you from attacks',
            attackBonus: 1,
            defenseBonus: 5,
            cost: 5000,
            upkeep: 150,
            available: 25
        },
        {
            name: 'Professional Hitman',
            type: 'Hitman' as const,
            description: 'Expert assassin for special jobs',
            attackBonus: 10,
            defenseBonus: 2,
            cost: 25000,
            upkeep: 500,
            available: 5
        },
        {
            name: 'Getaway Driver',
            type: 'Driver' as const,
            description: 'Improves escape chance on failed attacks',
            attackBonus: 0,
            defenseBonus: 3,
            cost: 8000,
            upkeep: 200,
            available: 15
        },
        {
            name: 'Crooked Accountant',
            type: 'Accountant' as const,
            description: 'Reduces upkeep costs by 5%',
            attackBonus: 0,
            defenseBonus: 0,
            cost: 50000,
            upkeep: 100,
            available: 3
        },
        {
            name: 'Enforcer Captain',
            type: 'Enforcer' as const,
            description: 'Leads your enforcers, boosting their effectiveness',
            attackBonus: 15,
            defenseBonus: 5,
            cost: 75000,
            upkeep: 750,
            available: 2
        },
        {
            name: 'Personal Guard',
            type: 'Bodyguard' as const,
            description: 'Elite protection, very hard to kill',
            attackBonus: 3,
            defenseBonus: 15,
            cost: 100000,
            upkeep: 1000,
            available: 1
        },
    ];

    const filteredCrew = activeTab === 'all'
        ? crewMembers
        : crewMembers.filter(c => c.type.toLowerCase() === activeTab);

    const handleHireClick = (name: string, cost: number) => {
        setPendingHire({ name, cost });
        setConfirmOpen(true);
    };

    const confirmHire = () => {
        if (pendingHire) {
            toast({
                title: 'Crew Member Hired!',
                description: `${pendingHire.name} has joined your crew.`,
            });
        }
        setConfirmOpen(false);
        setPendingHire(null);
    };

    // Calculate totals
    const totalAttack = 45; // Mock - will come from actual hired crew
    const totalDefense = 32;
    const totalUpkeep = 850;

    return (
        <MainLayout>
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/hire.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Hire Crew</h1>
                        <p className="text-xs text-muted-foreground">Recruit members to grow your strength</p>
                    </div>
                </motion.div>

                {/* Stats Summary */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-4 mb-6"
                >
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground">Total Attack</p>
                            <p className="font-cinzel font-bold text-lg text-red-400">+{totalAttack}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Defense</p>
                            <p className="font-cinzel font-bold text-lg text-blue-400">+{totalDefense}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Upkeep/hr</p>
                            <p className="font-cinzel font-bold text-lg text-primary">${totalUpkeep}</p>
                        </div>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="all" className="font-cinzel text-[10px]">
                            All
                        </TabsTrigger>
                        <TabsTrigger value="enforcer" className="font-cinzel text-[10px]">
                            Enforcers
                        </TabsTrigger>
                        <TabsTrigger value="bodyguard" className="font-cinzel text-[10px]">
                            Guards
                        </TabsTrigger>
                        <TabsTrigger value="hitman" className="font-cinzel text-[10px]">
                            Hitmen
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-3 mt-0">
                        {filteredCrew.map((member, index) => (
                            <CrewMemberCard
                                key={member.name}
                                {...member}
                                delay={0.05 * index}
                                onHire={() => handleHireClick(member.name, member.cost)}
                            />
                        ))}
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Hire Crew Member?"
                description={`Hire ${pendingHire?.name} for $${pendingHire?.cost.toLocaleString()}? They will add to your attack/defense stats but require hourly upkeep.`}
                onConfirm={confirmHire}
                confirmText="Hire"
            />
        </MainLayout>
    );
};

export default HirePage;
