import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface OperationCardProps {
  iconSrc: string;
  title: string;
  onClick?: () => void;
  delay?: number;
  hasBadge?: boolean;
}

const OperationCard = ({ iconSrc, title, onClick, delay = 0, hasBadge = false }: OperationCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="noir-card p-2.5 text-left w-full group hover:border-primary/30 transition-all duration-300 relative"
  >
    {hasBadge && (
      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
    )}
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
        <img src={iconSrc} alt={title} className="w-10 h-10 object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-cinzel font-semibold text-sm text-foreground truncate">{title}</h3>
      </div>
    </div>
  </motion.button>
);

export const Operations = () => {
  const navigate = useNavigate();
  const { player } = useAuth();
  const [hasCollectibleBusiness, setHasCollectibleBusiness] = useState(false);

  // Check if there's income to collect from any business
  useEffect(() => {
    const checkCollectible = async () => {
      if (!player?.id) return;
      try {
        const { data } = await supabase
          .from('player_businesses')
          .select('last_collected')
          .eq('player_id', player.id);

        if (data && data.length > 0) {
          // Check if any business hasn't been collected in the last hour
          const now = new Date();
          const hasCollectible = data.some((b: { last_collected: string | null }) => {
            if (!b.last_collected) return true;
            const lastCollected = new Date(b.last_collected);
            const hoursSince = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);
            return hoursSince >= 1;
          });
          setHasCollectibleBusiness(hasCollectible);
        }
      } catch (e) {
        console.error('Failed to check collectible:', e);
      }
    };
    checkCollectible();
    // Re-check every minute
    const interval = setInterval(checkCollectible, 60000);
    return () => clearInterval(interval);
  }, [player?.id]);

  const operations = [
    {
      iconSrc: '/images/icons/hire.png',
      title: 'Hire',
      path: '/hire',
    },
    {
      iconSrc: '/images/icons/blackmarket.png',
      title: 'Black Market',
      path: '/auction',
    },
    {
      iconSrc: '/images/icons/business.png',
      title: 'Business',
      path: '/business',
      hasBadge: hasCollectibleBusiness,
    },
    {
      iconSrc: '/images/icons/profile.png',
      title: 'Profile',
      path: '/profile',
    },
    {
      iconSrc: '/images/icons/trophy.png',
      title: 'Achievements',
      path: '/achievements',
    },
    {
      iconSrc: '/images/icons/daily.png',
      title: 'Daily',
      path: '/daily-rewards',
    },
    {
      iconSrc: '/images/icons/thevault.png',
      title: 'The Vault',
      path: '/bank',
    },
    {
      iconSrc: '/images/icons/inventory.png',
      title: 'Inventory',
      path: '/inventory',
    },
  ];


  return (
    <section className="py-4 px-4">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="font-cinzel text-base font-semibold text-foreground mb-3"
      >
        Operations
      </motion.h2>

      <div className="grid grid-cols-2 gap-2">
        {operations.map((op, index) => (
          <OperationCard
            key={op.title}
            iconSrc={op.iconSrc}
            title={op.title}
            delay={0.05 * (index + 1)}
            onClick={() => navigate(op.path)}
            hasBadge={'hasBadge' in op ? op.hasBadge : false}
          />
        ))}
      </div>
    </section>
  );
};