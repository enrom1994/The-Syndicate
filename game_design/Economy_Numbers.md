# Economy Numbers - Detailed Balance Sheet

> Extracted from `game_definitions.sql` and migration files

---

## Starting Resources
| Resource | Starting Value |
|----------|----------------|
| Cash | $50,000 |
| Diamonds | 50 |
| Energy | 100 (1/min regen) |
| Stamina | 50 (1/4min regen) |

---

## Items (Black Market)

### Weapons
| Name | Price | Attack | Sell |
|------|-------|--------|------|
| Switchblade | $300 | +3 | $150 |
| Brass Knuckles | $500 | +5 | $250 |
| Sawed-off Shotgun | $4,000 | +10 | $2,000 |
| Tommy Gun | $10,000 | +15 | $5,000 |
| Golden Revolver | $50,000* | +25 | $25,000 |

### Equipment  
| Name | Price | Defense | Sell |
|------|-------|---------|------|
| Fedora Hat | $2,000 | +5 | $1,000 |
| Silk Suit | $5,000 | +3 (+5% income) | $2,500 |
| Armored Vest | $10,000 | +20 | $5,000 |
| Diamond Ring | $15,000* | +2/+2 (+5% income) | $7,500 |
| Gold Watch | $30,000* | +10% income | $15,000 |

*Not purchasable in market

---

## Crew

| Crew Type | Hire Cost | Upkeep/hr | ATK | DEF | Max |
|-----------|-----------|-----------|-----|-----|-----|
| Street Thug | $1,000 | $50 | +2 | +1 | 99 |
| Bodyguard | $5,000 | $150 | +1 | +5 | 25 |
| Getaway Driver | $8,000 | $200 | 0 | +3 | 15 |
| Pro Hitman | $25,000 | $500 | +10 | +2 | 5 |
| Crooked Accountant | $50,000 | $100 | 0 | 0 | 3 |
| Enforcer Captain | $75,000 | $750 | +15 | +5 | 2 |
| Personal Guard | $100,000 | $1,000 | +3 | +15 | 1 |

**Daily Upkeep Example (max crew):**
- 99 Thugs: $50 × 99 × 24 = **$118,800/day**
- 1 Personal Guard: $1,000 × 24 = **$24,000/day**

---

## Businesses

| Business | Cost | Income/hr | Cooldown | Tier |
|----------|------|-----------|----------|------|
| Protection Racket | $15,000 | $3,000 | 30min | 1 |
| Speakeasy | $25,000 | $5,000 | 60min | 2 |
| Nightclub | $50,000 | $8,000 | 90min | 2 |
| Casino | $75,000 | $15,000 | 120min | 3 |
| Loan Sharking | $80,000 | $12,000 | 180min | 3 |
| Smuggling Route | $150,000 | $25,000 | 240min | 4 |
| Black Market | $500,000 (TON) | $50,000 | 360min | 5 |

**ROI Analysis:**
| Business | Hours to ROI |
|----------|--------------|
| Protection Racket | 5 hrs |
| Speakeasy | 5 hrs |
| Nightclub | 6.25 hrs |
| Casino | 5 hrs |
| Loan Sharking | 6.67 hrs |
| Smuggling Route | 6 hrs |
| Black Market | 10 hrs |

---

## Jobs (Energy-based PvE)

| Job | Energy | Cash | XP | Cooldown | Lvl Req |
|-----|--------|------|----|---------| --------|
| Pickpocket | 2 | $150 | 2 | 5min | 1 |
| Mug Pedestrian | 3 | $300 | 4 | 10min | 1 |
| Rob Corner Store | 5 | $750 | 10 | 15min | 3 |
| Collect Protection | 10 | $5,000 | 25 | 30min | 5 |
| Hijack Delivery | 15 | $8,000 | 40 | 45min | 8 |
| Smuggle Goods | 25 | $15,000 | 60 | 60min | 10 |
| Hit Contract | 35 | $25,000 | 100 | 120min | 15 |
| Rob the Bank | 50 | $50,000 | 200 | 240min | 20 |
| Casino Heist | 75 | $100,000 | 500 | 480min | 30 |

**Cash per Energy:**
- Pickpocket: $75/energy
- Mug: $100/energy
- Rob Store: $150/energy
- Casino Heist: $1,333/energy ⭐

---

## PvE Attacks (Stamina-based)

| Target | Stamina | Cash | XP | Cooldown | Lvl |
|--------|---------|------|----|----------|-----|
| Street Punk | 3 | $500 | 10 | 15min | 1 |
| Corner Shop | 5 | $1,500 | 20 | 20min | 3 |
| Rival Dealer | 8 | $2,500 | 30 | 30min | 5 |
| Gang Hideout | 10 | $8,000 | 50 | 45min | 10 |
| Armored Truck | 15 | $25,000 | 80 | 60min | 15 |
| Police Convoy | 20 | $50,000 | 150 | 120min | 30 |

**Cash per Stamina:**
- Street Punk: $167/stamina
- Police Convoy: $2,500/stamina ⭐

---

## Daily Rewards

| Day | Reward |
|-----|--------|
| 1 | $5,000 |
| 2 | 10💎 |
| 3 | $10,000 |
| 4 | 50 Energy |
| 5 | 25💎 |
| 6 | $25,000 |
| 7 | **100💎** |

**Weekly Total:** $40,000 + 135💎

---

## Balance Observations

### ✅ Looks Good
- Business ROI is consistent (5-10 hours)
- Job rewards scale well with level requirements
- Crew costs vs bonuses seem reasonable

### ⚠️ Potential Issues

1. **Crew Upkeep vs Income**
   - 99 Street Thugs = $118,800/day upkeep
   - Protection Racket = $72,000/day (if collected every 30min)
   - **Risk:** Players with lots of crew may go broke fast

2. **High-End Jobs Too Good?**
   - Casino Heist: $100K for 75 energy
   - At 1 energy/min = 75 min wait
   - Compare: Highest business (Black Market) = $50K/6hr
   - **Jobs may outpace businesses at high level**

3. **Weapon Prices vs Value**
   - Golden Revolver: $50K for +25 attack
   - Tommy Gun: $10K for +15 attack
   - **Golden Revolver: $2K per attack vs Tommy Gun: $667/attack**

4. **Starting Balance**
   - $50K starting cash
   - Can immediately buy: Protection Racket ($15K) + crew + weapons
   - Seems balanced

---

## Recommended Adjustments

| Item | Current | Suggested | Reason |
|------|---------|-----------|--------|
| Casino Heist cash | $100,000 | $75,000 | Too profitable vs businesses |
| Street Thug upkeep | $50/hr | $25/hr | Daily cost too harsh |
| Black Market ROI | 10 hrs | 8 hrs | TON purchase should feel premium |
