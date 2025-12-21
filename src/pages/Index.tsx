import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { PlayerStats } from '@/components/PlayerStats';
import { Operations } from '@/components/Operations';
import { RecentActivity } from '@/components/RecentActivity';
import { useOnboarding } from '@/components/Onboarding';
import { ClaimRewardModal } from '@/components/ClaimRewardModal';
import { QuickActions } from '@/components/QuickActions';
import { MainLayout } from '@/components/MainLayout';
import { WalletButton } from '@/components/WalletButton';
import { OfflineSummaryModal } from '@/components/OfflineSummaryModal';
import { TelegramBanner } from '@/components/tutorial/TelegramBanner';
import { FounderBonusBanner } from '@/components/FounderBonusBanner';

import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Crown, Timer, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

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

interface ProtectionStatus {
  isActive: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
}

const Index = () => {
  const { isComplete: onboardingComplete, complete: completeOnboarding } = useOnboarding();
  const { player } = useAuth();

  // Check if user has already seen intro this session
  const hasSeenIntro = sessionStorage.getItem('hasSeenIntro') === 'true';
  const hasSeenOfflineSummary = sessionStorage.getItem('hasSeenOfflineSummary') === 'true';

  // New dopamine-first flow: Skip mandatory onboarding, show claim modal instead
  // CRITICAL: If onboarding is complete, user has already claimed - go straight to dashboard
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(onboardingComplete || hasSeenIntro);
  const [isLoading, setIsLoading] = useState(!onboardingComplete && !hasSeenIntro);
  const [showOfflineSummary, setShowOfflineSummary] = useState(false);
  const [offlineEarnings, setOfflineEarnings] = useState<OfflineEarnings | null>(null);
  const [vipStatus, setVipStatus] = useState<VipStatus>({ isActive: false, daysRemaining: 0, hoursRemaining: 0 });
  const [protectionStatus, setProtectionStatus] = useState<ProtectionStatus>({ isActive: false, hoursRemaining: 0, minutesRemaining: 0 });
  const [starterPackAvailable, setStarterPackAvailable] = useState(false);
  const [starterPackTimer, setStarterPackTimer] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Calculate protection status from player data
  useEffect(() => {
    if (player?.protection_expires_at) {
      const expiresAt = new Date(player.protection_expires_at);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setProtectionStatus({ isActive: true, hoursRemaining: hours, minutesRemaining: minutes });
      } else {
        setProtectionStatus({ isActive: false, hoursRemaining: 0, minutesRemaining: 0 });
      }
    } else {
      setProtectionStatus({ isActive: false, hoursRemaining: 0, minutesRemaining: 0 });
    }
  }, [player?.protection_expires_at]);

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

  // Calculate starter pack availability (24h window)
  useEffect(() => {
    if (!player?.created_at || (player as any)?.starter_pack_claimed) {
      setStarterPackAvailable(false);
      return;
    }

    const createdAt = new Date(player.created_at).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const interval = setInterval(() => {
      const remaining = twentyFourHours - (Date.now() - createdAt);
      if (remaining <= 0) {
        setStarterPackAvailable(false);
        setStarterPackTimer('');
        clearInterval(interval);
      } else {
        setStarterPackAvailable(true);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setStarterPackTimer(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player?.created_at, (player as any)?.starter_pack_claimed]);

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

  // Hero CLAIM button pressed - show reward modal
  const handleEnter = () => {
    setShowClaimModal(true);
  };

  // Reward claimed - use RPC for server-side validation
  const handleClaimReward = async () => {
    const CLAIM_KEY = 'mafia_founder_bonus_claimed';

    // Quick client-side check (server is authoritative)
    if (localStorage.getItem(CLAIM_KEY) === 'true') {
      // Already claimed locally, just proceed to dashboard
      setShowClaimModal(false);
      completeOnboarding();
      sessionStorage.setItem('hasSeenIntro', 'true');
      setShowDashboard(true);
      return;
    }

    if (player?.id) {
      try {
        // Use RPC for atomic, server-validated claim
        const { data, error } = await supabase.rpc('claim_founder_bonus' as any, {
          player_id_input: player.id
        });

        if (error) {
          console.error('Founder bonus RPC error:', error);
          // Still proceed to dashboard even if claim fails
        } else if (data?.success) {
          // Mark as claimed locally (backup for UX)
          localStorage.setItem(CLAIM_KEY, 'true');

          toast({
            title: '💎 Founder Bonus Claimed!',
            description: `+${data.diamonds_awarded} Diamonds added to your account`,
          });
        } else if (data?.already_claimed) {
          // Already claimed on server, sync local state
          localStorage.setItem(CLAIM_KEY, 'true');
        }
      } catch (error) {
        console.error('Failed to claim founder bonus:', error);
      }
    }

    // Always proceed to dashboard
    setShowClaimModal(false);
    completeOnboarding();
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowDashboard(true);
  };

  // REMOVED: Mandatory onboarding flow
  // New flow: Hero → ClaimModal → Dashboard

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
            {/* ClaimRewardModal overlay on hero */}
            <ClaimRewardModal
              isOpen={showClaimModal}
              onClaim={handleClaimReward}
            />
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
                {/* Founder Bonus Claim for existing users who haven't claimed yet */}
                <FounderBonusBanner />



                {/* Tutorial Step 1: Join Telegram */}
                <TelegramBanner />

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

                  {/* Protection Shield Badge */}
                  {protectionStatus.isActive && (
                    <Link to="/shop">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded-full"
                      >
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-cinzel text-cyan-300">PROTECTED</span>
                        <Timer className="w-3 h-3 text-cyan-400/70" />
                        <span className="text-xs text-cyan-200">
                          {protectionStatus.hoursRemaining > 0
                            ? `${protectionStatus.hoursRemaining}h ${protectionStatus.minutesRemaining}m`
                            : `${protectionStatus.minutesRemaining}m`}
                        </span>
                      </motion.div>
                    </Link>
                  )}

                  {/* Starter Pack Quicklink */}
                  {starterPackAvailable && (
                    <Link to="/shop">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <span className="text-xl">🎁</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-red-400 leading-tight">LIMITED OFFER</p>
                          <p className="text-xs font-cinzel text-foreground">Starter Pack • 1 TON</p>
                        </div>
                        <div className="flex items-center gap-1 bg-red-900/50 px-2 py-1 rounded">
                          <Timer className="w-3 h-3 text-red-300" />
                          <span className="text-[10px] font-mono text-red-200">{starterPackTimer}</span>
                        </div>
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

