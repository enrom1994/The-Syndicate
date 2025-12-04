import { motion } from 'framer-motion';
import { Crown, Star, Shield, Sword, User } from 'lucide-react';

interface RankProps {
  icon: React.ReactNode;
  title: string;
  name: string;
  isYou?: boolean;
  delay?: number;
}

const RankCard = ({ icon, title, name, isYou, delay = 0 }: RankProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`flex items-center gap-3 p-3 rounded-sm ${
      isYou ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
    }`}
  >
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
      isYou ? 'bg-gradient-gold' : 'bg-muted'
    }`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
      <p className={`font-cinzel font-semibold text-sm ${isYou ? 'text-primary' : 'text-foreground'}`}>
        {name} {isYou && <span className="text-xs font-inter">(You)</span>}
      </p>
    </div>
  </motion.div>
);

export const FamilyHierarchy = () => {
  return (
    <section className="py-6 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between mb-4"
      >
        <h2 className="font-cinzel text-lg font-semibold text-foreground">The Corleone Family</h2>
        <span className="stat-badge text-muted-foreground">32 Members</span>
      </motion.div>

      <div className="noir-card p-4 space-y-2">
        <RankCard
          icon={<Crown className="w-4 h-4 text-primary-foreground" />}
          title="Boss"
          name="Don Vito"
          delay={0.1}
        />
        <RankCard
          icon={<Star className="w-4 h-4 text-muted-foreground" />}
          title="Consigliere"
          name="Tom Hagen"
          delay={0.2}
        />
        <RankCard
          icon={<Shield className="w-4 h-4 text-muted-foreground" />}
          title="Underboss"
          name="Sonny"
          delay={0.3}
        />
        <RankCard
          icon={<Sword className="w-4 h-4 text-muted-foreground" />}
          title="Captain"
          name="Clemenza"
          delay={0.4}
        />
        <RankCard
          icon={<User className="w-4 h-4 text-primary-foreground" />}
          title="Soldier"
          name="Michael"
          isYou
          delay={0.5}
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="text-center text-xs text-muted-foreground mt-4"
      >
        Earn respect to climb the ranks
      </motion.p>
    </section>
  );
};
