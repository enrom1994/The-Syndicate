import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swords, Shield, Users, TrendingUp, Info } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { EnergyBar, StaminaBar } from './SeasonBanner';
import { GameIcon } from './GameIcon';
import { Button } from './ui/button';
import { useEnergyRegen } from '@/hooks/useEnergyRegen';
import { useStaminaRegen } from '@/hooks/useStaminaRegen';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/hooks/useGameStore';
import { supabase } from '@/lib/supabase';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  delay?: number;
}

const StatCard = ({ icon, label, value, change, delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="noir-card p-2.5 flex items-center gap-3"
  >
    <div className="shrink-0 flex items-center justify-center">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
      <p className="font-cinzel font-bold text-sm text-foreground">{value}</p>
    </div>
    {change && (
      <span className="text-[10px] text-green-500 flex items-center gap-0.5">
        <TrendingUp className="w-2.5 h-2.5" />
        {change}
      </span>
    )}
  </motion.div>
);

// Stat badge component (similar to rank number badge style)
interface StatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay?: number;
}

const StatBadge = ({ icon, label, value, delay = 0 }: StatBadgeProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay }}
    className="flex flex-col items-center"
  >
    <div className="stat-badge flex items-center gap-1 px-2 py-1 text-muted-foreground hover:bg-primary/10 transition-colors">
      {icon}
      <span className="font-inter font-medium text-xs">{value}</span>
    </div>
    <span className="text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</span>
  </motion.div>
);

// Format large numbers in a readable way
const formatCash = (value: number): string => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

// Get rank title based on RESPECT (XP/Level deprecated)
const getRespectRank = (respect: number): { title: string; nextThreshold: number; currentThreshold: number } => {
  if (respect >= 10000) return { title: 'Godfather', nextThreshold: 10000, currentThreshold: 10000 };  // Max rank
  if (respect >= 5000) return { title: 'Boss', nextThreshold: 10000, currentThreshold: 5000 };
  if (respect >= 2500) return { title: 'Underboss', nextThreshold: 5000, currentThreshold: 2500 };
  if (respect >= 1000) return { title: 'Caporegime', nextThreshold: 2500, currentThreshold: 1000 };
  if (respect >= 250) return { title: 'Soldier', nextThreshold: 1000, currentThreshold: 250 };
  return { title: 'Street Thug', nextThreshold: 250, currentThreshold: 0 };
};

interface PlayerStatsProps {
  onOpenOnboarding?: () => void;
}

