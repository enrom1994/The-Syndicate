# Game Assets & Economy Map

This document catalogs all implemented game assets, including businesses, crew members, items, production recipes, and operational activities.

## 🏢 Businesses
Businesses provide passive income and unlock production recipes.

| Business | Tier | Cost | Income/Hr | Cooldown | Description |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Protection Racket** | 1 | $15,000 | $3,000 | 30m | Collect protection money from local businesses |
| **Speakeasy** | 2 | $25,000 | $5,000 | 60m | Underground bar serving bootleg liquor |
| **Nightclub** | 2 | $50,000 | $8,000 | 90m | Jazz club and front for money laundering |
| **Casino** | 3 | $75,000 | $15,000 | 120m | Illegal gambling den for high rollers |
| **Loan Sharking** | 3 | $80,000 | $12,000 | 180m | High-interest loans to desperate borrowers |
| **Smuggling Route** | 4 | $150,000 | $25,000 | 240m | Import contraband from overseas |
| **Black Market** | 5 | $500,000 | $50,000 | 360m | Exclusive underground trading network |

> **Note:** Businesses can be upgraded (Max Level 10). Upgrade Cost = Base Cost * (Multiplier ^ Level).

---

## 🏭 Production Recipes
Production allows businesses to convert Crew time into Contraband or Consumables.

| Business | Required Crew | Output Item | Quantity | Time | Profit/Loss Note |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Protection Racket** | 5x Street Thug | Bootleg Whiskey (Consumable) | 10 | 12h | PvP Requirement |
| **Speakeasy** | 7x Bodyguard | Whiskey Crate | 25 | 24h | Base Contraband |
| **Nightclub** | 10x Street Thug | Cuban Cigars | 30 | 24h | Base Contraband |
| **Nightclub** | 6x Bodyguard | Cocaine Stash (Consumable) | 8 | 12h | PvP Requirement |
| **Casino** | 2x Hitman | Cuban Cigars | 50 | 12h | Premium Production |
| **Casino** | 3x Hitman | Stolen Jewelry | 5 | 18h | High Value |
| **Loan Sharking** | 3x Accountant | Counterfeit Bills | 15 | 16h | - |
| **Smuggling Route** | 5x Driver | Whiskey Crate | 40 | 18h | Efficient Production |
| **Smuggling Route** | 4x Driver | Forged Documents | 12 | 14h | New Contraband |
| **Black Market** | 2x Hitman | Morphine Vials | 3 | 24h | Highest Value |
| **Black Market** | 1x Enforcer Captain | Smuggled Weapons | 4 | 20h | New Contraband |

---

## ⚔️ Operations & Combat

### 🔫 PvP Attacks
Player-vs-Player combat using **Stamina**. Winners steal assets; losers suffer penalties.

| Attack Type | Stamina | Requirements | Steal Potential | Risks |
| :--- | :---: | :--- | :--- | :--- |
| **Mugging** | 5 | None | **20% Cash** | Low Risk |
| **Business Raid** | 10 | Crew Required | **30% Cash**, Contraband | Medium Risk |
| **Safe Heist** | 15 | Crew + **1x Bootleg Whiskey** | **15% Vault**, Contraband | High Risk |
| **Drive-By** | 12 | **2x Cocaine Stash** | **Respect**, Kills Crew | High Respect Loss |

> **Combat Mechanics:** Win chance based on Attack vs Defense stats (Player + Crew + Items). Max theft cap is 45% total value. Consumables are consumed on use.

### 👊 PvE Targets (Heists)
NPC combat encounters using **Stamina**.

| Target | Difficulty | Req Level | Stamina | Rewards (Cash / XP) | Cooldown |
| :--- | :---: | :---: | :---: | :--- | :---: |
| **Street Punk** | Easy | 1 | 3 | $500 / 10 XP | 15m |
| **Corner Shop** | Easy | 3 | 5 | $1,500 / 20 XP | 20m |
| **Rival Dealer** | Medium | 5 | 8 | $2,500 / 30 XP | 30m |
| **Gang Hideout** | Medium | 10 | 10 | $8,000 / 50 XP | 45m |
| **Armored Truck** | Hard | 15 | 15 | $25,000 / 80 XP | 60m |
| **Police Convoy** | Expert | 30 | 20 | $50,000 / 150 XP | 120m |

### 💼 Jobs
Safe operations using **Energy**. Good for grinding XP and Cash.

