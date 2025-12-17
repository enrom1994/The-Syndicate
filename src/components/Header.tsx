import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export const Header = () => {
  const { player } = useAuth();

  const formatCash = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toLocaleString()}`;
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30"
    >
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="Logo" className="w-10 h-10" />
          <span className="font-cinzel font-bold text-sm tracking-wider gold-shimmer">
            THE SYNDICATE
          </span>
        </div>

        {/* Cash Balance */}
        <div className="flex items-center gap-1.5 bg-muted/30 border border-primary/30 rounded-full px-3 py-1">
          <img src="/images/icons/cash.png" alt="Cash" className="w-4 h-4" />
          <span className="font-cinzel font-bold text-xs text-green-400">
            {formatCash(player?.cash ?? 0)}
          </span>
        </div>
      </div>
    </motion.header>
  );
};
