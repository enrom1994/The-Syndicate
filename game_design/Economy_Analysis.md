# Economy & Shop Analysis

## Currency Overview

| Currency | Earned From | Spent On | At Risk |
|----------|-------------|----------|---------|
| **Cash** | Jobs, Businesses, PvP | Items, Crew, Businesses, Upgrades, Family | Yes (PvP) |
| **Diamonds** | TON purchase, Wheel, Tasks | Boosters, Family creation (100💎) | No |
| **TON** | External wallet | Diamonds, Protection, Auto-Collector, Safe slots | External |

---

## Shop Page (TON/Diamonds)

### Diamond Packages
| Package | TON | Diamonds | Bonus | Rate |
|---------|-----|----------|-------|------|
| Small | 1 | 120 | - | 120/TON |
| Standard | 3 | 420 | +60 | 140/TON |
| **Value** | 10 | 1,600 | +400 | 160/TON ⭐ |
| Godfather | 30 | 5,000 | +1,500 | 167/TON |

### Boosters (Diamonds)
| Booster | Cost | Duration | Status |
|---------|------|----------|--------|
| 2x Income | 50💎 | 24h | ✅ Integrated |
| 2x Attack | 30💎 | 12h | ❌ Not integrated |
| Shield | 100💎 | 6h | ❌ Not integrated |
| VIP Pass | 200💎 | 24h | ❌ Not integrated |

### Protection (TON)
| Pack | TON | Duration |
|------|-----|----------|
| Basic | 0.1 | 1h |
| Standard | 0.4 | 6h |
| Premium | 1.0 | 24h |

### Upgrades (TON)
- **Auto-Collector:** 5 TON (permanent)

---

## Black Market (Cash)

- **Weapons:** Attack bonuses, cash purchase
- **Equipment:** Defense bonuses, cash purchase
- **Contraband:** Not sold here (only via Auction House)

---

## Auction House (P2P)

### How It Works
- **Listing Fee:** 10💎 per listing
- **Currency:** Seller chooses Cash or Diamonds
- **Duration:** 24h default, customizable
- **Contraband Only:** Only contraband items can be auctioned

### Mechanics
| Action | Description |
|--------|-------------|
| **List Item** | Pay 10💎, item removed from inventory |
| **Place Bid** | Funds escrowed, previous bidder refunded |
| **Buy Now** | Instant purchase at fixed price |
| **Cancel** | Only if no bids, item returned |
| **Expired** | Winner pays, no bids = item returned |

### Economy Impact
- Creates player-to-player Cash/Diamond flow
- Diamond sink (10💎 per listing)
- Contraband value determined by market

---

## Identified Issues

### 1. Boosters Not Integrated
`2x_attack`, `shield`, and `vip_pass` boosters are purchasable but **NOT active in RPCs**.
- **Impact:** Players pay diamonds for non-functional buffs
- **Fix:** Need to integrate into `perform_pvp_attack` RPC

### 2. No Diamond Sink (Long-term)
After buying boosters, accumulated diamonds have limited use.
- **Ideas:** Diamond→Cash conversion, exclusive items, cosmetics

### 3. Cash Economy Imbalance?
Need to verify:
- Job rewards vs business income vs item costs
- Is crew upkeep balanced against income?
- Are weapons/equipment worth their price?

### 4. TON Pricing
Current 1 TON ≈ $5-6 USD. Sanity check needed on:
- 0.1 TON for 1 hour protection (too cheap?)
- 5 TON for permanent auto-collect (fair value?)

### 5. Cannot Sell Weapons/Equipment
Players can sell **contraband** via Auction House, but **cannot sell weapons/equipment back**.
- This limits options for players who over-bought or want different gear

---

## Recommendations

| Priority | Item | Effort |
|----------|------|--------|
| 🔴 High | Integrate remaining boosters into PvP | Medium |
| 🟡 Med | Add item sell functionality | Low |
| 🟡 Med | Review cash earning rates vs costs | Analysis |
| 🟢 Low | Add cosmetics/titles (diamond sink) | Medium |
