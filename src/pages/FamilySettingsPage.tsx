import { motion } from 'framer-motion';
import { Settings, Crown, Edit, Users, Lock, Unlock, UserMinus, ArrowLeft, Save, Loader2, Shield } from 'lucide-react';
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

type RecruitmentStatus = 'open' | 'closed';

interface FamilySettings {
    id: string;
    name: string;
    tag: string | null;
    description: string | null;
    treasury: number;
    is_recruiting: boolean;
    min_level_required: number;
    created_at: string;
}

const FamilySettingsPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { player } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDisbanding, setIsDisbanding] = useState(false);
    const [isBoss, setIsBoss] = useState(false);

    const [familyName, setFamilyName] = useState('');
    const [familyTag, setFamilyTag] = useState('');
    const [description, setDescription] = useState('');
    const [joinType, setJoinType] = useState<'open' | 'request'>('open');
    const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus>('open');
    const [minLevel, setMinLevel] = useState(1);

    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [processingRequest, setProcessingRequest] = useState<string | null>(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'disband' | 'save' | null>(null);

    // Load family settings
    useEffect(() => {
        const loadSettings = async () => {
            if (!player?.id) return;

            try {
                const { data, error } = await supabase.rpc('get_family_settings', {
                    actor_id: player.id
                });

                if (error) throw error;

                if (data?.success) {
                    setIsBoss(data.is_boss);
                    const family = data.family as FamilySettings;
                    setFamilyName(family.name);
                    setFamilyTag(family.tag || '');
                    setDescription(family.description || '');
                    setJoinType((family as any).join_type || 'open');
                    setRecruitmentStatus(family.is_recruiting ? 'open' : 'closed');
                    setMinLevel(family.min_level_required);
                } else {
                    toast({
                        title: 'Access Denied',
                        description: data?.message || 'Cannot access family settings',
                        variant: 'destructive'
                    });
                    navigate('/family');
                }
            } catch (error) {
                console.error('Failed to load family settings:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load family settings',
                    variant: 'destructive'
                });
                navigate('/family');
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [player?.id]);

    // Load pending join requests
    const loadPendingRequests = async () => {
        if (!player?.id) return;

        setLoadingRequests(true);
        try {
            const { data, error } = await supabase.rpc('get_family_join_requests', {
                actor_id: player.id
            });

            if (error) throw error;

            if (data?.success) {
                setPendingRequests(data.requests || []);
            }
        } catch (error) {
            console.error('Failed to load requests:', error);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (!isLoading && (isBoss || joinType === 'request')) {
            loadPendingRequests();
        }
    }, [isLoading, isBoss, joinType]);

    const handleProcessRequest = async (requestId: string, action: 'accept' | 'reject') => {
        if (!player?.id) return;

        setProcessingRequest(requestId);

        try {
            const { data, error } = await supabase.rpc('process_join_request', {
                actor_id: player.id,
                request_id: requestId,
                action: action
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({
                    title: action === 'accept' ? 'Request Accepted' : 'Request Declined',
                    description: data.message
                });
                loadPendingRequests();
            } else {
                toast({
                    title: 'Error',
                    description: data?.message || 'Failed to process request',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Process request error:', error);
            toast({
                title: 'Error',
                description: 'Failed to process request. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleSave = () => {
        setConfirmAction('save');
        setConfirmOpen(true);
    };

    const handleDisband = () => {
        setConfirmAction('disband');
        setConfirmOpen(true);
    };

    const confirmActionHandler = async () => {
        if (!player?.id) return;

        setConfirmOpen(false);

        if (confirmAction === 'save') {
            setIsSaving(true);
            try {
                const { data, error } = await supabase.rpc('update_family_settings', {
                    actor_id: player.id,
                    new_name: familyName,
                    new_tag: familyTag || null,
                    new_description: description || null,
                    new_is_recruiting: recruitmentStatus === 'open',
                    new_min_level: minLevel,
                    new_join_type: joinType
                });

                if (error) throw error;

                if (data?.success) {
                    haptic.success();
                    toast({
                        title: 'Settings Saved',
                        description: data.message,
                    });
                } else {
                    toast({
                        title: 'Error',
                        description: data?.message || 'Failed to save settings',
                        variant: 'destructive',
                    });
                }
            } catch (error) {
                console.error('Save settings error:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to save settings. Please try again.',
                    variant: 'destructive',
                });
            } finally {
                setIsSaving(false);
            }
        } else if (confirmAction === 'disband') {
            setIsDisbanding(true);
            try {
                const { data, error } = await supabase.rpc('disband_family', {
                    boss_id: player.id
                });

                if (error) throw error;

                if (data?.success) {
                    haptic.success();
                    toast({
                        title: 'Family Disbanded',
                        description: data.message,
                        variant: 'destructive',
                    });
                    navigate('/family/browse');
                } else {
                    toast({
                        title: 'Error',
                        description: data?.message || 'Failed to disband family',
                        variant: 'destructive',
                    });
                }
            } catch (error) {
                console.error('Disband family error:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to disband family. Please try again.',
                    variant: 'destructive',
                });
            } finally {
                setIsDisbanding(false);
            }
        }
    };

    const recruitmentOptions: { value: RecruitmentStatus; label: string; icon: React.ReactNode }[] = [
        { value: 'open', label: 'Open', icon: <Unlock className="w-4 h-4" /> },
        { value: 'closed', label: 'Closed', icon: <Lock className="w-4 h-4" /> },
    ];

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

    return (
        <MainLayout>
            {/* Background */}
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
                        <Settings className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Family Settings</h1>
                        <p className="text-xs text-muted-foreground">Manage your organization</p>
                    </div>
                </motion.div>

                {/* Basic Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="noir-card p-4 mb-4"
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Edit className="w-4 h-4 text-primary" />
                        Basic Information
                    </h2>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Family Name</label>
                            <Input
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                className="bg-muted/30 border-border/50"
                                maxLength={30}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">{familyName.length}/30 characters (min 3)</p>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Tag (2-4 letters)</label>
                            <Input
                                value={familyTag}
                                onChange={(e) => setFamilyTag(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                                className="bg-muted/30 border-border/50 uppercase"
                                maxLength={4}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Displayed as [{familyTag || '???'}]</p>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/50 rounded-sm resize-none"
                                rows={3}
                                maxLength={200}
                                placeholder="A brief description of your family..."
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">{description.length}/200 characters</p>
                        </div>
                    </div>
                </motion.div>

                {/* Recruitment Settings */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="noir-card p-4 mb-4"
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Recruitment
                    </h2>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-2 block">Visibility</label>
                            <div className="grid grid-cols-2 gap-2">
                                {recruitmentOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setRecruitmentStatus(option.value)}
                                        className={`p-3 rounded-sm text-xs flex flex-col items-center gap-1 transition-all ${recruitmentStatus === option.value
                                            ? 'bg-primary/20 border border-primary text-primary'
                                            : 'bg-muted/30 border border-border/50 text-muted-foreground'
                                            }`}
                                    >
                                        {option.icon}
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">
                                {recruitmentStatus === 'open'
                                    ? 'Your family is visible and accepting new members'
                                    : 'Your family is hidden - no one can join'}
                            </p>
                        </div>

                        {/* Join Type - only show when recruiting */}
                        {recruitmentStatus === 'open' && (
                            <div>
                                <label className="text-xs text-muted-foreground mb-2 block">Join Process</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setJoinType('open')}
                                        className={`p-3 rounded-sm text-xs flex flex-col items-center gap-1 transition-all ${joinType === 'open'
                                            ? 'bg-green-500/20 border border-green-500 text-green-400'
                                            : 'bg-muted/30 border border-border/50 text-muted-foreground'
                                            }`}
                                    >
                                        <Users className="w-4 h-4" />
                                        Open
                                    </button>
                                    <button
                                        onClick={() => setJoinType('request')}
                                        className={`p-3 rounded-sm text-xs flex flex-col items-center gap-1 transition-all ${joinType === 'request'
                                            ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-400'
                                            : 'bg-muted/30 border border-border/50 text-muted-foreground'
                                            }`}
                                    >
                                        <Shield className="w-4 h-4" />
                                        Request Only
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2">
                                    {joinType === 'open'
                                        ? 'Anyone can join instantly'
                                        : 'Players must request to join and await approval'}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Minimum Level to Join</label>
                            <Input
                                type="number"
                                value={minLevel}
                                onChange={(e) => setMinLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                className="bg-muted/30 border-border/50"
                                min={1}
                                max={100}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Players must be at least Level {minLevel} to join</p>
                        </div>
                    </div>
                </motion.div>

                {/* Pending Join Requests */}
                {(isBoss || joinType === 'request') && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="noir-card p-4 mb-4"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-cinzel text-sm font-semibold text-foreground flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                Pending Requests
                                {pendingRequests.length > 0 && (
                                    <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={loadPendingRequests}
                                disabled={loadingRequests}
                                className="text-xs"
                            >
                                {loadingRequests ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>

                        {loadingRequests ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : pendingRequests.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                                No pending join requests
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {pendingRequests.map((request) => (
                                    <div
                                        key={request.request_id}
                                        className="bg-muted/30 rounded-sm p-3 border border-border/50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="font-semibold text-sm text-foreground">
                                                    {request.player_name}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Level {request.player_level} • {request.player_respect} Respect
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    className="btn-gold text-xs px-3 h-7"
                                                    onClick={() => handleProcessRequest(request.request_id, 'accept')}
                                                    disabled={processingRequest === request.request_id}
                                                >
                                                    {processingRequest === request.request_id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        'Accept'
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs px-3 h-7 border-destructive/50 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleProcessRequest(request.request_id, 'reject')}
                                                    disabled={processingRequest === request.request_id}
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                        {request.message && (
                                            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 mt-2">
                                                "{request.message}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                >
                    <Button
                        className="w-full btn-gold"
                        onClick={handleSave}
                        disabled={isSaving || isDisbanding || familyName.length < 3}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>

                    {isBoss && (
                        <Button
                            variant="outline"
                            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={handleDisband}
                            disabled={isSaving || isDisbanding}
                        >
                            {isDisbanding ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <UserMinus className="w-4 h-4 mr-2" />
                            )}
                            Disband Family
                        </Button>
                    )}
                </motion.div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmAction === 'save' ? 'Save Changes?' : 'Disband Family?'}
                description={
                    confirmAction === 'save'
                        ? 'Are you sure you want to save these settings?'
                        : 'This will permanently dissolve the family. All members will be removed and the treasury will be returned to you. This action cannot be undone!'
                }
                onConfirm={confirmActionHandler}
                confirmText={confirmAction === 'save' ? 'Save' : 'Disband'}
                variant={confirmAction === 'disband' ? 'destructive' : 'default'}
            />
        </MainLayout>
    );
};

export default FamilySettingsPage;
