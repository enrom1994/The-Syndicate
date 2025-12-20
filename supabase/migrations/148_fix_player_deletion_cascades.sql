-- =====================================================
-- FIX PLAYER DELETION CASCADES
-- =====================================================
-- Add missing ON DELETE behaviors to allow player deletion
-- without violating foreign key constraints.
-- =====================================================

-- 1. AUCTION LISTINGS
-- Clear bidder info if the bidder is deleted
ALTER TABLE public.auction_listings 
DROP CONSTRAINT IF EXISTS auction_listings_current_bidder_id_fkey,
ADD CONSTRAINT auction_listings_current_bidder_id_fkey 
    FOREIGN KEY (current_bidder_id) 
    REFERENCES public.players(id) 
    ON DELETE SET NULL;

-- 2. FAMILIES
-- Clear boss_id if the boss is deleted (families will need leadership reassignment)
ALTER TABLE public.families
DROP CONSTRAINT IF EXISTS families_boss_id_fkey,
ADD CONSTRAINT families_boss_id_fkey 
    FOREIGN KEY (boss_id) 
    REFERENCES public.players(id) 
    ON DELETE SET NULL;

-- 3. PLAYER REFERRALS
-- Clear referred_by if the referrer is deleted
ALTER TABLE public.players
DROP CONSTRAINT IF EXISTS players_referred_by_fkey,
ADD CONSTRAINT players_referred_by_fkey 
    FOREIGN KEY (referred_by) 
    REFERENCES public.players(id) 
    ON DELETE SET NULL;

-- 4. BOUNTIES
-- Clear claimed_by_player_id if the bounty hunter is deleted
ALTER TABLE public.bounties
DROP CONSTRAINT IF EXISTS bounties_claimed_by_player_id_fkey,
ADD CONSTRAINT bounties_claimed_by_player_id_fkey 
    FOREIGN KEY (claimed_by_player_id) 
    REFERENCES public.players(id) 
    ON DELETE SET NULL;
