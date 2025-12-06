import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import type { Database } from '../lib/database.types';

type Player = Database['public']['Tables']['players']['Row'];
type Business = Database['public']['Tables']['businesses']['Row'];
type Mission = Database['public']['Tables']['missions']['Row'];
type PlayerInsert = Database['public']['Tables']['players']['Insert']; // Added for explicit typing

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
      setLoading(false); // Ensure loading is set to false if no user
    }
  }, [user]);

  const loadGameData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let playerData: Player | null = null;

      // Attempt to load existing player
      const { data: existingPlayer, error: playerFetchError } = await supabase
        .from('players')
        .select('*')
        .eq('telegram_id', user.id)
        .single();

      if (playerFetchError && playerFetchError.code === 'PGRST116') {
        // Player not found, create new player
        const newPlayerInsert: PlayerInsert = { // Explicitly type the insert object
          telegram_id: user.id,
          username: user.username || `Boss_${user.id}`,
          cash: 1000,
          respect: 0,
          level: 1,
          experience: 0,
          energy: 100,
          max_energy: 100,
        };
        const { data: createdPlayer, error: createError } = await supabase
          .from('players')
          .insert<PlayerInsert[]>([newPlayerInsert]) // Explicitly type the insert method
          .select()
          .single();

        if (createError) {
          console.error('Error creating new player:', createError);
          throw createError;
        }
        // Ensure createdPlayer is not null before assigning
        if (createdPlayer === null) {
            console.error('Supabase insert returned null data unexpectedly.');
            throw new Error('Failed to create player: no data returned.');
        }
        playerData = createdPlayer;
      } else if (playerFetchError) {
        // Other error during player fetch
        console.error('Error fetching existing player:', playerFetchError);
        throw playerFetchError;
      } else {
        // Player found
        playerData = existingPlayer;
      }

      if (!playerData) {
        // This case should ideally not be reached if errors are thrown, but as a safeguard
        console.error('Player data is unexpectedly null after load/create attempt.');
        setLoading(false);
        return;
      }

      setPlayer(playerData);

      // Load businesses
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('player_id', playerData.id); // playerData is now guaranteed non-null

      if (businessError) {
        console.error('Error loading businesses:', businessError);
      }
      if (businessData) setBusinesses(businessData);

      // Load missions
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('*');

      if (missionError) {
        console.error('Error loading missions:', missionError);
      }
      if (missionData) setMissions(missionData);

    } catch (error) {
      console.error('Error in loadGameData:', error);
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