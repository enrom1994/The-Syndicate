import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface OperationCardProps {
  iconSrc: string;
  title: string;
  onClick?: () => void;
  delay?: number;
}

const OperationCard = ({ iconSrc, title, onClick, delay = 0 }: OperationCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="noir-card p-2.5 text-left w-full group hover:border-primary/30 transition-all duration-300"
  >
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-sm bg-gradient-gold flex items-center justify-center shrink-0 group-hover:shadow-gold transition-shadow duration-300 overflow-hidden">
        <img src={iconSrc} alt={title} className="w-5 h-5 object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-cinzel font-semibold text-sm text-foreground truncate">{title}</h3>
      </div>
    </div>
  </motion.button>
);

export const Operations = () => {
  const navigate = useNavigate();

  const operations = [
    {
      iconSrc: '/images/icons/hire.png',
      title: 'Hire',
      path: '/hire',
    },
    {
      iconSrc: '/images/icons/auctionhouse.png',
      title: 'Auction House',
      path: '/auction',
    },
    {
      iconSrc: '/images/icons/business.png',
      title: 'Business',
      path: '/business',
    },
    {
      iconSrc: '/images/icons/profile.png',
      title: 'Profile',
      path: '/profile',
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
          />
        ))}
      </div>
    </section>
  );
};