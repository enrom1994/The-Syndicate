import { motion } from 'framer-motion';
import { Crown, User } from 'lucide-react';
import { useTelegramPhoto } from '@/hooks/useTelegram';

export const Header = () => {
  const photoUrl = useTelegramPhoto();

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

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-muted/50 overflow-hidden border border-primary/30">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};