| Job | Tier | Energy | Rewards (Cash / XP) | Cooldown |
| :--- | :---: | :---: | :--- | :---: |
| **Pickpocket** | 1 | 2 | $150 / 2 XP | 5m |
| **Mug Pedestrian** | 1 | 3 | $300 / 4 XP | 10m |
| **Rob Corner Store** | 2 | 5 | $750 / 10 XP | 15m |
| **Collect Protection** | 2 | 10 | $5,000 / 25 XP | 30m |
| **Hijack Delivery** | 3 | 15 | $8,000 / 40 XP | 45m |
| **Smuggle Goods** | 3 | 25 | $15,000 / 60 XP | 60m |
| **Hit Contract** | 4 | 35 | $25,000 / 100 XP | 120m |
| **Rob Bank** | 4 | 50 | $50,000 / 200 XP | 240m |
| **Casino Heist** | 5 | 75 | $100,000 / 500 XP | 480m |

---

## 👥 Crew Members
Mercenaries hired to boost stats and enable production.

| Crew Type | Role | Cost | Upkeep/Hr | Stats | Special |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Street Thug** | Enforcer | $1,000 | $50 | +2 Atk / +1 Def | - |
| **Bodyguard** | Bodyguard | $5,000 | $150 | +1 Atk / +5 Def | - |
| **Getaway Driver** | Driver | $8,000 | $200 | +0 Atk / +3 Def | +10% Escape |
| **Professional Hitman** | Hitman | $25,000 | $500 | +10 Atk / +2 Def | - |
| **Crooked Accountant** | Accountant | $50,000 | $100 | +0 Atk / +0 Def | -5% Upkeep |
| **Enforcer Captain** | Enforcer | $75,000 | $750 | +15 Atk / +5 Def | +10% Crew Atk |
| **Personal Guard** | Bodyguard | $100,000 | $1,000 | +3 Atk / +15 Def | +25% Defense |

---

## 📦 Items

### Weapons (Attack Bonus)
| Item | Rarity | Atk | Cost (Sell) | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Switchblade** | Common | +3 | $300 ($150) | - |
| **Brass Knuckles** | Common | +5 | $500 ($250) | - |
| **Sawed-off Shotgun** | Uncommon | +10 | $4,000 ($2,000) | - |
| **Tommy Gun** | Rare | +15 | $10,000 ($5,000) | - |
| **Golden Revolver** | Legendary | +25 | - ($25,000) | Not purchasable |

### Equipment (Defense/Utility Bonus)
| Item | Rarity | Def | Cost (Sell) | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Silk Suit** | Uncommon | +3 | $5,000 ($2,500) | +5% Income |
| **Fedora Hat** | Uncommon | +5 | $2,000 ($1,000) | - |
| **Armored Vest** | Rare | +20 | $10,000 ($5,000) | - |
| **Diamond Ring** | Rare | +2 | - ($7,500) | +2 Atk also |
| **Gold Watch** | Legendary | +0 | - ($15,000) | +10% Income |

### Contraband (Trade Goods)
Items produced by businesses or stolen, primarily for selling or auctioning.

| Item | Rarity | Sell Price | Source |
| :--- | :---: | :---: | :--- |
| **Whiskey Crate** | Common | $1,000 | Speakeasy, Smuggling Route |
| **Cuban Cigars** | Uncommon | $800 | Nightclub, Casino |
| **Forged Documents** | Uncommon | $3,000 | Smuggling Route |
| **Counterfeit Bills** | Uncommon | $5,000 | Loan Sharking |
| **Smuggled Weapons** | Rare | $6,000 | Black Market |
| **Morphine Vials** | Rare | $12,000 | Black Market |
| **Stolen Jewelry** | Rare | $8,000 | Casino |

### Consumables (PvP Requirements)
Items required to perform specific high-level attacks.

| Item | Rarity | Use Case | Source |
| :--- | :---: | :--- | :--- |
| **Bootleg Whiskey** | Common | Required for **Safe Heist** (1x) | Protection Racket |
| **Cocaine Stash** | Uncommon | Required for **Drive-By** (2x) | Nightclub |

---

## 🏆 Rewards

### Daily Login (7 Day Cycle)
1. **$5,000 Cash**
2. **10 Diamonds**
3. **$10,000 Cash**
4. **50 Energy**
5. **25 Diamonds**
6. **$25,000 Cash**
7. **100 Diamonds**

### Achievement Categories
*   **Combat:** Win 1/10/50 attacks, Defend 5/25 attacks. (Rewards: Cash & Diamonds)
*   **Business:** Own 1/3/5 businesses, Upgrade to Lvl 10. (Rewards: Cash & Diamonds)
*   **Social:** Join family, Contribute $100k, Become Boss. (Rewards: Cash & Diamonds)
*   **Wealth:** Earn $100k - $10M Total. (Rewards: Cash & Diamonds)
*   **Milestone:** Reach Level 5/10/25/50. (Rewards: Cash & Diamonds)
