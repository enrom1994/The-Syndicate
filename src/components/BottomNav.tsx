import { motion } from 'framer-motion';
import { Home, ShoppingBag, Swords, Users, Trophy } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '@/hooks/useTelegram';
import { useNotifications } from '@/hooks/useNotifications';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isActive?: boolean;
  badge?: boolean | number;
}

const NavItem = ({ icon, label, path, isActive, badge }: NavItemProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className={`flex flex-col items-center gap-1 py-2 px-3 rounded-sm transition-all duration-300 ${isActive
        ? 'text-primary'
        : 'text-muted-foreground hover:text-foreground'
        }`}
    >
      <div className="relative">
        {icon}
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
          />
        )}
        {/* Notification Badge */}
        {badge && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-destructive text-[8px] text-white rounded-full flex items-center justify-center font-bold"
          >
            {typeof badge === 'number' ? (badge > 9 ? '9+' : badge) : ''}
          </motion.div>
        )}
      </div>
      <span className="text-[10px] font-inter uppercase tracking-wider">{label}</span>
    </button>
  );
};

export const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Enable Telegram back button handling
  useTelegramBackButton();

  // Real badge state
  const badges = useNotifications();

  const navItems = [
    { icon: <Home className="w-5 h-5" />, label: 'Home', path: '/', badge: badges.home },
    { icon: <ShoppingBag className="w-5 h-5" />, label: 'Market', path: '/market', badge: badges.market },
    { icon: <Swords className="w-5 h-5" />, label: 'Ops', path: '/ops', badge: badges.ops },
    { icon: <Users className="w-5 h-5" />, label: 'Family', path: '/family', badge: badges.family },
    { icon: <Trophy className="w-5 h-5" />, label: 'Ranks', path: '/ranks', badge: badges.ranks },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/30"
    >
      <div className="container flex items-center justify-around py-2 px-2 safe-area-pb">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            isActive={currentPath === item.path}
            badge={item.badge}
          />
        ))}
      </div>
    </motion.nav>
  );
};

