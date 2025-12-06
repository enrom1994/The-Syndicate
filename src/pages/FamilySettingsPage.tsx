import { motion } from 'framer-motion';
import { Settings, Crown, Edit, Users, Lock, Unlock, UserMinus, Percent, ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

type RecruitmentStatus = 'open' | 'closed' | 'invite-only';

const FamilySettingsPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Mock data - will come from context/backend
    const isLeader = true; // Only Boss can access full settings
    const [familyName, setFamilyName] = useState('The Corleone Family');
    const [familyTag, setFamilyTag] = useState('CRL');
    const [description, setDescription] = useState('The most powerful crime family in New York.');
    const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus>('invite-only');
    const [minLevel, setMinLevel] = useState(5);
    const [taxRate, setTaxRate] = useState(10);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'disband' | 'save' | null>(null);

    const handleSave = () => {
        setConfirmAction('save');
        setConfirmOpen(true);
    };

    const handleDisband = () => {
        setConfirmAction('disband');
        setConfirmOpen(true);
    };

    const confirmActionHandler = () => {
        if (confirmAction === 'save') {
            toast({
                title: 'Settings Saved',
                description: 'Family settings have been updated.',
            });
        } else if (confirmAction === 'disband') {
            toast({
                title: 'Family Disbanded',
                description: 'The family has been dissolved.',
                variant: 'destructive',
            });
            navigate('/family');
        }
        setConfirmOpen(false);
    };

    const recruitmentOptions: { value: RecruitmentStatus; label: string; icon: React.ReactNode }[] = [
        { value: 'open', label: 'Open', icon: <Unlock className="w-4 h-4" /> },
        { value: 'invite-only', label: 'Invite Only', icon: <Users className="w-4 h-4" /> },
        { value: 'closed', label: 'Closed', icon: <Lock className="w-4 h-4" /> },
    ];

    if (!isLeader) {
        return (
            <MainLayout>
                <div className="py-12 px-4 text-center">
                    <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Only the Boss can access family settings.</p>
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
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Tag (3-4 letters)</label>
                            <Input
                                value={familyTag}
                                onChange={(e) => setFamilyTag(e.target.value.toUpperCase())}
                                className="bg-muted/30 border-border/50 uppercase"
                                maxLength={4}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/50 rounded-sm resize-none"
                                rows={3}
                                maxLength={200}
                            />
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
                            <div className="grid grid-cols-3 gap-2">
                                {recruitmentOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setRecruitmentStatus(option.value)}
                                        className={`p-2 rounded-sm text-xs flex flex-col items-center gap-1 transition-all ${recruitmentStatus === option.value
                                                ? 'bg-primary/20 border border-primary text-primary'
                                                : 'bg-muted/30 border border-border/50 text-muted-foreground'
                                            }`}
                                    >
                                        {option.icon}
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Minimum Level to Join</label>
                            <Input
                                type="number"
                                value={minLevel}
                                onChange={(e) => setMinLevel(Math.max(1, parseInt(e.target.value) || 1))}
                                className="bg-muted/30 border-border/50"
                                min={1}
                                max={100}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Tax Settings */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="noir-card p-4 mb-4"
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Percent className="w-4 h-4 text-primary" />
                        Treasury Tax
                    </h2>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Tax Rate ({taxRate}%)</label>
                        <input
                            type="range"
                            value={taxRate}
                            onChange={(e) => setTaxRate(parseInt(e.target.value))}
                            className="w-full accent-primary"
                            min={0}
                            max={25}
                            step={1}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                            <span>0%</span>
                            <span>25%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                            Members contribute {taxRate}% of their income to the family treasury.
                        </p>
                    </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                >
                    <Button className="w-full btn-gold" onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={handleDisband}
                    >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Disband Family
                    </Button>
                </motion.div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmAction === 'save' ? 'Save Changes?' : 'Disband Family?'}
                description={
                    confirmAction === 'save'
                        ? 'Are you sure you want to save these settings?'
                        : 'This will permanently dissolve the family. All members will be removed. This action cannot be undone!'
                }
                onConfirm={confirmActionHandler}
                confirmText={confirmAction === 'save' ? 'Save' : 'Disband'}
                variant={confirmAction === 'disband' ? 'destructive' : 'default'}
            />
        </MainLayout>
    );
};

export default FamilySettingsPage;
