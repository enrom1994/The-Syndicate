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
import { OfflineSummaryModal } from '@/components/OfflineSummaryModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Crown, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OfflineEarnings {
  totalCash: number;
  businessIncome: number;
  hoursAway: number;
  attacksReceived: number;
  cashLost: number;
}

interface VipStatus {
  isActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
}

const Index = () => {
  const { isComplete: onboardingComplete, complete: completeOnboarding } = useOnboarding();
  const { player } = useAuth();

  // Check if user has already seen intro this session
  const hasSeenIntro = sessionStorage.getItem('hasSeenIntro') === 'true';
  const hasSeenOfflineSummary = sessionStorage.getItem('hasSeenOfflineSummary') === 'true';

  const [showOnboarding, setShowOnboarding] = useState(!onboardingComplete);
  const [showDashboard, setShowDashboard] = useState(hasSeenIntro && onboardingComplete);
  const [isLoading, setIsLoading] = useState(!hasSeenIntro && onboardingComplete);
  const [showOfflineSummary, setShowOfflineSummary] = useState(false);
  const [offlineEarnings, setOfflineEarnings] = useState<OfflineEarnings | null>(null);
  const [vipStatus, setVipStatus] = useState<VipStatus>({ isActive: false, daysRemaining: 0, hoursRemaining: 0 });

  // Fetch VIP status
  useEffect(() => {
    const fetchVipStatus = async () => {
      if (!player?.id) return;
      const { data, error } = await supabase.rpc('get_vip_status', {
        target_player_id: player.id
      });
      if (!error && data) {
        setVipStatus({
          isActive: data.is_active,
          daysRemaining: data.days_remaining || 0,
          hoursRemaining: data.hours_remaining || 0,
        });
      }
    };
    fetchVipStatus();
  }, [player?.id]);

  useEffect(() => {
    if (!hasSeenIntro && onboardingComplete) {
      // Quick initial load only for first-time visitors who completed onboarding
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenIntro, onboardingComplete]);

  // Fetch offline summary when dashboard loads
  useEffect(() => {
    if (showDashboard && player?.id && !hasSeenOfflineSummary) {
      fetchOfflineSummary();
    }
  }, [showDashboard, player?.id, hasSeenOfflineSummary]);

  const fetchOfflineSummary = async () => {
    if (!player?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_offline_summary', {
        target_player_id: player.id
      });

      if (error) throw error;

      if (data?.show_summary) {
        setOfflineEarnings({
          totalCash: data.net_earnings || 0,
          businessIncome: data.business_income || 0,
          hoursAway: Math.round(data.hours_away || 0),
          attacksReceived: data.attacks_received || 0,
          cashLost: data.cash_lost || 0
        });
        setShowOfflineSummary(true);
      }
    } catch (error) {
      console.error('Failed to fetch offline summary:', error);
    }
  };

  const handleCloseOfflineSummary = () => {
    setShowOfflineSummary(false);
    sessionStorage.setItem('hasSeenOfflineSummary', 'true');
  };

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
    <>
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
                <div className="flex flex-col items-center py-4 px-4 gap-2">
                  <WalletButton />

                  {/* VIP Status Badge */}
                  {vipStatus.isActive && (
                    <Link to="/shop">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-cinzel text-amber-300">VIP</span>
                        <Timer className="w-3 h-3 text-amber-400/70" />
                        <span className="text-xs text-amber-200">{vipStatus.daysRemaining}d {vipStatus.hoursRemaining}h</span>
                      </motion.div>
                    </Link>
                  )}
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

      {/* Offline Summary Modal */}
      {offlineEarnings && (
        <OfflineSummaryModal
          isOpen={showOfflineSummary}
          onClose={handleCloseOfflineSummary}
          earnings={offlineEarnings}
        />
      )}
    </>
  );
};

export default Index;

