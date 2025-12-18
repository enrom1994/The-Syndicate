import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Crown } from 'lucide-react';

export const Header = () => {
  const { player } = useAuth();
  const [showUsername, setShowUsername] = useState(false);

  // Check if player has Made Man badge
  const hasMadeMan = player?.starter_pack_claimed === true;
  const username = player?.username || player?.first_name || 'Player';

  // Truncate username if too long (max 12 chars)
  const displayUsername = username.length > 12 ? username.slice(0, 12) + '…' : username;

  // Flip between "THE SYNDICATE" and username every 30 seconds if MadeMan
  useEffect(() => {
    if (!hasMadeMan) {
      setShowUsername(false);
      return;
    }

    const interval = setInterval(() => {
      setShowUsername(prev => !prev);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [hasMadeMan]);

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

          {/* Title with flip animation for MadeMan */}
          <div className="flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {hasMadeMan && showUsername ? (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="flex flex-col"
                >
                  {/* Small label */}
                  <span className="text-[8px] uppercase tracking-widest text-amber-500/80 font-semibold">
                    Made Man
                  </span>
                  {/* Username with crown */}
                  <div className="flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-cinzel font-bold text-sm gold-shimmer">
                      {displayUsername}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="syndicate"
                  initial={{ opacity: hasMadeMan ? 0 : 1, y: hasMadeMan ? 10 : 0, scale: hasMadeMan ? 0.95 : 1 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="flex flex-col"
                >
                  {/* Small label for MadeMan players */}
                  {hasMadeMan && (
                    <span className="text-[8px] uppercase tracking-widest text-primary/60 font-semibold">
                      Welcome to
                    </span>
                  )}
                  {/* Main title */}
                  <span className="font-cinzel font-bold text-sm tracking-wider gold-shimmer">
                    THE SYNDICATE
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Currency Balances */}
        <div className="flex items-center gap-2">
          {/* Cash Balance */}
          <div className="flex items-center gap-1.5 bg-muted/30 border border-green-500/30 rounded-full px-2.5 py-1">
            <img src="/images/icons/cash.png" alt="Cash" className="w-4 h-4" />
            <span className="font-cinzel font-bold text-xs text-green-400">
              {formatCash(player?.cash ?? 0)}
            </span>
          </div>

          {/* Diamonds Balance */}
          <div className="flex items-center gap-1.5 bg-muted/30 border border-cyan-500/30 rounded-full px-2.5 py-1">
            <img src="/images/icons/diamond.png" alt="Diamonds" className="w-4 h-4" />
            <span className="font-cinzel font-bold text-xs text-cyan-400">
              {player?.diamonds?.toLocaleString() ?? 0}
            </span>
          </div>
        </div>

      </div>
    </motion.header>
  );
};
