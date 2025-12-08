import { motion } from 'framer-motion';
import { Crown, Users, Shield, TrendingUp, DollarSign } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { EnergyBar } from './SeasonBanner';
import { GameIcon } from './GameIcon';
import { useEnergyRegen } from '@/hooks/useEnergyRegen';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/hooks/useGameStore';

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
    className="noir-card p-2.5 flex items-center gap-2"
  >
    <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
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

// Format large numbers in a readable way
const formatCash = (value: number): string => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

// Get rank title based on level
const getRankTitle = (level: number): string => {
  if (level >= 50) return 'Don';
  if (level >= 40) return 'Underboss';
  if (level >= 30) return 'Consigliere';
  if (level >= 25) return 'Caporegime';
  if (level >= 15) return 'Soldier';
  if (level >= 10) return 'Associate';
  if (level >= 5) return 'Made Man';
  return 'Street Runner';
};

export const PlayerStats = () => {
  const navigate = useNavigate();
  const { player } = useAuth();
  const { crew: hiredCrew, businesses } = useGameStore();

  // Energy system with auto-regen - use player's actual energy
  const { energy, formattedTime } = useEnergyRegen(
    player?.energy ?? 100,
    player?.max_energy ?? 100,
    60000 // 1 minute per energy point
  );

  // Calculate total crew from hired crew
  const totalCrewCount = hiredCrew.reduce((sum, c) => sum + c.quantity, 0);

  // Calculate defense from player stats + crew
  const baseDefense = player?.defense ?? 10;
  const crewDefense = hiredCrew.reduce((sum, c) => sum + (c.defense_bonus * c.quantity), 0);
  const totalDefense = baseDefense + crewDefense;

  // Calculate XP progress
  const level = player?.level ?? 1;
  const experience = player?.experience ?? 0;
  const xpNeeded = level * 1000; // Simple formula: level * 1000 XP per level
  const xpProgress = Math.min((experience / xpNeeded) * 100, 100);

  // Calculate Net Worth (cash + bank + business values)
  const cash = player?.cash ?? 0;
  const bank = player?.banked_cash ?? 0;
  const businessValue = businesses.reduce((sum, b) => sum + (b.income_per_hour * 24), 0); // Daily income as value
  const netWorth = cash + bank + businessValue;

  return (
    <section className="py-4 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-3"
      >
        <h2 className="font-cinzel text-base font-semibold text-foreground">Your Empire</h2>
        <Link to="/ranks" className="stat-badge text-primary hover:bg-primary/20 transition-colors cursor-pointer">
          Rank #{player?.respect ? Math.max(1, 1000 - player.respect) : '---'}
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<DollarSign className="w-4 h-4 text-green-500" />}
          label="Net Worth"
          value={formatCash(netWorth)}
          delay={0.1}
        />
        <StatCard
          icon={<Crown className="w-4 h-4 text-primary" />}
          label="Rank"
          value={getRankTitle(level)}
          delay={0.15}
        />
        <StatCard
          icon={<GameIcon type="cash" className="w-4 h-4" />}
          label="Cash"
          value={formatCash(player?.cash ?? 0)}
          delay={0.2}
        />
        <StatCard
          icon={<Users className="w-4 h-4 text-primary" />}
          label="Crew"
          value={totalCrewCount}
          delay={0.25}
        />
        <StatCard
          icon={<Shield className="w-4 h-4 text-primary" />}
          label="Defense"
          value={totalDefense}
          delay={0.3}
        />
        <StatCard
          icon={<GameIcon type="diamond" className="w-4 h-4" />}
          label="Diamonds"
          value={player?.diamonds ?? 0}
          delay={0.35}
        />
      </div>

      {/* Respect Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-3 noir-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Respect</span>
          <span className="font-inter font-medium text-sm text-primary">{(player?.respect ?? 0).toLocaleString()}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((player?.respect ?? 0) / 100, 100)}%` }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-full bg-gradient-gold rounded-full"
          />
        </div>
      </motion.div>

      {/* Energy Bar */}
      <EnergyBar energy={energy} maxEnergy={player?.max_energy ?? 100} regenTime={formattedTime} />

      {/* XP Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-3 noir-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Level Progress</span>
            <span className="text-xs font-bold text-primary bg-primary/20 px-1.5 py-0.5 rounded">Lv.{level}</span>
          </div>
          <span className="font-inter font-medium text-xs text-muted-foreground">
            {experience.toLocaleString()} / {xpNeeded.toLocaleString()} XP
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-full bg-gradient-to-r from-primary via-yellow-500 to-primary rounded-full"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {(xpNeeded - experience).toLocaleString()} XP to Level {level + 1}
        </p>
      </motion.div>

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