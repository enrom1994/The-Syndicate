import { motion } from 'framer-motion';
import { Users, ShoppingBag, Swords, Home, Briefcase, Target, User, Landmark, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OperationCardProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  delay?: number;
  badge?: string;
}

const OperationCard = ({ icon, title, onClick, delay = 0, badge }: OperationCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="noir-card p-2.5 text-left w-full group hover:border-primary/30 transition-all duration-300"
  >
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-sm bg-gradient-gold flex items-center justify-center shrink-0 group-hover:shadow-gold transition-shadow duration-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-cinzel font-semibold text-sm text-foreground truncate">{title}</h3>
          {badge && (
            <span className="px-1 py-0.5 text-[8px] bg-destructive/20 text-destructive rounded-sm">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  </motion.button>
);

export const Operations = () => {
  const navigate = useNavigate();

  const operations = [
    {
      icon: <Users className="w-4 h-4 text-primary-foreground" />,
      title: 'Hire',
      path: '/hire',
      badge: 'NEW',
    },
    {
      icon: <ShoppingBag className="w-4 h-4 text-primary-foreground" />,
      title: 'Black Market',
      path: '/market',
    },
    {
      icon: <Swords className="w-4 h-4 text-primary-foreground" />,
      title: 'Attack',
      path: '/ops',
    },
    {
      icon: <Home className="w-4 h-4 text-primary-foreground" />,
      title: 'Family',
      path: '/family',
    },
    {
      icon: <Briefcase className="w-4 h-4 text-primary-foreground" />,
      title: 'Business',
      path: '/business',
    },
    {
      icon: <Target className="w-4 h-4 text-primary-foreground" />,
      title: 'Missions',
      path: '/ops',
    },
    {
      icon: <User className="w-4 h-4 text-primary-foreground" />,
      title: 'Profile',
      path: '/profile',
    },
    {
      icon: <Landmark className="w-4 h-4 text-primary-foreground" />,
      title: 'The Vault',
      path: '/bank',
    },
    {
      icon: <Package className="w-4 h-4 text-primary-foreground" />,
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
            icon={op.icon}
            title={op.title}
            badge={op.badge}
            delay={0.05 * (index + 1)}
            onClick={() => navigate(op.path)}
          />
        ))}
      </div>
    </section>
  );
};