export const PlayerStats = ({ onOpenOnboarding }: PlayerStatsProps = {}) => {
  const navigate = useNavigate();
  const { player } = useAuth();
  const { crew: hiredCrew, businesses, inventory } = useGameStore();

  // State for leaderboard rank
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  // Fetch player's leaderboard rank
  useEffect(() => {
    let isMounted = true;

    const fetchRank = async () => {
      if (!player?.id) return;

      try {
        // Use get_player_rank RPC for accurate ranking
        const { data, error } = await supabase.rpc('get_player_rank' as any, {
          player_id_input: player.id
        });

        // Don't update state if component unmounted
        if (!isMounted) return;

        if (error) {
          console.error('Error fetching rank:', error);
          return;
        }

        // RPC returns array with one row
        const rankResult = data as { rank: number; networth: number; total_players: number }[] | null;
        if (rankResult && rankResult.length > 0) {
          setPlayerRank(rankResult[0].rank);
        }
      } catch (err: any) {
        // Silently ignore aborted requests and network errors during unmount
        if (!isMounted || err?.name === 'AbortError' || err?.message?.includes('Failed to fetch')) {
          return;
        }
        console.error('Failed to fetch rank:', err);
      }
    };

    fetchRank();
    // Refresh rank every 60 seconds
    const interval = setInterval(fetchRank, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [player?.id]);

  // Energy system with auto-regen - use player's actual energy
  const { energy, formattedTime } = useEnergyRegen(
    player?.energy ?? 100,
    player?.max_energy ?? 100,
    60000 // 1 minute per energy point
  );

  // Stamina system with auto-regen - use player's actual stamina
  const { stamina, formattedTime: staminaFormattedTime } = useStaminaRegen(
    player?.stamina ?? 100,
    player?.max_stamina ?? 100,
    240000 // 4 minutes per stamina point
  );

  // Calculate total crew from hired crew
  const totalCrewCount = hiredCrew.reduce((sum, c) => sum + c.quantity, 0);

  // Calculate defense from player stats + crew + equipment
  const baseDefense = player?.defense ?? 10;
  const crewDefense = hiredCrew.reduce((sum, c) => sum + (c.defense_bonus * c.quantity), 0);
  const equipmentDefense = inventory
    .filter(i => i.category === 'equipment' && i.assigned_quantity > 0)
    .reduce((sum, i) => sum + (i.defense_bonus * i.assigned_quantity), 0);
  const totalDefense = baseDefense + crewDefense + equipmentDefense;

  // Calculate attack from player stats + crew + weapons
  const baseAttack = player?.strength ?? 10;
  const crewAttack = hiredCrew.reduce((sum, c) => sum + (c.attack_bonus * c.quantity), 0);
  const weaponAttack = inventory
    .filter(i => i.category === 'weapon' && i.assigned_quantity > 0)
    .reduce((sum, i) => sum + (i.attack_bonus * i.assigned_quantity), 0);
  const totalAttack = baseAttack + crewAttack + weaponAttack;

  // Calculate Respect-based rank progression (XP deprecated)
  const respect = player?.respect ?? 0;
  const rankInfo = getRespectRank(respect);
  const respectProgress = rankInfo.nextThreshold > rankInfo.currentThreshold
    ? ((respect - rankInfo.currentThreshold) / (rankInfo.nextThreshold - rankInfo.currentThreshold)) * 100
    : 100;  // Max rank
  const respectToNext = rankInfo.nextThreshold - respect;

  // Calculate Net Worth (cash + bank + business value - matches leaderboard RPC)
  const cash = player?.cash ?? 0;
  const bank = player?.banked_cash ?? 0;
  // Business value = sum of (base_purchase_cost * level) - MATCHES BACKEND RPC EXACTLY
  const businessValue = businesses.reduce((sum, b) => sum + (b.base_purchase_cost * b.level), 0);
  const netWorth = cash + bank + businessValue;

  // DEBUG: Log values to identify discrepancy
  console.log('[PlayerStats] Net Worth Debug:', {
    cash,
    banked_cash: bank,
    businessValue,
    netWorth,
    businesses: businesses.map(b => ({ name: b.name, level: b.level, base_cost: b.base_purchase_cost, value: b.base_purchase_cost * b.level })),
    player_id: player?.id,
  });

  return (
    <section className="py-4 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <h2 className="font-cinzel text-base font-semibold text-foreground">Your Empire</h2>
          {onOpenOnboarding && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenOnboarding}
              className="w-6 h-6 rounded-full hover:bg-primary/20"
              title="View Tutorial"
            >
              <Info className="w-4 h-4 text-muted-foreground hover:text-primary" />
            </Button>
          )}
        </div>
        <Link to="/ranks" className="stat-badge text-primary hover:bg-primary/20 transition-colors cursor-pointer">
          Rank #{playerRank ?? '---'}
        </Link>
      </motion.div>

      {/* Combat Stats Badges Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-3 gap-2 mb-3"
      >
        <StatBadge
          icon={<Swords className="w-4 h-4 text-red-400" />}
          label="Attack"
          value={totalAttack}
          delay={0.1}
        />
        <StatBadge
          icon={<Shield className="w-4 h-4 text-blue-400" />}
          label="Defense"
          value={totalDefense}
          delay={0.15}
        />
        <StatBadge
          icon={<Users className="w-4 h-4 text-primary" />}
          label="Crew"
          value={totalCrewCount}
          delay={0.2}
        />
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        {/* Respect/Rank FIRST - Primary progression */}
        <StatCard
          icon={<img src="/images/icons/respect.png" alt="Rank" className="w-10 h-10 object-contain" />}
          label="Rank"
          value={rankInfo.title}
          delay={0.25}
        />
        <StatCard
          icon={<img src="/images/icons/cash.png" alt="Cash" className="w-10 h-10 object-contain" />}
          label="Cash"
          value={formatCash(player?.cash ?? 0)}
          delay={0.3}
        />
        <StatCard
          icon={<img src="/images/icons/diamond.png" alt="Diamonds" className="w-10 h-10 object-contain" />}
          label="Diamonds"
          value={player?.diamonds ?? 0}
          delay={0.35}
        />
        <StatCard
          icon={<img src="/images/icons/moneybag.png" alt="Net Worth" className="w-10 h-10 object-contain" />}
          label="Net Worth"
          value={formatCash(netWorth)}
          delay={0.4}
        />
      </div>

      {/* Respect Progress Bar - Enhanced */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-3 p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-primary/20"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img src="/images/icons/respect.png" alt="Respect" className="w-5 h-5 object-contain" />
            <div>
              <span className="font-cinzel font-semibold text-xs text-foreground">{rankInfo.title}</span>
              <span className="text-[10px] text-muted-foreground ml-2">• {respect.toLocaleString()} Respect</span>
            </div>
          </div>
          {respectToNext > 0 && (
            <span className="text-[10px] text-primary/80 font-medium">
              +{respectToNext.toLocaleString()} to next
            </span>
          )}
        </div>

        {/* Progress Bar - Thicker with gradient */}
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden border border-muted/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${respectProgress}%` }}
            transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-amber-500/80 via-primary to-amber-400/80 rounded-full relative"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </motion.div>
        </div>

        {/* Next Rank Preview */}
        {rankInfo.title !== 'Godfather' && (
          <div className="flex justify-end mt-1.5">
            <span className="text-[9px] text-muted-foreground/70">
              Next: <span className="text-primary/70">{getRespectRank(rankInfo.nextThreshold).title}</span>
            </span>
          </div>
        )}
      </motion.div>

      {/* Energy & Stamina Bars - Side by Side */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <EnergyBar energy={energy} maxEnergy={player?.max_energy ?? 100} regenTime={formattedTime} />
        <StaminaBar stamina={stamina} maxStamina={player?.max_stamina ?? 100} regenTime={staminaFormattedTime} />
      </div>

      {/* Quick Actions placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-4"
      >
        <div className="flex items-center justify-between gap-2">
          {/* All quick actions moved to QuickActions component */}
        </div>
      </motion.div>
    </section>
  );
};