import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import type { Database } from '../lib/database.types';

type Player = Database['public']['Tables']['players']['Row'];
type Business = Database['public']['Tables']['businesses']['Row'];
type Mission = Database['public']['Tables']['missions']['Row'];

interface GameContextType {
  player: Player | null;
  businesses: Business[];
  missions: Mission[];
  loading: boolean;
  collectIncome: () => Promise<void>;
  purchaseBusiness: (type: string) => Promise<{ success: boolean; message: string }>;
  executeMission: (missionId: string) => Promise<{ success: boolean; message: string }>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useTelegram();
  const [player, setPlayer] = useState<Player | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadGameData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadGameData = async () => {
    if (!user) return;

    try {
      // Load or create player
      let { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('telegram_id', user.id)
        .single();

      if (playerError && playerError.code === 'PGRST116') {
        // Create new player
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            telegram_id: user.id,
            username: user.username || `Boss_${user.id}`,
            cash: 1000,
            respect: 0,
            level: 1,
            experience: 0,
            energy: 100,
            max_energy: 100,
          })
          .select()
          .single();

        if (createError) throw createError;
        playerData = newPlayer;
      } else if (playerError) {
        throw playerError;
      }

      setPlayer(playerData);

      // Load businesses
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('player_id', playerData.id);

      if (businessData) setBusinesses(businessData);

      // Load missions
      const { data: missionData } = await supabase
        .from('missions')
        .select('*');

      if (missionData) setMissions(missionData);

    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const collectIncome = async () => {
    if (!player) return;
    // Implementation placeholder - would need backend logic or RPC
    console.log('Collecting income...');
  };

  const purchaseBusiness = async (type: string) => {
    if (!player) return { success: false, message: 'Player not found' };
    console.log('Purchasing business:', type);
    return { success: true, message: 'Business purchased!' };
  };

  const executeMission = async (missionId: string) => {
    if (!player) return { success: false, message: 'Player not found' };
    console.log('Executing mission:', missionId);
    return { success: true, message: 'Mission executed!' };
  };

  return (
    <GameContext.Provider
      value={{
        player,
        businesses,
        missions,
        loading,
        collectIncome,
        purchaseBusiness,
        executeMission,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
