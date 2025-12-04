import { motion } from 'framer-motion';
import { Header } from './Header';
import { PlayerStats } from './PlayerStats';
import { Operations } from './Operations';
import { FamilyHierarchy } from './FamilyHierarchy';
import { BottomNav } from './BottomNav';

export const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background vintage-texture pb-20">
      <Header />
      
      <main className="pt-14">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <PlayerStats />
          <Operations />
          <FamilyHierarchy />
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};
