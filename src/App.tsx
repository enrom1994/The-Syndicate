import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TonConnectProvider } from "@/providers/TonConnectProvider";
import { RewardAnimationProvider } from "@/components/RewardAnimation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useGameStore } from "@/hooks/useGameStore";
import { TelegramGuard } from "@/components/TelegramGuard";
import { useEffect } from "react";
import Index from "./pages/Index";
import MarketPage from "./pages/MarketPage";
import OpsPage from "./pages/OpsPage";
import FamilyPage from "./pages/FamilyPage";
import FamilySettingsPage from "./pages/FamilySettingsPage";
import BrowseFamiliesPage from "./pages/BrowseFamiliesPage";
import CreateFamilyPage from "./pages/CreateFamilyPage";
import RanksPage from "./pages/RanksPage";
import BusinessPage from "./pages/BusinessPage";
import InventoryPage from "./pages/InventoryPage";
import HirePage from "./pages/HirePage";
import ProfilePage from "./pages/ProfilePage";
import BankPage from "./pages/BankPage";
import NotificationsPage from "./pages/NotificationsPage";
import DailyRewardsPage from "./pages/DailyRewardsPage";
import ShopPage from "./pages/ShopPage";
import BountyBoardPage from "./pages/BountyBoardPage";
import AchievementsPage from "./pages/AchievementsPage";
import TasksPage from "./pages/TasksPage";
import LuckyWheelPage from "./pages/LuckyWheelPage";
import AuctionPage from "./pages/AuctionPage";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";

const queryClient = new QueryClient();

import { useDeepLink } from "@/hooks/useDeepLink";

import { toast } from "sonner";

// Syncs auth state with game store and loads initial data
const GameInitializer = () => {
  const { player, isAuthenticated } = useAuth();
  const { setPlayerId, loadAllData, checkPendingUpkeep, reset } = useGameStore();

  useEffect(() => {
    const initializeGame = async () => {
      if (isAuthenticated && player?.id) {
        setPlayerId(player.id);

        // Show upkeep deduction notifications on login
        const upkeepResult = await checkPendingUpkeep();
        if (upkeepResult && upkeepResult.hours_processed > 0) {
          if (upkeepResult.total_deducted > 0) {
            toast.info(`💰 Crew Upkeep: -$${upkeepResult.total_deducted.toLocaleString()}`, {
              description: `${upkeepResult.hours_processed} hour(s) of upkeep paid`,
              duration: 5000,
            });
          }
          if (upkeepResult.crew_lost > 0) {
            toast.warning(`⚠️ ${upkeepResult.crew_lost} Crew Left!`, {
              description: "Couldn't afford full upkeep costs",
              duration: 6000,
            });
          }
        }

        // Load the rest of the game data (upkeep already processed)
        await loadAllData();
      } else {
        reset();
      }
    };

    initializeGame();
  }, [isAuthenticated, player?.id, setPlayerId, loadAllData, checkPendingUpkeep, reset]);

  return null;
};


const DeepLinkHandler = () => {
  useDeepLink();
  return null;
};

const App = () => {
  return (
    <TelegramGuard>
      <TonConnectProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <RewardAnimationProvider>
                <GameInitializer />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <ScrollToTop />
                  <DeepLinkHandler />
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/market" element={<MarketPage />} />
                      <Route path="/ops" element={<OpsPage />} />
                      <Route path="/family" element={<FamilyPage />} />
                      <Route path="/family/settings" element={<FamilySettingsPage />} />
                      <Route path="/family/browse" element={<BrowseFamiliesPage />} />
                      <Route path="/family/create" element={<CreateFamilyPage />} />
                      <Route path="/ranks" element={<RanksPage />} />
                      <Route path="/business" element={<BusinessPage />} />
                      <Route path="/inventory" element={<InventoryPage />} />
                      <Route path="/hire" element={<HirePage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/bank" element={<BankPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/daily-rewards" element={<DailyRewardsPage />} />
                      <Route path="/shop" element={<ShopPage />} />
                      <Route path="/bounty-board" element={<BountyBoardPage />} />
                      <Route path="/achievements" element={<AchievementsPage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/lucky-wheel" element={<LuckyWheelPage />} />
                      <Route path="/auction" element={<AuctionPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ErrorBoundary>
                </BrowserRouter>
              </RewardAnimationProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </TonConnectProvider>
    </TelegramGuard>
  );
};

export default App;
