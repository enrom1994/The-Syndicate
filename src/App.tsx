import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TonConnectProvider } from "@/providers/TonConnectProvider";
import { RewardAnimationProvider } from "@/components/RewardAnimation";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <TonConnectProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RewardAnimationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RewardAnimationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </TonConnectProvider>
);

export default App;

