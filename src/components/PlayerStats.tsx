import { motion } from 'framer-motion';
import { Crown, Users, Shield, TrendingUp, Calendar, Store, Target, Gem } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EnergyBar } from './SeasonBanner';
import { Button } from '@/components/ui/button';
import { GameIcon } from './GameIcon';

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
    className="noir-card p-4 flex items-center gap-3"
  >
    <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</p>
      <p className="font-cinzel font-bold text-lg text-foreground">{value}</p>
    </div>
    {change && (
      <span className="text-xs text-green-500 flex items-center gap-0.5">
        <TrendingUp className="w-3 h-3" />
        {change}
      </span>
    )}
  </motion.div>
);

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  onClick?: () => void;
  delay?: number;
}

const QuickAction = ({ icon, label, badge, onClick, delay = 0 }: QuickActionProps) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="noir-card p-3 flex flex-col items-center gap-1 min-w-[70px] hover:border-primary/30 transition-all"
  >
    <div className="relative">
      <div className="w-9 h-9 rounded-full bg-gradient-gold flex items-center justify-center">
        {icon}
      </div>
      {badge && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-destructive text-[10px] text-white rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
    <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
  </motion.button>
);

export const PlayerStats = () => {
  const navigate = useNavigate();

  // Mock data - will come from GameContext
  const energy = 85;
  const maxEnergy = 100;
  const diamonds = 150;
  // const dailyRewardAvailable = true; // No longer needed here

  return (
    <section className="py-6 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-4"
      >
        <h2 className="font-cinzel text-lg font-semibold text-foreground">Your Empire</h2>
        <span className="stat-badge text-primary">Rank #1,247</span>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Crown className="w-5 h-5 text-primary" />}
          label="Rank"
          value="Soldier"
          delay={0.1}
        />
        <StatCard
          icon={<GameIcon type="cash" className="w-6 h-6" />}
          label="Cash"
          value="$12.5M"
          change="+5%"
          delay={0.2}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-primary" />}
          label="Crew"
          value="247"
          change="+12"
          delay={0.3}
        />
        <StatCard
          icon={<Shield className="w-5 h-5 text-primary" />}
          label="Defense"
          value="85%"
          delay={0.4}
        />
      </div>

      {/* Happiness Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-3 noir-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Happiness</span>
          <span className="font-inter font-medium text-sm text-primary">72%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '72%' }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-full bg-gradient-gold rounded-full"
          />
        </div>
      </motion.div>

      {/* Energy Bar */}
      <EnergyBar energy={energy} maxEnergy={maxEnergy} regenTime="2m 30s" />

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
            <span className="text-xs font-bold text-primary bg-primary/20 px-1.5 py-0.5 rounded">Lv.25</span>
          </div>
          <span className="font-inter font-medium text-xs text-muted-foreground">12,450 / 15,000 XP</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '83%' }}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-full bg-gradient-to-r from-primary via-yellow-500 to-primary rounded-full"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">2,550 XP to Level 26</p>
      </motion.div>

      {/* Quick Actions - No buttons here anymore */}
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