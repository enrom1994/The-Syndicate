import { motion } from 'framer-motion';
import { Crown, Users, DollarSign, Shield, Target, TrendingUp } from 'lucide-react';

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

export const PlayerStats = () => {
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
          icon={<DollarSign className="w-5 h-5 text-primary" />}
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
    </section>
  );
};
