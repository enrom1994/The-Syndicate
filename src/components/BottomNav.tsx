import { motion } from 'framer-motion';
import { Home, ShoppingBag, Swords, Users, Trophy } from 'lucide-react';
import { useState } from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, isActive, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 py-2 px-3 rounded-sm transition-all duration-300 ${
      isActive 
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
    </div>
    <span className="text-[10px] font-inter uppercase tracking-wider">{label}</span>
  </button>
);

export const BottomNav = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <motion.nav
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/30"
    >
      <div className="container flex items-center justify-around py-2 px-2 safe-area-pb">
        <NavItem
          icon={<Home className="w-5 h-5" />}
          label="Home"
          isActive={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
        />
        <NavItem
          icon={<ShoppingBag className="w-5 h-5" />}
          label="Market"
          isActive={activeTab === 'market'}
          onClick={() => setActiveTab('market')}
        />
        <NavItem
          icon={<Swords className="w-5 h-5" />}
          label="Attack"
          isActive={activeTab === 'attack'}
          onClick={() => setActiveTab('attack')}
        />
        <NavItem
          icon={<Users className="w-5 h-5" />}
          label="Family"
          isActive={activeTab === 'family'}
          onClick={() => setActiveTab('family')}
        />
        <NavItem
          icon={<Trophy className="w-5 h-5" />}
          label="Ranks"
          isActive={activeTab === 'ranks'}
          onClick={() => setActiveTab('ranks')}
        />
      </div>
    </motion.nav>
  );
};
