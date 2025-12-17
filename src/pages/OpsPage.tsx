import { motion } from 'framer-motion';
import { Swords, Target, Clock, Loader2, Skull, Users, Shield, AlertTriangle, Flame, Diamond, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CombatResultModal } from '@/components/CombatResultModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore, JobDefinition } from '@/hooks/useGameStore';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { rewardCash, rewardXp } from '@/components/RewardAnimation';

// =====================================================
// INTERFACES
// =====================================================

interface TargetPlayer {
    id: string;
    username: string;
    cash: number;
    defense: number;
    attack: number;
}

interface PveTarget {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    required_level: number;
    stamina_cost: number;
    base_strength: number;
    cash_reward: number;
    xp_reward: number;
    respect_reward: number;
    base_success_rate: number;
    cooldown_minutes: number;
    is_available: boolean;
    cooldown_remaining_seconds: number;
    player_meets_level: boolean;
}

interface PvpAttackType {
    id: string;
    name: string;
    description: string;
    stamina_cost: number;
    requires_crew: boolean;
    requires_consumables: boolean;
    consumable_item_name: string | null;
    consumable_qty: number;
    steals_cash: boolean;
    steals_vault: boolean;
    steals_contraband: boolean;
    steals_respect: boolean;
    kills_crew: boolean;
    cash_steal_percent: number;
    vault_steal_percent: number;
}

// =====================================================
// PVE TARGET CARD
// =====================================================

const PveTargetCard = ({
    target,
    isProcessing,
    delay = 0,
    onAttack
}: {
    target: PveTarget;
    isProcessing: boolean;
    delay?: number;
    onAttack: () => void;
}) => {
    const difficultyColor = {
        easy: 'text-green-500 border-green-500/30',
        medium: 'text-yellow-500 border-yellow-500/30',
        hard: 'text-orange-500 border-orange-500/30',
        expert: 'text-red-500 border-red-500/30',
    }[target.difficulty] || 'text-gray-500';

    const formatCooldown = (seconds: number) => {
        if (seconds <= 0) return '';
        const mins = Math.ceil(seconds / 60);
        return `${mins}m`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card p-4"
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{target.name}</h3>
                    <p className="text-xs text-muted-foreground">{target.description}</p>
                </div>
                <span className={`text-xs font-medium uppercase px-2 py-0.5 border rounded ${difficultyColor}`}>
                    {target.difficulty}
                </span>
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/cash.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Cash</span>
                    </div>
                    <p className="font-bold text-green-400">${target.cash_reward.toLocaleString()}</p>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/respect.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Respect</span>
                    </div>
                    <p className="font-bold text-cyan-400">+{target.xp_reward + target.respect_reward}</p>
                </div>
                {/* Removed old respect reward column - respect is now combined above */}
            </div>

            {/* Requirements Row */}
            <div className="flex items-center justify-center gap-3 mb-3 text-xs text-muted-foreground bg-muted/20 rounded p-2">
                <div className="flex items-center gap-1">
                    <img src="/images/icons/stamina.png" alt="" className="w-3.5 h-3.5" />
                    <span>{target.stamina_cost}</span>
                </div>
                <span className="text-muted-foreground/50">•</span>
                <div className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Lv {target.required_level}+</span>
                </div>
            </div>

            <Button
                className="w-full btn-gold text-xs"
                onClick={onAttack}
                disabled={isProcessing || !target.is_available || !target.player_meets_level}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : !target.player_meets_level ? (
                    `Requires Lv ${target.required_level}`
                ) : !target.is_available ? (
                    <>
                        <Clock className="w-4 h-4 mr-1" />
                        {formatCooldown(target.cooldown_remaining_seconds)}
                    </>
                ) : (
                    <>
                        <Skull className="w-4 h-4 mr-1" />
                        Attack
                    </>
                )}
            </Button>
        </motion.div>
    );
};

// =====================================================
// PVP TARGET CARD - MOBILE OPTIMIZED
// =====================================================

