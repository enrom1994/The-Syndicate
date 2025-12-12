import { motion } from 'framer-motion';
import { Users, Crown, Plus, Search, ArrowLeft, UserPlus, Loader2, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Family {
    id: string;
    name: string;
    tag: string | null;
    description: string | null;
    treasury: number;
    total_respect: number;
    is_recruiting: boolean;
    join_type?: 'open' | 'request';
    min_level_required: number;
    member_count: number;
    boss_name: string | null;
}

interface FamilyCardProps {
    family: Family;
    delay?: number;
    onJoin: () => void;
    isJoining: boolean;
    userInFamily: boolean;
}

const FamilyCard = ({ family, delay = 0, onJoin, isJoining, userInFamily }: FamilyCardProps) => (
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
                        {family.tag ? `[${family.tag}] ` : ''}{family.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                        {family.member_count} members • Boss: {family.boss_name || 'Unknown'}
                    </p>
                </div>
            </div>
            <span className={`px-2 py-0.5 text-[10px] rounded-sm ${family.join_type === 'request'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
                }`}>
                {family.join_type === 'request' ? 'Request-Only' : 'Open'}
            </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-muted/20 p-2 rounded-sm">
                <span className="text-muted-foreground">Treasury</span>
                <p className="font-cinzel font-bold text-primary">${family.treasury.toLocaleString()}</p>
            </div>
            <div className="bg-muted/20 p-2 rounded-sm">
                <span className="text-muted-foreground">Min Level</span>
                <p className="font-cinzel font-bold text-foreground">Lv. {family.min_level_required}</p>
            </div>
        </div>

        {family.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{family.description}</p>
        )}

        <Button
            className="w-full btn-gold text-xs"
            onClick={onJoin}
            disabled={isJoining || userInFamily}
        >
            {userInFamily ? (
                'Already in Family'
            ) : isJoining ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
                <UserPlus className="w-4 h-4 mr-1" />
            )}
            {!userInFamily && (family.join_type === 'request' ? 'Request to Join' : 'Join Family')}
        </Button>
    </motion.div>
);

const BrowseFamiliesPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { player } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [families, setFamilies] = useState<Family[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userInFamily, setUserInFamily] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [codeDialogOpen, setCodeDialogOpen] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [isJoiningByCode, setIsJoiningByCode] = useState(false);

    const loadFamilies = async (query?: string) => {
        try {
            const { data, error } = await supabase.rpc('search_families', {
                search_query: query || null,
                result_limit: 20
            });

            if (error) throw error;
            setFamilies(data as Family[] || []);
        } catch (error) {
            console.error('Failed to load families:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkFamily = async () => {
            if (!player?.id) return;
            try {
                const { data } = await supabase.rpc('get_player_family', {
                    target_player_id: player.id
                });
                setUserInFamily(!!data?.has_family);
            } catch (error) {
                console.error('Failed to check family:', error);
            }
        };
        checkFamily();
        loadFamilies();
    }, [player?.id]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadFamilies(searchQuery);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const handleJoin = (family: Family) => {
        setSelectedFamily(family);
        setConfirmOpen(true);
    };

    const confirmJoin = async () => {
        if (!player?.id || !selectedFamily) return;

        setConfirmOpen(false);
        setIsJoining(true);

        try {
            const isRequestOnly = selectedFamily.join_type === 'request';
            const rpcName = isRequestOnly ? 'request_to_join_family' : 'join_family';
            const params = isRequestOnly
                ? { requester_id: player.id, family_id_input: selectedFamily.id, message_input: null }
                : { joiner_id: player.id, target_family_id: selectedFamily.id };

            const { data, error } = await supabase.rpc(rpcName, params);

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({
                    title: isRequestOnly ? 'Request Sent!' : 'Welcome!',
                    description: data.message,
                });
                if (!isRequestOnly) {
                    navigate('/family');
                }
            } else {
                toast({
                    title: isRequestOnly ? 'Cannot Send Request' : 'Cannot Join',
                    description: data?.message || 'Failed to join family',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Join error:', error);
            toast({
                title: 'Error',
                description: 'Failed to join family. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsJoining(false);
        }
    };

    const handleJoinByCode = async () => {
        if (!player?.id || !inviteCode.trim()) return;

        setIsJoiningByCode(true);

        try {
            const { data, error } = await supabase.rpc('join_family_by_code', {
                player_id_input: player.id,
                invite_code_input: inviteCode.trim().toUpperCase()
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({
                    title: data.requires_approval ? 'Request Sent!' : 'Welcome!',
                    description: data.message,
                });
                setCodeDialogOpen(false);
                setInviteCode('');
                if (!data.requires_approval) {
                    navigate('/family');
                }
            } else {
                toast({
                    title: 'Cannot Join',
                    description: data?.message || 'Failed to join family',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Join by code error:', error);
            toast({
                title: 'Error',
                description: 'Failed to join family. Please check your code.',
                variant: 'destructive',
            });
        } finally {
            setIsJoiningByCode(false);
        }
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

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-4 space-y-2"
                >
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            className="border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => setCodeDialogOpen(true)}
                        >
                            <Hash className="w-4 h-4 mr-2" />
                            Join by Code
                        </Button>
                        <Button
                            className="btn-gold"
                            onClick={() => navigate('/family/create')}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Family
                        </Button>
                    </div>
                </motion.div>

                {/* Families List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {families.map((family, index) => (
                            <FamilyCard
                                key={family.id}
                                family={family}
                                delay={0.1 * index}
                                onJoin={() => handleJoin(family)}
                                isJoining={isJoining && selectedFamily?.id === family.id}
                                userInFamily={userInFamily}
                            />
                        ))}
                    </div>
                )}

                {!isLoading && families.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="text-sm text-muted-foreground">No families found</p>
                        <p className="text-xs text-muted-foreground mt-1">Be the first to create one!</p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={selectedFamily?.join_type === 'request' ? 'Request to Join?' : 'Join Family?'}
                description={
                    selectedFamily?.join_type === 'request'
                        ? `Request to join ${selectedFamily?.name}? The family leaders will review your request.`
                        : `Join ${selectedFamily?.name}? You will start as a Recruit.`
                }
                onConfirm={confirmJoin}
                confirmText={selectedFamily?.join_type === 'request' ? 'Send Request' : 'Join'}
            />

            {/* Join by Code Dialog */}
            <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-cinzel">Join by Invite Code</DialogTitle>
                        <DialogDescription>
                            Enter the invite code shared by a family member
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            placeholder="Enter invite code (e.g., A3F8B2C1)"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            className="bg-muted/30 border-border/50 font-mono text-center text-lg tracking-widest"
                            maxLength={10}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && inviteCode.trim()) {
                                    handleJoinByCode();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="btn-gold"
                            onClick={handleJoinByCode}
                            disabled={isJoiningByCode || !inviteCode.trim()}
                        >
                            {isJoiningByCode ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Hash className="w-4 h-4 mr-2" />
                            )}
                            Join Family
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
};

export default BrowseFamiliesPage;
