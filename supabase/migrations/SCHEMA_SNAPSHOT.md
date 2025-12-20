# TON Mafia - Database Schema Snapshot

**Generated**: 2025-12-20  
**Source**: Consolidated from migrations 001-154

---

## Core Tables

### Players
```sql
players (
  id UUID PRIMARY KEY,
  username TEXT,
  cash BIGINT DEFAULT 10000,
  diamonds INT DEFAULT 0,
  banked_cash BIGINT DEFAULT 0,
  respect INT DEFAULT 0,
  energy INT DEFAULT 100,
  max_energy INT DEFAULT 100,
  stamina INT DEFAULT 100,
  max_stamina INT DEFAULT 100,
  attack INT DEFAULT 10,
  defense INT DEFAULT 10,
  level INT DEFAULT 1,
  experience INT DEFAULT 0,  -- DEPRECATED (see 109_xp_removal)
  total_crew INT DEFAULT 0,
  total_kills INT DEFAULT 0, -- HISTORICAL metric only
  is_made_man BOOLEAN DEFAULT false,
  family_id UUID REFERENCES families(id),
  telegram_id BIGINT UNIQUE,
  wallet_address TEXT,
  referred_by UUID,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
)
```

### Families
```sql
families (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,
  tag TEXT,
  boss_id UUID REFERENCES players(id),
  treasury_cash BIGINT DEFAULT 0,
  treasury_diamonds INT DEFAULT 0,
  total_respect INT DEFAULT 0,
  member_count INT DEFAULT 0,
  max_members INT DEFAULT 10,
  created_at TIMESTAMPTZ
)

family_members (
  id UUID PRIMARY KEY,
  family_id UUID REFERENCES families(id),
  player_id UUID REFERENCES players(id),
  role TEXT, -- 'boss', 'underboss', 'captain', 'soldier'
  joined_at TIMESTAMPTZ
)
```

### Items & Inventory
```sql
item_definitions (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  icon TEXT,
  category TEXT, -- 'weapon', 'equipment', 'contraband'
  rarity TEXT,   -- 'common', 'uncommon', 'rare', 'legendary'
  attack_bonus INT,
  defense_bonus INT,
  income_bonus INT DEFAULT 0, -- Set to 0 (see 145_item_market_fixes)
  respect_bonus INT DEFAULT 0, -- FUTURE USE
  buy_price INT,
  sell_price INT,
  is_purchasable BOOLEAN
)

player_inventory (
  id UUID PRIMARY KEY,
  player_id UUID,
  item_id UUID,
  quantity INT,
  assigned_quantity INT DEFAULT 0, -- Armed to crew
  location TEXT DEFAULT 'inventory', -- 'inventory', 'safe'
  safe_until TIMESTAMPTZ
)
```

### Businesses
```sql
business_definitions (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  base_income INT,
  base_price INT,
  max_level INT,
  image_url TEXT
)

player_businesses (
  id UUID PRIMARY KEY,
  player_id UUID,
  business_id UUID,
  level INT DEFAULT 1,
  income_per_hour INT,
  last_collected TIMESTAMPTZ,
  upgrade_cost INT
)
```

### Combat & PvP
```sql
attack_log (
  id UUID PRIMARY KEY,
  attacker_id UUID,
  defender_id UUID,
  attack_type TEXT,
  success BOOLEAN,
  cash_stolen BIGINT,
  respect_gained INT,
  respect_lost INT,
  crew_injured INT,
  created_at TIMESTAMPTZ
)

pvp_attack_types (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  stamina_cost INT,
  fee_diamonds INT,
  requires_crew BOOLEAN,
  steals_cash BOOLEAN,
  steals_respect BOOLEAN,
  kills_crew BOOLEAN,
  cash_steal_percent INT,
  success_chance_base INT
)

injured_crew (
  id UUID PRIMARY KEY,
  player_id UUID,
  crew_id UUID,
  quantity INT,
  injured_at TIMESTAMPTZ,
  heals_at TIMESTAMPTZ
)
```

### Boosters
```sql
booster_definitions (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  duration_hours INT,
  price_diamonds INT,
  effect_type TEXT,
  effect_value NUMERIC
)

player_boosters (
  id UUID PRIMARY KEY,
  player_id UUID,
  booster_type TEXT,
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
)
```

---

## Key RPCs

### Authentication
- `telegram_auth` (Edge Function)

### Economy
- `spend_cash`, `add_cash`
- `spend_diamonds`, `add_diamonds`
- `bank_deposit`, `bank_withdraw`
- `collect_business_income`
- `apply_pending_upkeep` (lazy upkeep)

### Combat
- `perform_pvp_attack` (with cooldowns)
- `attack_pve`
- `get_pvp_targets`
- `get_revenge_targets`

### Jobs
- `complete_job`
- `execute_high_stakes_job`
- `get_job_chain_status`

### Family
- `create_family`
- `join_family`, `leave_family`
- `promote_member`, `demote_member`
- `contribute_cash`, `contribute_contraband`

### Items
- `buy_item`, `sell_item`
- `assign_equipment`
- `move_to_safe`, `retrieve_from_safe`

### Misc
- `spin_lucky_wheel`
- `claim_daily_reward`
- `activate_booster`
- `apply_referral_code`

---

## Notes

- **XP System**: Deprecated in 109. Level still exists but Experience is no longer tracked.
- **income_bonus**: Set to 0 for all items (145). Was too powerful.
- **respect_bonus**: Reserved for future use.
- **Auth**: Uses custom JWT via Edge Function (not Supabase native auth).

---

*For the authoritative schema, always check Supabase Dashboard → Database → Tables*