const TargetCard = ({
    target,
    attackTypes,
    isProcessing,
    delay = 0,
    onAttack
}: {
    target: TargetPlayer;
    attackTypes: PvpAttackType[];
    isProcessing: boolean;
    delay?: number;
    onAttack: (attackType: string) => void;
}) => {
    const [showTypes, setShowTypes] = useState(false);

    const getRisk = (defense: number): { label: string; color: string; bgColor: string } => {
        if (defense < 30) return { label: 'Easy', color: 'text-green-400', bgColor: 'bg-green-500/20' };
        if (defense < 70) return { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
        return { label: 'Hard', color: 'text-red-400', bgColor: 'bg-red-500/20' };
    };

    const formatNetWorth = (cash: number): string => {
        if (cash >= 1000000) return `$${(cash / 1000000).toFixed(1)}M`;
        if (cash >= 1000) return `$${(cash / 1000).toFixed(1)}K`;
        return `$${cash}`;
    };

    const risk = getRisk(target.defense);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card overflow-hidden"
        >
            {/* Target Header */}
            <div className="p-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                            <Skull className="w-4 h-4 text-red-200" />
                        </div>
                        <div>
                            <h3 className="font-cinzel font-semibold text-sm text-foreground leading-tight">
                                {target.username || `Player ${target.id.slice(0, 6)}`}
                            </h3>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-green-400 font-medium">{formatNetWorth(target.cash)}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">DEF {target.defense}</span>
                            </div>
                        </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${risk.bgColor} ${risk.color}`}>
                        {risk.label}
                    </span>
                </div>
            </div>

            {/* Attack Types or Button */}
            <div className="p-3">
                {!showTypes ? (
                    <Button
                        className="w-full btn-gold text-xs h-9"
                        onClick={() => setShowTypes(true)}
                        disabled={isProcessing}
                    >
                        <Swords className="w-4 h-4 mr-2" />
                        Select Attack Type
                    </Button>
                ) : (
                    <div className="space-y-2">
                        {attackTypes.map(type => (
                            <div
                                key={type.id}
                                className="relative rounded-lg border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-900/10 to-orange-900/10 hover:border-yellow-400 hover:bg-yellow-900/20 transition-all cursor-pointer overflow-hidden"
                                onClick={() => {
                                    if (!isProcessing) {
                                        onAttack(type.id);
                                        setShowTypes(false);
                                    }
                                }}
                            >
                                {/* Attack Header with Cost */}
                                <div className="px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/30">
                                    <div className="flex items-center justify-between">
                                        <span className="font-cinzel font-bold text-sm text-primary">{type.name}</span>
                                        <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full">
                                            <img src="/images/icons/stamina.png" alt="" className="w-3 h-3" />
                                            <span className="text-xs font-bold text-yellow-400">{type.stamina_cost}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{type.description}</p>
                                </div>

                                {/* Potential Gains Section */}
                                <div className="px-3 py-2">
                                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Potential Gains</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {type.steals_cash && (
                                            <span className="flex items-center gap-1 bg-green-500/20 border border-green-500/40 px-2 py-1 rounded text-xs">
                                                <img src="/images/icons/cash.png" alt="" className="w-3 h-3" />
                                                <span className="text-green-300 font-medium">{type.cash_steal_percent}% Cash</span>
                                            </span>
                                        )}
                                        {type.steals_vault && (
                                            <span className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 px-2 py-1 rounded text-xs">
                                                <img src="/images/icons/thevault.png" alt="" className="w-3 h-3" />
                                                <span className="text-yellow-300 font-medium">{type.vault_steal_percent}% Vault</span>
                                            </span>
                                        )}
                                        {type.steals_contraband && (
                                            <span className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/40 px-2 py-1 rounded text-xs">
                                                <img src="/images/icons/inventory.png" alt="" className="w-3 h-3" />
                                                <span className="text-purple-300 font-medium">Items</span>
                                            </span>
                                        )}
                                        {type.steals_respect && (
                                            <span className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/40 px-2 py-1 rounded text-xs">
                                                <img src="/images/icons/respect.png" alt="" className="w-3 h-3" />
                                                <span className="text-orange-300 font-medium">Respect</span>
                                            </span>
                                        )}
                                        {type.kills_crew && (
                                            <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 px-2 py-1 rounded text-xs">
                                                <Skull className="w-3 h-3 text-red-400" />
                                                <span className="text-red-300 font-medium">Crew</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Requirements Section */}
                                {(type.requires_crew || type.requires_consumables) && (
                                    <div className="px-3 py-2 bg-red-500/5 border-t border-red-500/20">
                                        <p className="text-[9px] uppercase tracking-wider text-red-400/70 mb-1">Requires</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {type.requires_crew && (
                                                <span className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded text-xs">
                                                    <Users className="w-3 h-3 text-blue-400" />
                                                    <span className="text-blue-300">Crew Member</span>
                                                </span>
                                            )}
                                            {type.requires_consumables && type.consumable_item_name && (
                                                <span className="flex items-center gap-1 bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded text-xs">
                                                    <img
                                                        src={`/images/contraband/${type.consumable_item_name.toLowerCase().replace(/\s+/g, '')}.png`}
                                                        alt=""
                                                        className="w-3 h-3"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                    <span className="text-cyan-300">{type.consumable_qty}x {type.consumable_item_name}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground h-8"
                            onClick={() => setShowTypes(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};


// =====================================================
// JOB CARD (with streak bonus display)
// =====================================================

const JobCard = ({ job, isProcessing, delay = 0, onExecute, streakBonus = 0, playerLevel = 1, playerEnergy = 0 }: {
    job: JobDefinition;
    isProcessing: boolean;
    delay?: number;
    onExecute: () => void;
    streakBonus?: number;
    playerLevel?: number;
    playerEnergy?: number;
}) => {
    // Access store directly to check inventory for requirements
    const { inventory, itemDefinitions } = useGameStore();

    const bonusCash = streakBonus > 0 ? Math.round(job.cash_reward * (1 + streakBonus / 100)) : job.cash_reward;
    // Calculate Respect bonus with streak (XP deprecated, respect only)
    const bonusRespect = streakBonus > 0 ? Math.round((job.experience_reward + (job.respect_reward || 0)) * (1 + streakBonus / 100)) : (job.experience_reward + (job.respect_reward || 0));

    // Check item requirements
    let meetsItemReq = true;
    let requiredItemName = '';
    let ownedItemQty = 0;

    if (job.required_item_id && job.required_item_quantity) {
        // Find required item definition to get name/icon (optional, backend usually sends ID)
        // We might need to look up name if only ID is provided
        const itemDef = itemDefinitions.find(d => d.id === job.required_item_id);
        requiredItemName = itemDef?.name || 'Unknown Item';

        // Check inventory for this item_id (inventory stores specific instances, but we need total quantity of that item definition)
        // Wait, inventory item.item_id maps to item_definition.id
        const invItem = inventory.find(i => i.item_id === job.required_item_id);
        ownedItemQty = invItem ? invItem.quantity : 0;

        if (ownedItemQty < job.required_item_quantity) {
            meetsItemReq = false;
        }
    }

    const meetsLevelReq = playerLevel >= job.required_level;
    const hasEnoughEnergy = playerEnergy >= job.energy_cost;
    const canExecute = meetsLevelReq && hasEnoughEnergy && meetsItemReq && !isProcessing;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`noir-card p-4 ${!meetsLevelReq ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <h3 className="font-cinzel font-semibold text-sm text-foreground">{job.name}</h3>
                    <p className="text-xs text-muted-foreground">{job.description}</p>
                </div>

                <div className="flex flex-col items-end gap-1">
                    {/* Required Level Badge */}
                    {job.required_level > 1 && (
                        <div className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${meetsLevelReq
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            Lv {job.required_level}
                        </div>
                    )}
                </div>
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/cash.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Cash</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-green-400">${bonusCash.toLocaleString()}</span>
                        {streakBonus > 0 && (
                            <span className="text-[10px] text-orange-400">+{streakBonus}%</span>
                        )}
                    </div>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/respect.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Respect</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-cyan-400">+{bonusRespect}</span>
                        {streakBonus > 0 && (
                            <span className="text-[10px] text-orange-400">+{streakBonus}%</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Requirements Row */}
            <div className="flex flex-col gap-2 mb-3">
                {/* Basic Requirements (Energy/Level) */}
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground bg-muted/20 rounded p-2">
                    <div className={`flex items-center gap-1 ${hasEnoughEnergy ? '' : 'text-red-400'}`}>
                        <img src="/images/icons/energy.png" alt="" className="w-3.5 h-3.5" />
                        <span>{job.energy_cost}</span>
                    </div>
                    {job.required_level > 1 && (
                        <>
                            <span className="text-muted-foreground/50">•</span>
                            <div className={`flex items-center gap-1 ${meetsLevelReq ? '' : 'text-red-400'}`}>
                                <Shield className="w-3.5 h-3.5" />
                                <span>Lv {job.required_level}+</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Item Requirement (New) */}
                {job.required_item_id && job.required_item_quantity && (
                    <div className={`flex items-center justify-between text-xs px-2 py-1.5 rounded border ${meetsItemReq
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                        <span className="flex items-center gap-1">
                            <img src="/images/icons/inventory.png" alt="" className="w-3 h-3" />
                            Requires: {requiredItemName}
                        </span>
                        <span className="font-bold">
                            {ownedItemQty}/{job.required_item_quantity}
                        </span>
                    </div>
                )}
            </div>

            <Button
                className={`w-full text-xs ${canExecute ? 'btn-gold' : ''}`}
                onClick={onExecute}
                disabled={!canExecute}
                variant={canExecute ? 'default' : 'outline'}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : !meetsLevelReq ? (
                    `Requires Level ${job.required_level}`
                ) : !hasEnoughEnergy ? (
                    'Not Enough Energy'
                ) : !meetsItemReq ? (
                    `Need ${job.required_item_quantity}x ${requiredItemName}`
                ) : (
                    'Execute Job'
                )}
            </Button>
        </motion.div>
    );
};

// =====================================================
// HIGH STAKES JOB CARD
// =====================================================

interface HighStakesJob {
    id: string;
    name: string;
    description: string;
    entry_cost_diamonds: number;
    energy_cost: number;
    cash_reward: number;
    xp_reward: number;
    success_rate: number;
    required_level: number;
    cooldown_minutes: number;
    is_available: boolean;
    cooldown_remaining_seconds: number;
    player_meets_level: boolean;
}

const HighStakesCard = ({ job, isProcessing, delay = 0, onExecute }: {
    job: HighStakesJob;
    isProcessing: boolean;
    delay?: number;
    onExecute: () => void;
}) => {
    const formatCooldown = (seconds: number) => {
        if (seconds <= 0) return '';
        const mins = Math.floor(seconds / 60);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}m`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="noir-card p-4 border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/10 to-orange-900/5"
        >
            {/* Premium Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                            <Star className="w-3.5 h-3.5 text-yellow-100" />
                        </div>
                        <h3 className="font-cinzel font-bold text-sm text-primary">{job.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{job.description}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600/30 to-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 rounded-full text-xs">
                    <img src="/images/icons/diamond.png" alt="" className="w-4 h-4" />
                    <span className="text-cyan-400 font-bold">{job.entry_cost_diamonds}</span>
                </div>
            </div>

            {/* Rewards Grid with Enhanced Styling */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="bg-green-500/15 border border-green-500/30 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/cash.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Reward</span>
                    </div>
                    <p className="font-bold text-green-400">${job.cash_reward.toLocaleString()}</p>
                </div>
                <div className="bg-cyan-500/15 border border-cyan-500/30 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <img src="/images/icons/respect.png" alt="" className="w-3 h-3" />
                        <span className="text-muted-foreground text-[10px]">Respect</span>
                    </div>
                    <p className="font-bold text-cyan-400">+{job.xp_reward}</p>
                </div>
                <div className="bg-red-500/15 border border-red-500/30 rounded p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Target className="w-3 h-3 text-red-400" />
                        <span className="text-muted-foreground text-[10px]">Success</span>
                    </div>
                    <p className="font-bold text-red-400">{job.success_rate}%</p>
                </div>
            </div>

            {/* Requirements Row */}
            <div className="flex items-center justify-center gap-3 mb-3 text-xs text-muted-foreground bg-muted/20 rounded p-2">
                <div className="flex items-center gap-1">
                    <img src="/images/icons/energy.png" alt="" className="w-3.5 h-3.5" />
                    <span>{job.energy_cost}</span>
                </div>
                <span className="text-muted-foreground/50">•</span>
                <div className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Lv {job.required_level}+</span>
                </div>
            </div>

            <Button
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-xs font-bold"
                onClick={onExecute}
                disabled={isProcessing || !job.is_available || !job.player_meets_level}
            >
                {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : !job.player_meets_level ? (
                    `Requires Lv ${job.required_level}`
                ) : !job.is_available ? (
                    <>
                        <Clock className="w-4 h-4 mr-1" />
                        {formatCooldown(job.cooldown_remaining_seconds)}
                    </>
                ) : (
                    <>
                        <img src="/images/icons/diamond.png" alt="" className="w-4 h-4 mr-1" />
                        Enter ({job.entry_cost_diamonds})
                    </>
                )}
            </Button>
        </motion.div>
    );
};

// =====================================================
// MAIN PAGE
// =====================================================

const OpsPage = () => {
    const { toast } = useToast();
    const { player, refetchPlayer, isLoading: isAuthLoading } = useAuth();
    const {
        jobDefinitions,
        isLoadingDefinitions,
        completeJob,
        getJobChainStatus,
        continueJobChain,
        rushPveCooldown,
        getHighStakesJobs,
        executeHighStakesJob,
        loadCrew,
        loadInventory
    } = useGameStore();

    const [activeTab, setActiveTab] = useState('pve');

    // PvE state
    const [pveTargets, setPveTargets] = useState<PveTarget[]>([]);
    const [isLoadingPve, setIsLoadingPve] = useState(true);

    // PvP state
    const [pvpTargets, setPvpTargets] = useState<TargetPlayer[]>([]);
    const [pvpAttackTypes, setPvpAttackTypes] = useState<PvpAttackType[]>([]);
    const [isLoadingPvp, setIsLoadingPvp] = useState(true);

    const [processingId, setProcessingId] = useState<string | null>(null);

    // Combat modal
    const [combatResult, setCombatResult] = useState<{
        open: boolean;
        result: 'victory' | 'defeat';
        targetName: string;
        cashGained: number;
        cashLost: number;
        respectGained: number;
        respectLost: number;
        xpGained?: number;
        itemsStolen?: string[];
        crewLost?: number;
        insuranceActivated?: boolean;
    }>({ open: false, result: 'victory', targetName: '', cashGained: 0, cashLost: 0, respectGained: 0, respectLost: 0 });

    // PvP confirm dialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPvpAttack, setPendingPvpAttack] = useState<{ target: TargetPlayer; attackType: string } | null>(null);

    // Job Chain state
    const [chainStatus, setChainStatus] = useState<{
        streak: number;
        active: boolean;
        chain_broken: boolean;
        can_continue: boolean;
        seconds_to_continue: number;
        bonus_percent: number;
    } | null>(null);
    const [showChainContinue, setShowChainContinue] = useState(false);
    const [continueCountdown, setContinueCountdown] = useState(0);

    // High Stakes state
    const [highStakesJobs, setHighStakesJobs] = useState<HighStakesJob[]>([]);
    const [isLoadingHighStakes, setIsLoadingHighStakes] = useState(false);
    const [confirmHighStakes, setConfirmHighStakes] = useState<HighStakesJob | null>(null);

    // =====================================================
    // LOAD DATA
    // =====================================================

    useEffect(() => {
        if (player?.id) {
            loadPveTargets();
            loadPvpTargets();
            loadPvpAttackTypes();
            loadJobChainStatus();
            loadHighStakesJobs();
        }
    }, [player?.id]);

    // Countdown timer for chain continue
    useEffect(() => {
        if (continueCountdown > 0) {
            const timer = setTimeout(() => setContinueCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else if (showChainContinue && continueCountdown <= 0) {
            setShowChainContinue(false);
            loadJobChainStatus(); // Refresh status after expiry
        }
    }, [continueCountdown, showChainContinue]);

    const loadJobChainStatus = async () => {
        const status = await getJobChainStatus();
        if (status) {
            setChainStatus(status);
        }
    };

    const loadHighStakesJobs = async () => {
        setIsLoadingHighStakes(true);
        try {
            const jobs = await getHighStakesJobs();
            setHighStakesJobs(jobs);
        } finally {
            setIsLoadingHighStakes(false);
        }
    };

    const loadPveTargets = async () => {
        if (!player?.id) return;
        setIsLoadingPve(true);
        try {
            const { data, error } = await supabase.rpc('get_pve_targets', { viewer_id: player.id });
            if (error) throw error;
            setPveTargets(data || []);
        } catch (error) {
            console.error('Error loading PvE targets:', error);
        } finally {
            setIsLoadingPve(false);
        }
    };

    const loadPvpTargets = async () => {
        if (!player?.id) return;
        setIsLoadingPvp(true);
        try {
            const { data, error } = await supabase
                .from('players')
                .select('id, username, cash, defense, attack')
                .neq('id', player.id)
                .gt('cash', 1000)
                .limit(5);
            if (error) throw error;
            setPvpTargets(data || []);
        } catch (error) {
            console.error('Error loading PvP targets:', error);
        } finally {
            setIsLoadingPvp(false);
        }
    };

    const loadPvpAttackTypes = async () => {
        try {
            const { data, error } = await supabase.rpc('get_pvp_attack_types');
            if (error) throw error;
            setPvpAttackTypes(data || []);
        } catch (error) {
            console.error('Error loading attack types:', error);
        }
    };

    // =====================================================
    // PVE ATTACK
    // =====================================================

    const handlePveAttack = async (target: PveTarget) => {
        if (!player) return;

        if (player.stamina < target.stamina_cost) {
            toast({ title: 'Not Enough Stamina', description: `Need ${target.stamina_cost} stamina`, variant: 'destructive' });
            return;
        }

        setProcessingId(target.id);
        try {
            const { data, error } = await supabase.rpc('attack_pve', {
                attacker_id: player.id,
                target_id_input: target.id
            });

            if (error) throw error;

            if (data?.success) {
                if (data.result === 'victory') {
                    haptic.success();
                    if (data.cash_earned) rewardCash(data.cash_earned);
                    setCombatResult({
                        open: true, result: 'victory', targetName: data.target_name,
                        cashGained: data.cash_earned || 0, cashLost: 0,
                        respectGained: data.respect_earned || 0, respectLost: 0
                    });
                } else {
                    haptic.error();
                    setCombatResult({
                        open: true, result: 'defeat', targetName: data.target_name,
                        cashGained: 0, cashLost: 0, respectGained: 0, respectLost: 0
                    });
                }
                await refetchPlayer();
                await loadPveTargets();
            } else {
                toast({ title: 'Attack Failed', description: data?.message, variant: 'destructive' });
            }
        } catch (error) {
            console.error('PvE attack error:', error);
            toast({ title: 'Error', description: 'Attack failed', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    // =====================================================
    // PVP ATTACK
    // =====================================================

    const handlePvpAttackClick = (target: TargetPlayer, attackType: string) => {
        const type = pvpAttackTypes.find(t => t.id === attackType);
        if (!type) return;

        if ((player?.stamina ?? 0) < type.stamina_cost) {
            toast({ title: 'Not Enough Stamina', description: `Need ${type.stamina_cost} stamina`, variant: 'destructive' });
            return;
        }
        setPendingPvpAttack({ target, attackType });
        setConfirmOpen(true);
    };

    const executePvpAttack = async () => {
        if (!pendingPvpAttack || !player) return;

        setConfirmOpen(false);
        setProcessingId(pendingPvpAttack.target.id);

        try {
            const { data, error } = await supabase.rpc('perform_pvp_attack', {
                attacker_id_input: player.id,
                defender_id_input: pendingPvpAttack.target.id,
                attack_type_input: pendingPvpAttack.attackType
            });

            if (error) throw error;

            if (data?.success) {
                if (data.result === 'victory') {
                    haptic.success();
                    if (data.cash_stolen) rewardCash(data.cash_stolen);
                    setCombatResult({
                        open: true,
                        result: 'victory',
                        targetName: data.defender_name,
                        cashGained: data.cash_stolen || 0,
                        cashLost: 0,
                        // Use new explicit fields, fallback to legacy
                        respectGained: data.respect_gained ?? (data.respect_stolen || 0),
                        respectLost: data.respect_lost ?? 0,
                        xpGained: 0,
                        itemsStolen: data.contraband_stolen > 0 ? [`${data.contraband_stolen} Contraband`] : [],
                        crewLost: 0,
                        insuranceActivated: data.insurance_applied || false
                    });
                } else {
                    haptic.error();
                    setCombatResult({
                        open: true,
                        result: 'defeat',
                        targetName: data.defender_name,
                        cashGained: 0,
                        cashLost: 0,
                        // Use new explicit fields, fallback to legacy
                        respectGained: data.respect_gained ?? 0,
                        respectLost: data.respect_lost ?? (data.attacker_respect_loss || 0),
                        xpGained: 0,
                        itemsStolen: [],
                        crewLost: data.attacker_crew_loss || 0
                    });
                }
                await refetchPlayer();
                await loadCrew();
                await loadInventory();
                await loadPvpTargets();
            } else {
                toast({ title: 'Attack Failed', description: data?.message, variant: 'destructive' });
            }
        } catch (error) {
            console.error('PvP attack error:', error);
            toast({ title: 'Error', description: 'Attack failed', variant: 'destructive' });
        } finally {
            setProcessingId(null);
            setPendingPvpAttack(null);
        }
    };

    // =====================================================
    // JOB EXECUTION
    // =====================================================

    const handleJobExecute = async (job: JobDefinition) => {
        if (!player) return;
        setProcessingId(job.id);

        try {
            const result = await completeJob(job.id);
            if (result.success) {
                haptic.success();
                await loadJobChainStatus(); // Refresh chain status

                // Show cash animation
                if (result.cash_earned) {
                    rewardCash(result.cash_earned);
                }

                // Show XP animation (staggered)
                if (result.xp_earned) {
                    setTimeout(() => rewardXp(result.xp_earned!), 400);
                }

                const streakMsg = result.current_streak && result.current_streak > 0
                    ? ` (🔥 Streak ${result.current_streak})`
                    : '';

                toast({
                    title: result.leveled_up ? 'LEVEL UP! 🎉' : 'Job Completed!',
                    description: result.leveled_up
                        ? `You reached Level ${result.new_level}!`
                        : `Earned $${result.cash_earned?.toLocaleString()} & ${result.xp_earned} XP${streakMsg}`,
                });
                await refetchPlayer();
            } else {
                haptic.error();

                // Check if chain is broken - offer continue option
                if (result.chain_broken && result.can_continue_until) {
                    setShowChainContinue(true);
                    setContinueCountdown(120); // 2 minutes
                }

                toast({ title: 'Job Failed', description: result.message, variant: 'destructive' });
                await loadJobChainStatus();
            }
        } catch (error) {
            console.error('Job error:', error);
            toast({ title: 'Error', description: 'Job failed', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleContinueChain = async () => {
        setProcessingId('chain-continue');
        try {
            const result = await continueJobChain();
            if (result.success) {
                haptic.success();
                toast({ title: '🔥 Chain Continued!', description: 'Keep the streak going!' });
                setShowChainContinue(false);
                await loadJobChainStatus();
                await refetchPlayer();
            } else {
                haptic.error();
                toast({ title: 'Failed', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleHighStakesExecute = async (job: HighStakesJob) => {
        setConfirmHighStakes(job);
    };

    const executeHighStakes = async () => {
        if (!confirmHighStakes) return;
        setConfirmHighStakes(null);
        setProcessingId(confirmHighStakes.id);

        try {
            const result = await executeHighStakesJob(confirmHighStakes.id);
            if (result.success) {
                if (result.result === 'victory') {
                    haptic.success();
                    if (result.cash_earned) rewardCash(result.cash_earned);
                    if (result.xp_earned) setTimeout(() => rewardXp(result.xp_earned!), 400);
                    toast({
                        title: '🎰 HIGH STAKES WIN!',
                        description: `Scored $${result.cash_earned?.toLocaleString()}!`
                    });
                } else {
                    haptic.error();
                    toast({
                        title: '💀 Mission Failed',
                        description: `Lost ${result.diamonds_lost}💎 entry fee`,
                        variant: 'destructive'
                    });
                }
                await refetchPlayer();
                await loadHighStakesJobs();
            } else {
                haptic.error();
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    // =====================================================
    // RENDER
    // =====================================================

    if (isAuthLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    const attackType = pendingPvpAttack ? pvpAttackTypes.find(t => t.id === pendingPvpAttack.attackType) : null;

    return (
        <MainLayout>
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
                style={{ backgroundImage: 'url(/images/backgrounds/attack.png)' }}
            />

            <div className="relative z-10 py-6 px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-6"
                >
                    <img src="/images/icons/briefcase.png" alt="Operations" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="font-cinzel text-xl font-bold text-foreground">Operations</h1>
                        <p className="text-xs text-muted-foreground">Attack, execute jobs, earn rewards</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="noir-card p-3 mb-6 grid grid-cols-3 gap-3"
                >
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Wins</p>
                        <p className="font-cinzel font-bold text-lg text-foreground">{player?.total_attacks_won ?? 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Stamina</p>
                        <p className="font-cinzel font-bold text-lg text-primary">
                            {player?.stamina ?? 0}/{player?.max_stamina ?? 100}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Energy</p>
                        <p className="font-cinzel font-bold text-lg text-foreground">
                            {player?.energy ?? 0}/{player?.max_energy ?? 100}
                        </p>
                    </div>
                </motion.div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/30 rounded-sm mb-4">
                        <TabsTrigger value="pve" className="font-cinzel text-xs flex items-center gap-1">
                            <Skull className="w-3 h-3" />
                            Heists
                        </TabsTrigger>
                        <TabsTrigger value="pvp" className="font-cinzel text-xs flex items-center gap-1">
                            <Swords className="w-3 h-3" />
                            PvP
                        </TabsTrigger>
                        <TabsTrigger value="jobs" className="font-cinzel text-xs flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Jobs
                        </TabsTrigger>
                        <TabsTrigger value="highstakes" className="font-cinzel text-xs flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            Stakes
                        </TabsTrigger>
                    </TabsList>

                    {/* PvE Tab */}
                    <TabsContent value="pve" className="space-y-3 mt-0">
                        {isLoadingPve ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : pveTargets.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No heist targets available</p>
                        ) : (
                            pveTargets.map((target, idx) => (
                                <PveTargetCard
                                    key={target.id}
                                    target={target}
                                    isProcessing={processingId === target.id}
                                    delay={0.05 * idx}
                                    onAttack={() => handlePveAttack(target)}
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* PvP Tab */}
                    <TabsContent value="pvp" className="space-y-3 mt-0">
                        <div className="noir-card p-3 mb-3 flex items-center gap-2 text-xs text-yellow-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span>PvP attacks risk losing items, crew, and respect on defeat!</span>
                        </div>

                        {isLoadingPvp ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : pvpTargets.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No targets available</p>
                                <Button variant="outline" className="mt-4" onClick={loadPvpTargets}>
                                    Refresh Targets
                                </Button>
                            </div>
                        ) : (
                            pvpTargets.map((target, idx) => (
                                <TargetCard
                                    key={target.id}
                                    target={target}
                                    attackTypes={pvpAttackTypes}
                                    isProcessing={processingId === target.id}
                                    delay={0.05 * idx}
                                    onAttack={(attackType) => handlePvpAttackClick(target, attackType)}
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* Jobs Tab */}
                    <TabsContent value="jobs" className="space-y-3 mt-0">
                        {/* Streak Banner */}
                        {chainStatus && chainStatus.streak > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="noir-card p-3 border-l-4 border-orange-500 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    <div>
                                        <span className="text-sm font-bold text-orange-400">Streak: {chainStatus.streak}</span>
                                        <span className="text-xs text-muted-foreground ml-2">+{chainStatus.bonus_percent}% bonus</span>
                                    </div>
                                </div>
                                {!chainStatus.active && (
                                    <span className="text-xs text-yellow-400">Complete a job to keep streak!</span>
                                )}
                            </motion.div>
                        )}

                        {isLoadingDefinitions ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : jobDefinitions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No jobs available</p>
                        ) : (
                            jobDefinitions.map((job, idx) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    isProcessing={processingId === job.id}
                                    delay={0.05 * idx}
                                    onExecute={() => handleJobExecute(job)}
                                    streakBonus={chainStatus?.bonus_percent || 0}
                                    playerLevel={player?.level || 1}
                                    playerEnergy={player?.energy || 0}
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* High Stakes Tab */}
                    <TabsContent value="highstakes" className="space-y-3 mt-0">
                        <div className="noir-card p-3 mb-3 flex items-center gap-2 text-xs text-yellow-400">
                            <Diamond className="w-4 h-4" />
                            <span>Premium missions with 💎 entry fee. Higher risk, 3x rewards!</span>
                        </div>

                        {isLoadingHighStakes ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : highStakesJobs.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No high stakes missions available</p>
                        ) : (
                            highStakesJobs.map((job, idx) => (
                                <HighStakesCard
                                    key={job.id}
                                    job={job}
                                    isProcessing={processingId === job.id}
                                    delay={0.05 * idx}
                                    onExecute={() => handleHighStakesExecute(job)}
                                />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* PvP Confirm Dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground">
                            {attackType?.name || 'Attack'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Attack {pendingPvpAttack?.target.username}?
                            <br /><br />
                            <span className="text-yellow-400">⚠️ Risk: You may lose items, crew, or respect if you lose!</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executePvpAttack} className="bg-destructive hover:bg-destructive/80">
                            Attack!
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CombatResultModal
                open={combatResult.open}
                onClose={() => setCombatResult(prev => ({ ...prev, open: false }))}
                result={combatResult.result}
                targetName={combatResult.targetName}
                cashGained={combatResult.cashGained}
                cashLost={combatResult.cashLost}
                respectGained={combatResult.respectGained}
                respectLost={combatResult.respectLost}
                xpGained={combatResult.xpGained}
                itemsStolen={combatResult.itemsStolen}
                crewLost={combatResult.crewLost}
                insuranceActivated={combatResult.insuranceActivated}
            />

            {/* Job Chain Continue Dialog */}
            <AlertDialog open={showChainContinue} onOpenChange={setShowChainContinue}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" />
                            Chain Broken!
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Your {chainStatus?.streak || 0}-streak is about to end!
                            <br /><br />
                            <span className="text-cyan-400">Pay 15💎 to continue your streak?</span>
                            <br />
                            <span className="text-yellow-400 text-xs">Time remaining: {continueCountdown}s</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Let it End</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleContinueChain}
                            className="bg-gradient-to-r from-orange-600 to-red-600"
                            disabled={processingId === 'chain-continue'}
                        >
                            {processingId === 'chain-continue' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>Continue (15💎)</>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* High Stakes Confirm Dialog */}
            <AlertDialog open={!!confirmHighStakes} onOpenChange={() => setConfirmHighStakes(null)}>
                <AlertDialogContent className="noir-card border-border/50 max-w-xs">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-cinzel text-foreground flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500" />
                            {confirmHighStakes?.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            <div className="space-y-2">
                                <p><strong>Entry Fee:</strong> <span className="text-cyan-400">{confirmHighStakes?.entry_cost_diamonds}💎</span></p>
                                <p><strong>Reward:</strong> <span className="text-green-400">${confirmHighStakes?.cash_reward.toLocaleString()}</span></p>
                                <p><strong>Success Rate:</strong> <span className="text-red-400">{confirmHighStakes?.success_rate}%</span></p>
                                <p className="text-yellow-400 text-xs mt-2">⚠️ If you fail, you lose the entry fee!</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeHighStakes}
                            className="bg-gradient-to-r from-yellow-600 to-orange-600"
                        >
                            Enter ({confirmHighStakes?.entry_cost_diamonds}💎)
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default OpsPage;
