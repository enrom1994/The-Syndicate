import { motion } from 'framer-motion';
import { Users, Crown, Plus, Coins, Search, Star, Shield, ArrowLeft, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

interface FamilyCardProps {
    name: string;
    tag: string;
    memberCount: number;
    maxMembers: number;
    rank: number;
    netWorth: string;
    recruitmentStatus: 'open' | 'invite-only' | 'closed';
    minLevel: number;
    delay?: number;
    onApply: () => void;
}

const FamilyCard = ({
    name, tag, memberCount, maxMembers, rank, netWorth,
    recruitmentStatus, minLevel, delay = 0, onApply
}: FamilyCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="noir-card p-4"
    >
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-cinzel font-bold text-sm text-foreground">
                        [{tag}] {name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                        Rank #{rank} • {memberCount}/{maxMembers} members
                    </p>
                </div>
            </div>
            <span className={`px-2 py-0.5 text-[10px] rounded-sm ${recruitmentStatus === 'open'
                    ? 'bg-green-500/20 text-green-400'
                    : recruitmentStatus === 'invite-only'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                }`}>
                {recruitmentStatus === 'open' ? 'Open' : recruitmentStatus === 'invite-only' ? 'Invite Only' : 'Closed'}
            </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-muted/20 p-2 rounded-sm">
                <span className="text-muted-foreground">Net Worth</span>
                <p className="font-cinzel font-bold text-primary">{netWorth}</p>
            </div>
            <div className="bg-muted/20 p-2 rounded-sm">
                <span className="text-muted-foreground">Min Level</span>
                <p className="font-cinzel font-bold text-foreground">Lv. {minLevel}</p>
            </div>
        </div>

        {recruitmentStatus === 'open' && (
            <Button className="w-full btn-gold text-xs" onClick={onApply}>
                <UserPlus className="w-4 h-4 mr-1" />
                Apply to Join
            </Button>
        )}
        {recruitmentStatus === 'invite-only' && (
            <Button variant="outline" className="w-full text-xs" disabled>
                Invite Required
            </Button>
        )}
        {recruitmentStatus === 'closed' && (
            <Button variant="outline" className="w-full text-xs" disabled>
                Not Recruiting
            </Button>
        )}
    </motion.div>
);

const BrowseFamiliesPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

    // Mock data
    const families = [
        { name: 'The Corleone Family', tag: 'CRL', memberCount: 32, maxMembers: 50, rank: 1, netWorth: '$482M', recruitmentStatus: 'invite-only' as const, minLevel: 10 },
        { name: 'Barzini Syndicate', tag: 'BRZ', memberCount: 28, maxMembers: 50, rank: 2, netWorth: '$356M', recruitmentStatus: 'open' as const, minLevel: 5 },
        { name: 'Tattaglia Crime Ring', tag: 'TAT', memberCount: 45, maxMembers: 50, rank: 3, netWorth: '$289M', recruitmentStatus: 'open' as const, minLevel: 3 },
        { name: 'Stracci Brothers', tag: 'STR', memberCount: 18, maxMembers: 30, rank: 4, netWorth: '$145M', recruitmentStatus: 'closed' as const, minLevel: 1 },
        { name: 'Cuneo Organization', tag: 'CUN', memberCount: 22, maxMembers: 40, rank: 5, netWorth: '$98M', recruitmentStatus: 'open' as const, minLevel: 1 },
    ];

    const filteredFamilies = families.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleApply = (familyName: string) => {
        setSelectedFamily(familyName);
        setConfirmOpen(true);
    };

    const confirmApply = () => {
        toast({
            title: 'Application Sent!',
            description: `Your application to join ${selectedFamily} has been submitted.`,
        });
        setConfirmOpen(false);
    };

    return (
        <MainLayout>
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/family.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/family')}
                        className="text-muted-foreground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Search className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Browse Families</h1>
                        <p className="text-xs text-muted-foreground">Find your new organization</p>
                    </div>
                </motion.div>

                {/* Search */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-4"
                >
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or tag..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-muted/30 border-border/50"
                        />
                    </div>
                </motion.div>

                {/* Create Family Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-4"
                >
                    <Button
                        className="w-full btn-gold"
                        onClick={() => navigate('/family/create')}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your Own Family
                    </Button>
                </motion.div>

                {/* Families List */}
                <div className="space-y-3">
                    {filteredFamilies.map((family, index) => (
                        <FamilyCard
                            key={family.tag}
                            {...family}
                            delay={0.1 * index}
                            onApply={() => handleApply(family.name)}
                        />
                    ))}
                </div>

                {filteredFamilies.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="text-sm text-muted-foreground">No families found</p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Apply to Join?"
                description={`Send an application to join ${selectedFamily}? The family leadership will review your request.`}
                onConfirm={confirmApply}
                confirmText="Apply"
            />
        </MainLayout>
    );
};

export default BrowseFamiliesPage;
