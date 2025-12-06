import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { PlayerStats } from '@/components/PlayerStats';
import { Operations } from '@/components/Operations';
import { RecentActivity } from '@/components/RecentActivity';
import { Onboarding, useOnboarding } from '@/components/Onboarding';
import { QuickActions } from '@/components/QuickActions';
import { MainLayout } from '@/components/MainLayout';
import { SeasonBanner } from '@/components/SeasonBanner';
import { WalletButton } from '@/components/WalletButton';
import { motion, AnimatePresence } from 'framer-motion';

const Index = () => {
  const { isComplete: onboardingComplete, complete: completeOnboarding } = useOnboarding();

  // Check if user has already seen intro this session
  const hasSeenIntro = sessionStorage.getItem('hasSeenIntro') === 'true';

  const [showOnboarding, setShowOnboarding] = useState(!onboardingComplete);
  const [showDashboard, setShowDashboard] = useState(hasSeenIntro && onboardingComplete);
  const [isLoading, setIsLoading] = useState(!hasSeenIntro && onboardingComplete);

  useEffect(() => {
    if (!hasSeenIntro && onboardingComplete) {
      // Quick initial load only for first-time visitors who completed onboarding
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenIntro, onboardingComplete]);

  const handleOnboardingComplete = () => {
    completeOnboarding();
    setShowOnboarding(false);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  const handleEnter = () => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowDashboard(true);
  };

  // Show onboarding first if not completed
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="font-cinzel text-primary text-sm tracking-wider">
            THE SYNDICATE
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!showDashboard ? (
        <motion.div
          key="hero"
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
        >
          <Hero onEnter={handleEnter} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <MainLayout>
            {/* Background Image */}
            <div
              className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20"
              style={{ backgroundImage: 'url(/images/backgrounds/home.png)' }}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative z-10"
            >
              {/* Season & Round Banner */}
              <div className="pt-4">
                <SeasonBanner
                  season={3}
                  round={7}
                  timeRemaining="2d 14h 32m"
                  topPrize="100 TON"
                />
              </div>

              {/* Wallet Connect Button - Centered */}
              <div className="flex justify-center py-4 px-4">
                <WalletButton />
              </div>

              <PlayerStats />

              <Operations />

              <div className="px-4 mt-6">
                <QuickActions />
              </div>

              <RecentActivity />
            </motion.div>
          </MainLayout>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
