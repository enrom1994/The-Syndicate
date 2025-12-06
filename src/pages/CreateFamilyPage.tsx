import { motion } from 'framer-motion';
import { Crown, Users, ArrowLeft, Plus, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

const CreateFamilyPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [familyName, setFamilyName] = useState('');
    const [familyTag, setFamilyTag] = useState('');
    const [description, setDescription] = useState('');
    const [initialDeposit, setInitialDeposit] = useState(100000);
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Mock player cash
    const playerCash = 5000000;
    const minDeposit = 100000;

    const isValid =
        familyName.length >= 3 &&
        familyTag.length >= 2 &&
        familyTag.length <= 4 &&
        initialDeposit >= minDeposit &&
        initialDeposit <= playerCash;

    const handleCreate = () => {
        if (isValid) {
            setConfirmOpen(true);
        }
    };

    const confirmCreate = () => {
        toast({
            title: 'Family Created!',
            description: `${familyName} [${familyTag}] is now established. You are the Boss!`,
        });
        navigate('/family');
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
                                <li>Creating a family requires an initial treasury deposit</li>
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
                        <span className="font-bold text-foreground">${playerCash.toLocaleString()}</span>
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Deposit Amount (min ${minDeposit.toLocaleString()})
                        </label>
                        <Input
                            type="number"
                            value={initialDeposit}
                            onChange={(e) => setInitialDeposit(parseInt(e.target.value) || 0)}
                            className="bg-muted/30 border-border/50"
                            min={minDeposit}
                            max={playerCash}
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {[100000, 250000, 500000, 1000000].map((amount) => (
                            <button
                                key={amount}
                                onClick={() => setInitialDeposit(Math.min(amount, playerCash))}
                                className={`p-2 text-[10px] rounded-sm transition-all ${initialDeposit === amount
                                    ? 'bg-primary/20 border border-primary text-primary'
                                    : 'bg-muted/30 border border-border/50 text-muted-foreground'
                                    }`}
                                disabled={amount > playerCash}
                            >
                                ${(amount / 1000)}K
                            </button>
                        ))}
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                        This funds your family's treasury for operations, bounties, and wars.
                    </p>
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
                        disabled={!isValid}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Family (${initialDeposit.toLocaleString()})
                    </Button>
                </motion.div>
            </div >

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Create Family?"
                description={`Create "${familyName}" [${familyTag}] with an initial treasury of $${initialDeposit.toLocaleString()}? You will become the Boss.`}
                onConfirm={confirmCreate}
                confirmText="Create Family"
            />
        </MainLayout >
    );
};

export default CreateFamilyPage;
