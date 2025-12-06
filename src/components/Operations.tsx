import { motion } from 'framer-motion';
import { Users, ShoppingBag, Swords, Home, Briefcase, Target, User, Landmark, Bell, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OperationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  delay?: number;
  badge?: string;
}

const OperationCard = ({ icon, title, description, onClick, delay = 0, badge }: OperationCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="noir-card p-4 text-left w-full group hover:border-primary/30 transition-all duration-300"
  >
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-sm bg-gradient-gold flex items-center justify-center shrink-0 group-hover:shadow-gold transition-shadow duration-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-cinzel font-semibold text-sm text-foreground">{title}</h3>
          {badge && (
            <span className="px-1.5 py-0.5 text-[10px] bg-destructive/20 text-destructive rounded-sm">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
      </div>
    </div>
  </motion.button>
);

export const Operations = () => {
  const navigate = useNavigate();

  const operations = [
    {
      icon: <Users className="w-6 h-6 text-primary-foreground" />,
      title: 'Hire',
      description: 'Recruit defensive units and operatives for your crew',
      path: '/hire',
      badge: 'NEW',
    },
    {
      icon: <ShoppingBag className="w-6 h-6 text-primary-foreground" />,
      title: 'Black Market',
      description: 'Purchase weapons, drugs, and alcohol for your operation',
      path: '/market',
    },
    {
      icon: <Swords className="w-6 h-6 text-primary-foreground" />,
      title: 'Attack',
      description: 'Launch raids on rival families and expand your territory',
      path: '/ops',
    },
    {
      icon: <Home className="w-6 h-6 text-primary-foreground" />,
      title: 'Family',
      description: 'Manage your family hierarchy and promote members',
      path: '/family',
    },
    {
      icon: <Briefcase className="w-6 h-6 text-primary-foreground" />,
      title: 'Business',
      description: 'Invest in speakeasies, casinos, and other ventures',
      path: '/business',
    },
    {
      icon: <Target className="w-6 h-6 text-primary-foreground" />,
      title: 'Missions',
      description: 'Complete jobs to earn rewards and reputation',
      path: '/ops',
    },
    {
      icon: <User className="w-6 h-6 text-primary-foreground" />,
      title: 'Profile',
      description: 'Train your stats and view your character',
      path: '/profile',
    },
    {
      icon: <Landmark className="w-6 h-6 text-primary-foreground" />,
      title: 'The Vault',
      description: 'Deposit cash to protect it from rival attacks',
      path: '/bank',
    },
    {
      icon: <Package className="w-6 h-6 text-primary-foreground" />,
      title: 'Inventory',
      description: 'View your weapons, equipment, and contraband',
      path: '/inventory',
    },
    {
      icon: <Bell className="w-6 h-6 text-primary-foreground" />,
      title: 'Activity',
      description: 'View attack logs, income, and notifications',
      path: '/notifications',
    },
  ];

  return (
    <section className="py-6 px-4">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="font-cinzel text-lg font-semibold text-foreground mb-4 deco-line deco-line-bottom pb-6"
      >
        Operations
      </motion.h2>

      <div className="grid gap-3 mt-8">
        {operations.map((op, index) => (
          <OperationCard
            key={op.title}
            icon={op.icon}
            title={op.title}
            description={op.description}
            badge={op.badge}
            delay={0.1 * (index + 1)}
            onClick={() => navigate(op.path)}
          />
        ))}
      </div>
    </section>
  );
};

