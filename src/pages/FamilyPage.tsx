import { motion } from 'framer-motion';
import { Crown, Star, Shield, Sword, User, Users, MoreVertical, Eye, ArrowUp, ArrowDown, UserMinus, Plus, LogOut, Settings, Loader2 } from 'lucide-react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { GameIcon } from '@/components/GameIcon';

type FamilyRole = 'Boss' | 'Underboss' | 'Consigliere' | 'Caporegime' | 'Soldier' | 'Street Runner';

interface Member {
    player_id: string;
    username: string | null;
    first_name: string | null;
    role: FamilyRole;
    contribution: number;
    level: number;
    respect: number;
    joined_at: string;
}

interface FamilyData {
    id: string;
    name: string;
    tag: string | null;
    description: string | null;
    treasury: number;
    total_respect: number;
    is_recruiting: boolean;
    min_level_required: number;
    created_at: string;
}

interface PlayerFamilyResponse {
    has_family: boolean;
    family?: FamilyData;
    my_role?: FamilyRole;
    my_contribution?: number;
    members?: Member[];
}

const roleHierarchy: FamilyRole[] = ['Boss', 'Underboss', 'Consigliere', 'Caporegime', 'Soldier', 'Street Runner'];
const roleIcons: Record<FamilyRole, React.ReactNode> = {
    'Boss': <Crown className="w-4 h-4 text-primary" />,
    'Underboss': <Star className="w-4 h-4 text-yellow-400" />,
    'Consigliere': <Shield className="w-4 h-4 text-blue-400" />,
    'Caporegime': <Sword className="w-4 h-4 text-red-400" />,
    'Soldier': <User className="w-4 h-4 text-muted-foreground" />,
    'Street Runner': <User className="w-4 h-4 text-muted-foreground/50" />,
};

// Permission checks based on role
const canPromote = (myRole: FamilyRole, targetRole: FamilyRole): boolean => {
    if (myRole === 'Boss') return targetRole !== 'Boss' && roleHierarchy.indexOf(targetRole) > 1;
    if (myRole === 'Underboss') return roleHierarchy.indexOf(targetRole) >= 4;
    return false;
};

const canDemote = (myRole: FamilyRole, targetRole: FamilyRole): boolean => {
    const targetIndex = roleHierarchy.indexOf(targetRole);
    if (myRole === 'Boss') return targetIndex > 0 && targetIndex < roleHierarchy.length - 1;
    if (myRole === 'Underboss') return targetIndex >= 3 && targetIndex < roleHierarchy.length - 1;
    return false;
};

const canKick = (myRole: FamilyRole, targetRole: FamilyRole): boolean => {
    if (myRole === 'Boss') return targetRole !== 'Boss';
    if (myRole === 'Underboss') return roleHierarchy.indexOf(targetRole) >= 3;
    return false;
};

const canInvite = (role: FamilyRole): boolean => {
    return ['Boss', 'Underboss', 'Consigliere', 'Caporegime'].includes(role);
};

interface MemberCardProps {
    member: Member;
    myRole: FamilyRole;
    isMe: boolean;
    delay?: number;
    onAction: (member: Member, action: 'promote' | 'demote' | 'kick' | 'view' | 'transfer') => void;
}

