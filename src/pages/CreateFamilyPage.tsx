import { motion } from 'framer-motion';
import { Crown, Users, ArrowLeft, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { GameIcon } from '@/components/GameIcon';

const CreateFamilyPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { player, refetchPlayer } = useAuth();

    const [familyName, setFamilyName] = useState('');
    const [familyTag, setFamilyTag] = useState('');
    const [description, setDescription] = useState('');
    const [joinType, setJoinType] = useState<'open' | 'request'>('open');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const diamondCost = 100;

    const isValid =
        familyName.length >= 3 &&
        familyTag.length >= 2 &&
        familyTag.length <= 4 &&
        (player?.diamonds ?? 0) >= diamondCost;

    const handleCreate = () => {
        if (isValid) {
            setConfirmOpen(true);
        }
    };

    const confirmCreate = async () => {
        if (!player?.id) return;

        setIsProcessing(true);
        setConfirmOpen(false);

        try {
            // Create family via RPC (diamonds deducted server-side)
            const { data, error } = await supabase.rpc('create_family', {
                creator_id: player.id,
                family_name: familyName,
                family_tag: familyTag,
                family_description: description || null,
                family_join_type: joinType
            });

            if (error) throw error;

            if (data?.success) {
                haptic.success();
                toast({
                    title: 'Family Created!',
                    description: `${familyName} [${familyTag}] is now established. You are the Boss!`,
                });
                await refetchPlayer();
                navigate('/family');
            } else {
                toast({
                    title: 'Error',
                    description: data?.message || 'Failed to create family',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Create family error:', error);
            toast({
                title: 'Error',
                description: 'Failed to create family. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
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
                        onClick={() => navigate('/family/browse')}
                        className="text-muted-foreground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-sm bg-gradient-gold flex items-center justify-center">
                        <Crown className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Create Family</h1>
                        <p className="text-xs text-muted-foreground">Establish your criminal empire</p>
                    </div>
                </motion.div>

                {/* Warning */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-yellow-500/10 border border-yellow-500/30 rounded-sm p-3 mb-4"
                >
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-200">
                            <p className="font-semibold mb-1">Important:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-yellow-200/80">
                                <li>Creating a family costs {diamondCost} diamonds</li>
                                <li>You will become the Boss with full control</li>
                                <li>Family name and tag cannot be changed easily</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="noir-card p-4 mb-4"
                >
                    <h2 className="font-cinzel text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Family Details
                    </h2>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                Family Name <span className="text-destructive">*</span>
                            </label>
                            <Input
                                placeholder="e.g., The Corleone Family"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                className="bg-muted/30 border-border/50"
                                maxLength={30}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {familyName.length}/30 characters (min 3)
                            </p>
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                Tag <span className="text-destructive">*</span>
                            </label>
                            <Input
                                placeholder="e.g., CRL"
                                value={familyTag}
                                onChange={(e) => setFamilyTag(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                                className="bg-muted/30 border-border/50 uppercase"
                                maxLength={4}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                2-4 letters, shown as [{familyTag || '???'}]
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                Description (optional)
                            </label>
                            <Textarea
                                placeholder="A brief description of your family..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-muted/30 border-border/50 min-h-[60px]"
                                maxLength={200}
                            />
                        </div>

                        {/* Join Type */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-2 block">
                                Who Can Join?
                            </label>
                            <div className="space-y-2">
                                <div
                                    onClick={() => setJoinType('open')}
                                    className={`p-3 rounded-sm border cursor-pointer transition-colors ${joinType === 'open'
                                        ? 'bg-primary/10 border-primary/50'
                                        : 'bg-muted/20 border-border/50 hover:border-border'
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${joinType === 'open' ? 'border-primary' : 'border-muted-foreground'
                                            }`}>
                                            {joinType === 'open' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-foreground">Open</p>
                                            <p className="text-[10px] text-muted-foreground">Anyone who meets the level requirement can join</p>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setJoinType('request')}
                                    className={`p-3 rounded-sm border cursor-pointer transition-colors ${joinType === 'request'
                                        ? 'bg-primary/10 border-primary/50'
                                        : 'bg-muted/20 border-border/50 hover:border-border'
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${joinType === 'request' ? 'border-primary' : 'border-muted-foreground'
                                            }`}>
                                            {joinType === 'request' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-foreground">Request-Only</p>
                                            <p className="text-[10px] text-muted-foreground">Players must request to join and be approved by leadership</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cost Display - Diamonds Only */}
                        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-sm border border-primary/30">
                            <span className="text-xs text-muted-foreground">Creation Cost:</span>
                            <div className="flex items-center gap-1">
                                <GameIcon type="diamond" className="w-5 h-5" />
                                <span className="font-cinzel font-bold text-primary">{diamondCost}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Your Diamonds:</span>
                            <span className={`font-bold flex items-center gap-1 ${(player?.diamonds ?? 0) >= diamondCost ? 'text-primary' : 'text-destructive'}`}>
                                {player?.diamonds ?? 0}
                                <img src="/images/icons/diamond.png" alt="💎" className="w-4 h-4 inline" />
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Create Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Button
                        className="w-full btn-gold"
                        onClick={handleCreate}
                        disabled={!isValid || isProcessing}
                    >
                        {isProcessing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4 mr-2" />
                        )}
                        Create Family ({diamondCost}
                        <img src="/images/icons/diamond.png" alt="💎" className="w-4 h-4 inline ml-1" />)
                    </Button>
                </motion.div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Create Family?"
                description={`Create "${familyName}" [${familyTag}] for ${diamondCost} diamonds? You will become the Boss.`}
                onConfirm={confirmCreate}
                confirmText="Create Family"
            />
        </MainLayout>
    );
};

export default CreateFamilyPage;
