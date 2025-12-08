import { motion } from 'framer-motion';
import { Settings, Crown, Edit, Users, Lock, Unlock, UserMinus, ArrowLeft, Save, Loader2 } from 'lucide-react';
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
    const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus>('open');
    const [minLevel, setMinLevel] = useState(1);

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
                    new_min_level: minLevel
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
                            <label className="text-xs text-muted-foreground mb-2 block">Status</label>
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
                                    ? 'Players can browse and join your family'
                                    : 'Your family is hidden from the browse list'}
                            </p>
                        </div>

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
