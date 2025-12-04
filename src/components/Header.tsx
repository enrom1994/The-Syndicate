import { motion } from 'framer-motion';
import { WalletButton } from './WalletButton';
import { Crown } from 'lucide-react';

export const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30"
    >
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <span className="font-cinzel font-bold text-sm tracking-wider gold-shimmer">
            THE SYNDICATE
          </span>
        </div>
        <WalletButton />
      </div>
    </motion.header>
  );
};
