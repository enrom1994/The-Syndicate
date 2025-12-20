import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Shield, Skull, Swords, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCooldownTime } from '@/lib/formatters';
import type { TargetPlayer, PvpAttackType } from './types';

interface TargetCardProps {
    target: TargetPlayer;
    attackTypes: PvpAttackType[];
    isProcessing: boolean;
    delay?: number;
    onAttack: (attackType: string) => void;
}

export const TargetCard = ({
    target,
    attackTypes,
    isProcessing,
    delay = 0,
    onAttack
}: TargetCardProps) => {
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
                            <h3 className="font-cinzel font-semibold text-sm text-foreground leading-tight flex items-center gap-1.5">
                                {target.username || `Player ${target.id.slice(0, 6)}`}
                                {target.has_made_man && (
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 border border-amber-300 shadow-lg shadow-amber-500/30" title="Made Man">
                                        <svg className="w-2.5 h-2.5 text-amber-900" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" /></svg>
                                    </span>
                                )}
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
                {/* Cooldown/Shield/NPP Warning */}
                {(target.on_cooldown || target.has_shield || target.has_npp) && (
                    <div className="mb-2 p-2 rounded-lg bg-muted/30 border border-muted-foreground/20 text-center">
                        {target.has_shield && (
                            <span className="text-xs text-cyan-400 flex items-center justify-center gap-1">
                                <Shield className="w-3 h-3" /> Protected by Shield
                            </span>
                        )}
                        {target.has_npp && !target.has_shield && (
                            <span className="text-xs text-blue-400 flex items-center justify-center gap-1">
                                <Shield className="w-3 h-3" /> New Player Protection
                            </span>
                        )}
                        {target.on_cooldown && !target.has_shield && !target.has_npp && (
                            <span className="text-xs text-yellow-400 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" /> Lay low for {formatCooldownTime(target.cooldown_remaining || 0)}
                            </span>
                        )}
                    </div>
                )}

                {!showTypes ? (
                    <Button
                        className={`w-full text-xs h-9 ${target.on_cooldown || target.has_shield || target.has_npp ? 'bg-muted text-muted-foreground' : 'btn-gold'}`}
                        onClick={() => setShowTypes(true)}
                        disabled={isProcessing || target.on_cooldown || target.has_shield || target.has_npp}
                    >
                        {target.has_shield || target.has_npp ? (
                            <>
                                <Shield className="w-4 h-4 mr-2" />
                                Protected
                            </>
                        ) : target.on_cooldown ? (
                            <>
                                <Clock className="w-4 h-4 mr-2" />
                                {formatCooldownTime(target.cooldown_remaining || 0)}
                            </>
                        ) : (
                            <>
                                <Swords className="w-4 h-4 mr-2" />
                                Select Attack Type
                            </>
                        )}
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
                                {/* Attack Header */}
                                <div className="px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/30">
                                    <div className="flex items-center justify-between">
                                        <span className="font-cinzel font-bold text-sm text-primary">{type.name}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full">
                                                <img src="/images/icons/cash.png" alt="" className="w-3 h-3" />
                                                <span className="text-xs font-bold text-red-400">Fee</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full">
                                                <img src="/images/icons/stamina.png" alt="" className="w-3 h-3" />
                                                <span className="text-xs font-bold text-yellow-400">{type.stamina_cost}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{type.description}</p>
                                </div>

                                {/* Potential Gains */}
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
                                                <span className="text-red-300 font-medium">Injure Crew</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Requirements */}
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

export default TargetCard;
