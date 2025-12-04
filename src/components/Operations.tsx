import { motion } from 'framer-motion';
import { Users, ShoppingBag, Swords, Home, Briefcase, Target } from 'lucide-react';

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
        <OperationCard
          icon={<Users className="w-6 h-6 text-primary-foreground" />}
          title="Hire"
          description="Recruit defensive units and operatives for your crew"
          delay={0.1}
          badge="NEW"
        />
        <OperationCard
          icon={<ShoppingBag className="w-6 h-6 text-primary-foreground" />}
          title="Black Market"
          description="Purchase weapons, drugs, and alcohol for your operation"
          delay={0.2}
        />
        <OperationCard
          icon={<Swords className="w-6 h-6 text-primary-foreground" />}
          title="Attack"
          description="Launch raids on rival families and expand your territory"
          delay={0.3}
        />
        <OperationCard
          icon={<Home className="w-6 h-6 text-primary-foreground" />}
          title="Family"
          description="Manage your family hierarchy and promote members"
          delay={0.4}
        />
        <OperationCard
          icon={<Briefcase className="w-6 h-6 text-primary-foreground" />}
          title="Business"
          description="Invest in speakeasies, casinos, and other ventures"
          delay={0.5}
        />
        <OperationCard
          icon={<Target className="w-6 h-6 text-primary-foreground" />}
          title="Missions"
          description="Complete jobs to earn rewards and reputation"
          delay={0.6}
        />
      </div>
    </section>
  );
};
