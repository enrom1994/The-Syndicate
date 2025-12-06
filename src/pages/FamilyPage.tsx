import { motion } from 'framer-motion';
import { Crown, Star, Shield, Sword, User, Users, MoreVertical, Eye, ArrowUp, ArrowDown, UserMinus, Plus, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
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
    id: string;
    name: string;
    role: FamilyRole;
    contribution: string;
    online: boolean;
    level: number;
    respect: number;
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
    const myIndex = roleHierarchy.indexOf(myRole);
    const targetIndex = roleHierarchy.indexOf(targetRole);
    if (myRole === 'Boss') return targetIndex > 0; // Boss can promote anyone except to Boss
    if (myRole === 'Underboss') return targetIndex >= 4; // Underboss can promote Soldiers only
    return false;
};

const canDemote = (myRole: FamilyRole, targetRole: FamilyRole): boolean => {
    const myIndex = roleHierarchy.indexOf(myRole);
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
                {member.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-cinzel font-semibold text-sm truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                    {member.name} {isMe && <span className="text-xs font-inter">(You)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{member.role} • Lv.{member.level}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Contributed</p>
                <p className="font-cinzel font-bold text-sm text-primary">{member.contribution}</p>
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

    // Mock data - will come from context/backend
    const hasFamily = true; // Toggle to show browse page for players without family
    const myRole: FamilyRole = 'Boss'; // Current player's role
    const myId = 'player-1';

    const [members, setMembers] = useState<Member[]>([
        { id: 'player-1', name: 'Michael', role: 'Boss', contribution: '$250K', online: true, level: 45, respect: 12500 },
        { id: '2', name: 'Tom Hagen', role: 'Consigliere', contribution: '$180K', online: true, level: 38, respect: 8900 },
        { id: '3', name: 'Sonny', role: 'Underboss', contribution: '$210K', online: false, level: 42, respect: 11200 },
        { id: '4', name: 'Clemenza', role: 'Caporegime', contribution: '$145K', online: true, level: 35, respect: 7800 },
        { id: '5', name: 'Luca Brasi', role: 'Soldier', contribution: '$125K', online: true, level: 30, respect: 5600 },
        { id: '6', name: 'Rocco Lampone', role: 'Soldier', contribution: '$89K', online: true, level: 25, respect: 3200 },
        { id: '7', name: 'Al Neri', role: 'Street Runner', contribution: '$67K', online: false, level: 18, respect: 1500 },
    ]);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: string; member: Member | null }>({ type: '', member: null });
    const [contributeOpen, setContributeOpen] = useState(false);
    const [contributeAmount, setContributeAmount] = useState(10000);
    const [leaveOpen, setLeaveOpen] = useState(false);

    const playerCash = 5000000;

    // Sort members by role hierarchy
    const sortedMembers = [...members].sort((a, b) =>
        roleHierarchy.indexOf(a.role) - roleHierarchy.indexOf(b.role)
    );

    const handleMemberAction = (member: Member, action: 'promote' | 'demote' | 'kick' | 'view' | 'transfer') => {
        if (action === 'view') {
            // Navigate to profile page
            toast({ title: 'Opening Profile', description: `Viewing ${member.name}'s profile...` });
            return;
        }
        setConfirmAction({ type: action, member });
        setConfirmOpen(true);
    };

    const confirmMemberAction = () => {
        const { type, member } = confirmAction;
        if (!member) return;

        if (type === 'promote') {
            const currentIndex = roleHierarchy.indexOf(member.role);
            const newRole = roleHierarchy[currentIndex - 1];
            setMembers(prev => prev.map(m =>
                m.id === member.id ? { ...m, role: newRole } : m
            ));
            toast({ title: 'Member Promoted', description: `${member.name} is now ${newRole}` });
        } else if (type === 'demote') {
            const currentIndex = roleHierarchy.indexOf(member.role);
            const newRole = roleHierarchy[currentIndex + 1];
            setMembers(prev => prev.map(m =>
                m.id === member.id ? { ...m, role: newRole } : m
            ));
            toast({ title: 'Member Demoted', description: `${member.name} is now ${newRole}` });
        } else if (type === 'kick') {
            setMembers(prev => prev.filter(m => m.id !== member.id));
            toast({ title: 'Member Removed', description: `${member.name} has been kicked from the family`, variant: 'destructive' });
        } else if (type === 'transfer') {
            setMembers(prev => prev.map(m => {
                if (m.id === member.id) return { ...m, role: 'Boss' as FamilyRole };
                if (m.id === myId) return { ...m, role: 'Underboss' as FamilyRole };
                return m;
            }));
            toast({ title: 'Leadership Transferred', description: `${member.name} is now the Boss. You are now Underboss.` });
        }
        setConfirmOpen(false);
    };

    const handleContribute = () => {
        toast({ title: 'Contribution Made', description: `You contributed $${contributeAmount.toLocaleString()} to the treasury` });
        setContributeOpen(false);
    };

    const handleLeaveFamily = () => {
        toast({ title: 'Left Family', description: 'You have left the family', variant: 'destructive' });
        setLeaveOpen(false);
        // In real app, would redirect to browse page
    };

    // If player has no family, show option to browse/create
    if (!hasFamily) {
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
                            <h1 className="font-cinzel text-xl font-bold text-foreground">The Corleone Family</h1>
                            <p className="text-xs text-muted-foreground">{members.length} Members • Rank #3</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Browse other families */}
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
                            <p className="text-xs text-muted-foreground">Net Worth</p>
                            <p className="font-cinzel font-bold text-lg text-primary">$482M</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Territory</p>
                            <p className="font-cinzel font-bold text-lg text-foreground">12</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Treasury</p>
                            <p className="font-cinzel font-bold text-lg text-foreground">$15.2M</p>
                        </div>
                    </div>
                    <Button className="w-full btn-gold text-xs" onClick={() => setContributeOpen(true)}>
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
                            <Button size="sm" variant="ghost" className="text-xs text-primary">
                                <Plus className="w-4 h-4 mr-1" />
                                Invite
                            </Button>
                        )}
                    </div>
                    <div className="noir-card p-4 space-y-2">
                        {sortedMembers.map((member, index) => (
                            <MemberCard
                                key={member.id}
                                member={member}
                                myRole={myRole}
                                isMe={member.id === myId}
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
                            <span className="font-bold">${playerCash.toLocaleString()}</span>
                        </div>
                        <Input
                            type="number"
                            value={contributeAmount}
                            onChange={(e) => setContributeAmount(parseInt(e.target.value) || 0)}
                            className="bg-muted/30 border-border/50"
                            min={1000}
                            max={playerCash}
                        />
                        <div className="grid grid-cols-4 gap-2">
                            {[10000, 50000, 100000, 500000].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setContributeAmount(Math.min(amount, playerCash))}
                                    className="p-2 text-[10px] rounded-sm bg-muted/30 border border-border/50 text-muted-foreground hover:border-primary/50"
                                >
                                    ${(amount / 1000)}K
                                </button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setContributeOpen(false)}>Cancel</Button>
                        <Button className="btn-gold" onClick={handleContribute}>
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
                    confirmAction.type === 'promote' ? `Promote ${confirmAction.member?.name} to a higher rank?` :
                        confirmAction.type === 'demote' ? `Demote ${confirmAction.member?.name} to a lower rank?` :
                            confirmAction.type === 'kick' ? `Remove ${confirmAction.member?.name} from the family? This cannot be undone.` :
                                `Transfer Boss role to ${confirmAction.member?.name}? You will become Underboss.`
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

