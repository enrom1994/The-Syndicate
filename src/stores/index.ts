/**
 * Store barrel exports
 * 
 * Domain stores for game state management.
 * useGameStore.ts will be updated to compose these stores for backwards compatibility.
 */

// Types
export * from './types';

// Domain Stores
export { usePlayerStore, getPlayerId, getPlayerStats } from './usePlayerStore';
export { useBusinessStore } from './useBusinessStore';
export { useCombatStore } from './useCombatStore';
export type { JobResult, AttackResult, JobChainStatus, HighStakesResult } from './useCombatStore';

// Future stores (to be implemented):
// export { useInventoryStore } from './useInventoryStore';
// export { useCrewStore } from './useCrewStore';