const MemberCard = ({ member, myRole, isMe, delay = 0, onAction }: MemberCardProps) => {
    const showActions = !isMe && myRole !== 'Soldier' && myRole !== 'Street Runner';
    const canPromoteThis = canPromote(myRole, member.role);
    const canDemoteThis = canDemote(myRole, member.role);
    const canKickThis = canKick(myRole, member.role);
    const displayName = member.username || member.first_name || 'Unknown';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`flex items-center gap-3 p-3 rounded-sm ${isMe ? 'bg-primary/10 border border-primary/30' : 'bg-muted/20'}`}
        >
            <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMe ? 'bg-gradient-gold' : 'bg-muted'}`}>
                    {roleIcons[member.role]}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-cinzel font-semibold text-sm truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                    {displayName} {isMe && <span className="text-xs font-inter">(You)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{member.role} • Lv.{member.level}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Contributed</p>
                <p className="font-cinzel font-bold text-sm text-primary">${member.contribution.toLocaleString()}</p>
            </div>
            {showActions && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onAction(member, 'view')}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canPromoteThis && (
                            <DropdownMenuItem onClick={() => onAction(member, 'promote')}>
                                <ArrowUp className="w-4 h-4 mr-2 text-green-400" />
                                Promote
                            </DropdownMenuItem>
                        )}
                        {canDemoteThis && (
                            <DropdownMenuItem onClick={() => onAction(member, 'demote')}>
                                <ArrowDown className="w-4 h-4 mr-2 text-yellow-400" />
                                Demote
                            </DropdownMenuItem>
                        )}
                        {myRole === 'Boss' && member.role !== 'Boss' && (
                            <DropdownMenuItem onClick={() => onAction(member, 'transfer')}>
                                <Crown className="w-4 h-4 mr-2 text-primary" />
                                Transfer Leadership
                            </DropdownMenuItem>
                        )}
                        {canKickThis && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => onAction(member, 'kick')}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    Kick
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </motion.div>
    );
};

const FamilyPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { player, refetchPlayer } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [familyData, setFamilyData] = useState<PlayerFamilyResponse | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [myRole, setMyRole] = useState<FamilyRole>('Street Runner');

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: string; member: Member | null }>({ type: '', member: null });
    const [isProcessing, setIsProcessing] = useState(false);

    const [contributeOpen, setContributeOpen] = useState(false);
    const [contributeAmount, setContributeAmount] = useState(10000);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');

    const [leaveOpen, setLeaveOpen] = useState(false);

    // Load family data
    const loadFamilyData = async () => {
        if (!player?.id) return;

        try {
            const { data, error } = await supabase.rpc('get_player_family', {
                target_player_id: player.id
            });

            if (error) throw error;

            const response = data as PlayerFamilyResponse;
            setFamilyData(response);

            if (response.has_family && response.members) {
                setMembers(response.members);
                setMyRole(response.my_role || 'Street Runner');
            }
        } catch (error) {
            console.error('Failed to load family data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load family data',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFamilyData();
    }, [player?.id]);

    // Sort members by role hierarchy
    const sortedMembers = [...members].sort((a, b) =>
        roleHierarchy.indexOf(a.role) - roleHierarchy.indexOf(b.role)
    );

    const handleMemberAction = (member: Member, action: 'promote' | 'demote' | 'kick' | 'view' | 'transfer') => {
        if (action === 'view') {
            toast({ title: 'Opening Profile', description: `Viewing ${member.username || member.first_name}'s profile...` });
            return;
        }
        setConfirmAction({ type: action, member });
        setConfirmOpen(true);
    };

    const confirmMemberAction = async () => {
        const { type, member } = confirmAction;
        if (!member || !player?.id) return;

        setIsProcessing(true);
        setConfirmOpen(false);

        try {
            let result;

            if (type === 'promote' || type === 'demote') {
                const currentIndex = roleHierarchy.indexOf(member.role);
                const newRole = type === 'promote'
                    ? roleHierarchy[currentIndex - 1]
                    : roleHierarchy[currentIndex + 1];

                const { data, error } = await supabase.rpc('set_member_role', {
                    actor_id: player.id,
                    target_player_id: member.player_id,
                    new_role: newRole
                });
                if (error) throw error;
                result = data;

                if (result?.success) {
                    haptic.success();
                    toast({ title: type === 'promote' ? 'Member Promoted' : 'Member Demoted', description: result.message });
                    await loadFamilyData();
                }
            } else if (type === 'kick') {
                const { data, error } = await supabase.rpc('kick_member', {
                    actor_id: player.id,
                    target_player_id: member.player_id
                });
                if (error) throw error;
                result = data;

                if (result?.success) {
                    haptic.success();
                    toast({ title: 'Member Removed', description: result.message, variant: 'destructive' });
                    await loadFamilyData();
                }
            } else if (type === 'transfer') {
                const { data, error } = await supabase.rpc('transfer_boss', {
                    current_boss_id: player.id,
                    new_boss_id: member.player_id
                });
                if (error) throw error;
                result = data;

                if (result?.success) {
                    haptic.success();
                    toast({ title: 'Leadership Transferred', description: result.message });
                    await loadFamilyData();
                }
            }

            if (result && !result.success) {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            console.error('Action error:', error);
            toast({ title: 'Error', description: 'Action failed. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleContribute = async () => {
        if (!player?.id || contributeAmount <= 0) return;

        setIsProcessing(true);

        try {
            const { data, error } = await supabase.rpc('contribute_to_treasury', {
                contributor_id: player.id,
                amount: contributeAmount
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({ title: 'Contribution Made', description: data.message });
                setContributeOpen(false);
                await refetchPlayer();
                await loadFamilyData();
            } else {
                toast({ title: 'Error', description: data?.message || 'Failed to contribute', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Contribute error:', error);
            toast({ title: 'Error', description: 'Failed to contribute. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInvite = async () => {
        if (!player?.id || !inviteUsername.trim()) return;

        setIsProcessing(true);

        try {
            const { data, error } = await supabase.rpc('invite_to_family', {
                inviter_id: player.id,
                invitee_username: inviteUsername.trim(),
                message_input: null
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({ title: 'Invite Sent', description: data.message });
                setInviteOpen(false);
                setInviteUsername('');
            } else {
                toast({ title: 'Error', description: data?.message || 'Failed to send invite', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Invite error:', error);
            toast({ title: 'Error', description: 'Failed to send invite. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLeaveFamily = async () => {
        if (!player?.id) return;

        setIsProcessing(true);
        setLeaveOpen(false);

        try {
            const { data, error } = await supabase.rpc('leave_family', {
                leaver_id: player.id
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({ title: 'Left Family', description: data.message });
                await refetchPlayer();
                navigate('/family/browse');
            } else {
                toast({ title: 'Error', description: data?.message || 'Failed to leave family', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Leave error:', error);
            toast({ title: 'Error', description: 'Failed to leave family. Please try again.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    // If player has no family, show option to browse/create
    if (!familyData?.has_family) {
        return (
            <MainLayout>
                <div className="py-12 px-4 text-center">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <h1 className="font-cinzel text-xl font-bold text-foreground mb-2">No Family</h1>
                    <p className="text-sm text-muted-foreground mb-6">
                        Join a crime family or create your own empire
                    </p>
                    <div className="space-y-2">
                        <Button className="w-full btn-gold" onClick={() => navigate('/family/browse')}>
                            <Users className="w-4 h-4 mr-2" />
                            Browse Families
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/family/create')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Family
                        </Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const family = familyData.family!;

    return (
        <MainLayout>
            {/* Background Image */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/family.png)' }}
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
                            <Users className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-cinzel text-xl font-bold text-foreground">
                                {family.tag ? `[${family.tag}] ` : ''}{family.name}
                            </h1>
                            <p className="text-xs text-muted-foreground">{members.length} Members</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={() => navigate('/family/browse')}
                            title="Browse Families"
                        >
                            <Users className="w-5 h-5" />
                        </Button>
                        {(myRole === 'Boss' || myRole === 'Underboss') && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => navigate('/family/settings')}
                                title="Family Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-4 mb-6"
                >
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Total Respect</p>
                            <p className="font-cinzel font-bold text-lg text-primary">{family.total_respect.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Your Role</p>
                            <p className="font-cinzel font-bold text-lg text-foreground">{myRole}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Treasury</p>
                            <p className="font-cinzel font-bold text-lg text-foreground">${family.treasury.toLocaleString()}</p>
                        </div>
                    </div>
                    <Button className="w-full btn-gold text-xs" onClick={() => setContributeOpen(true)} disabled={isProcessing}>
                        <GameIcon type="cash" className="w-4 h-4 mr-2" />
                        Contribute to Treasury
                    </Button>
                </motion.div>

                {/* Members */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-cinzel text-sm font-semibold text-foreground flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Members
                        </h2>
                        {canInvite(myRole) && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-primary"
                                onClick={() => setInviteOpen(true)}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Invite
                            </Button>
                        )}
                    </div>
                    <div className="noir-card p-4 space-y-2">
                        {sortedMembers.map((member, index) => (
                            <MemberCard
                                key={member.player_id}
                                member={member}
                                myRole={myRole}
                                isMe={member.player_id === player?.id}
                                delay={0.05 * index}
                                onAction={handleMemberAction}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Leave Family Button */}
                {myRole !== 'Boss' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6"
                    >
                        <Button
                            variant="outline"
                            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => setLeaveOpen(true)}
                            disabled={isProcessing}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Leave Family
                        </Button>
                    </motion.div>
                )}
            </div>

            {/* Contribute Dialog */}
            <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-cinzel">Contribute to Treasury</DialogTitle>
                        <DialogDescription>
                            Support your family's operations
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Your Cash:</span>
                            <span className="font-bold">${(player?.cash ?? 0).toLocaleString()}</span>
                        </div>
                        <Input
                            type="number"
                            value={contributeAmount}
                            onChange={(e) => setContributeAmount(parseInt(e.target.value) || 0)}
                            className="bg-muted/30 border-border/50"
                            min={1000}
                            max={player?.cash ?? 0}
                        />
                        <div className="grid grid-cols-4 gap-2">
                            {[10000, 50000, 100000, 500000].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setContributeAmount(Math.min(amount, player?.cash ?? 0))}
                                    className="p-2 text-[10px] rounded-sm bg-muted/30 border border-border/50 text-muted-foreground hover:border-primary/50"
                                >
                                    ${(amount / 1000)}K
                                </button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setContributeOpen(false)}>Cancel</Button>
                        <Button className="btn-gold" onClick={handleContribute} disabled={isProcessing || contributeAmount <= 0}>
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Contribute ${contributeAmount.toLocaleString()}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Action Dialog */}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={
                    confirmAction.type === 'promote' ? 'Promote Member?' :
                        confirmAction.type === 'demote' ? 'Demote Member?' :
                            confirmAction.type === 'kick' ? 'Kick Member?' :
                                'Transfer Leadership?'
                }
                description={
                    confirmAction.type === 'promote' ? `Promote ${confirmAction.member?.username || confirmAction.member?.first_name} to a higher rank?` :
                        confirmAction.type === 'demote' ? `Demote ${confirmAction.member?.username || confirmAction.member?.first_name} to a lower rank?` :
                            confirmAction.type === 'kick' ? `Remove ${confirmAction.member?.username || confirmAction.member?.first_name} from the family? This cannot be undone.` :
                                `Transfer Boss role to ${confirmAction.member?.username || confirmAction.member?.first_name}? You will become Underboss.`
                }
                onConfirm={confirmMemberAction}
                confirmText={
                    confirmAction.type === 'promote' ? 'Promote' :
                        confirmAction.type === 'demote' ? 'Demote' :
                            confirmAction.type === 'kick' ? 'Kick' :
                                'Transfer'
                }
                variant={confirmAction.type === 'kick' ? 'destructive' : 'default'}
            />

            {/* Invite Member Dialog */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-cinzel">Invite Member</DialogTitle>
                        <DialogDescription>
                            Enter the username of the player you want to invite
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            placeholder="Enter username..."
                            value={inviteUsername}
                            onChange={(e) => setInviteUsername(e.target.value)}
                            className="bg-muted/30 border-border/50"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && inviteUsername.trim()) {
                                    handleInvite();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                        <Button
                            className="btn-gold"
                            onClick={handleInvite}
                            disabled={isProcessing || !inviteUsername.trim()}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Send Invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Leave Family Confirm */}
            <ConfirmDialog
                open={leaveOpen}
                onOpenChange={setLeaveOpen}
                title="Leave Family?"
                description="Are you sure you want to leave the family? You will lose your position and contributions."
                onConfirm={handleLeaveFamily}
                confirmText="Leave"
                variant="destructive"
            />
        </MainLayout>
    );
};

export default FamilyPage;
