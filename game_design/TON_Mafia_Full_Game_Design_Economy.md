Alright — here’s the **brutally honest, fully structured economy design** for **TON Mafia**, built to achieve:

* **Player retention** (→ repeat loops)
* **Monetization** (→ TON spend that *feels fair*)
* **Progression pacing** (→ doesn’t die after 2 days)
* **Balance** (→ whales can spend, but F2P stays competitive)
* **Clear roles** for Buildings, Jobs (PvE), Attacks (PvP), Characters, and Protection

This is the **economy blueprint** used in successful text-based mafia games, but optimized for a Telegram Mini App + TON integration.

Read carefully — this is the core foundation for everything else.

---

# ⚖️ **I. Currency Structure**

To avoid inflation + complexity, you only need **3 currencies**:

---

## **1. Cash (Soft Currency — infinite supply)**

Earned from:

* PvE jobs
* Buildings
* PvP attacks
* Daily Rewards
* Events

Used to:

* Train stats
* Upgrade buildings
* Buy ammo
* Heal character

**Cash is your loop currency → easy to earn, easy to spend.**

---

## **2. Diamonds (Premium Soft Currency)**

**Optional** currency earned slowly in-game OR via TON purchases.

Used for:

* Speed-ups
* Premium buildings
* Refilling Energy/Stamina
* Buying special PvE jobs
* Cosmetic skins
* Special crates

Diamonds exist so not every purchase requires TON.

---

## **3. TON (Hard Premium Currency)**

The only TRUE money currency.

TON purchases:

* Diamonds
* Premium buildings
* Limited characters
* Protection packs
* Automatic income boosters
* Crime success boosters
* PvP immunity (“Bodyguard pass”)
* High-tier item crates

TON must feel powerful but not predatory.

---

# 🏦 **II. Buildings Economy (Your Core Recurring Income)**

Each building generates **Cash per hour** and upgrades scale exponentially.

---

## **Building Tier Structure**

| Tier | Building           | Cost          | Income/hr | Upgrade Cost Multiplier |
| ---- | ------------------ | ------------- | --------- | ----------------------- |
| T1   | Warehouse          | very cheap    | low       | x1.3                    |
| T2   | Speakeasy          | normal        | medium    | x1.4                    |
| T3   | Casino Backroom    | high          | high      | x1.5                    |
| T4   | Black Market       | TON only      | very high | x1.7                    |
| T5   | Crime Syndicate HQ | LIMITED (TON) | extreme   | x2.0                    |

### **Why this works**

* Early progression feels fast
* Mid-game slows down (strategy needed)
* Late game incentivizes TON spend for boosters/buildings

---

## **Example Income Curve**

**Warehouse T1**

* Lvl 1 → 200 cash/hr
* Lvl 10 → 6,000 cash/hr
* Lvl 25 → 50,000 cash/hr

**Speakeasy T2**

* Lvl 1 → 3,200/hr
* Lvl 10 → 32,000/hr
* Lvl 25 → 210,000/hr

**Black Market (TON Only)**

* Lvl 1 → 50,000/hr
* Lvl 10 → 500,000/hr
* Lvl 25 → 4,000,000/hr

The point is:
→ A whale buys **Black Market**
→ A F2P buys **Warehouses**
→ Both progress, just differently
→ PvP keeps them interacting

---

# 💼 **III. PvE Jobs Economy**

PvE jobs = **the starter loop** for new players.

Jobs cost **Energy** → which regenerates over time.

---

## **Energy System**

* Max Energy: 100
* Regen: 1 per minute (100 minutes to full)

This gives **10–20 PvE actions per session** → enough for engagement but forces players to pace or buy diamonds/TON.

---

## **PvE Job Tiers**

| Tier | Job                             | Energy Cost | Cash Reward | Exp Reward | Failure Chance |
| ---- | ------------------------------- | ----------- | ----------- | ---------- | -------------- |
| T1   | Pickpocket                      | 2           | 150         | 2          | 5%             |
| T2   | Rob a Store                     | 4           | 400         | 6          | 10%            |
| T3   | Hijack Delivery                 | 8           | 1,200       | 15         | 15%            |
| T4   | Bank Heist                      | 15          | 4,000       | 50         | 20%            |
| T5   | Elite Jobs (TON/Diamond access) | 10          | 5× reward   | 3× XP      | 5–10%          |

---

## **Why PvE Matters**

This is your **daily loop**.
This is your **new-player hook**.
This is your **first monetization vector**.

Success rate varying creates tension and addiction (same psychology as Mafia Boss, Torn City, EVE Online).

---

# 🔫 **IV. PvP (Attacks & Rivals) Economy**

PvP is **Stamina-driven** (NOT Energy).
Regenerates slower = encourages purchases.

---

## **Stamina System**

* Max Stamina: 50
* Regen: 1 every 4 minutes → 200 minutes to refill

Players get **~12 attacks every 2–3 hours** without spending.

---

## **Attack Mechanics**

Attacking another player yields:

* Cash (small %)
* Respect (PvP ranking)
* Chance to steal items
* Chance to injure the opponent

---

## **PvP Loot Formula**

**Cash stolen = 5% of victim’s un-bankrolled cash**

* Max steal cap = your character strength × 100
* Encourages players to BANK cash (sink mechanic)

**Respect earned = difference in level bracket**

* +10 for equal level
* +15 for higher level
* +5 for lower level
* +25 for streaks

---

# 🛡️ **V. New Player Protection**

This is essential for retention.

---

## **Newbie Shield**

* Automatically protects players under Level 10
* Cannot be attacked
* Can attack other newbies
* Shield breaks if they attack a non-newbie
* Shield lasts a maximum of 48 hours

---

## **Paid Protection (TON)**

Used by:

* Whales
* Players storing cash
* Players farming building upgrades

### **Protection Types**

| Pack     | Duration | Effects                         | Price   |
| -------- | -------- | ------------------------------- | ------- |
| Basic    | 1 hour   | immune from PvP                 | 0.1 TON |
| Standard | 6 hours  | immune + stealth mode           | 0.4 TON |
| Premium  | 24 hours | immune + stealth + attack boost | 1 TON   |

---

# 🧬 **VI. Character Stats (Progression System)**

Stats = where a LOT of currency gets drained.

---

## **Stats**

1. **Strength** → PvP damage
2. **Defense** → reduces PvP damage
3. **Agility** → increases attack chance + reduces failure in PvE
4. **Intelligence** → increases building income (small %)

---

## **Stat Training Formula**

Training costs scale exponentially to avoid whales dominating instantly.

Example:

```
Strength Level 1 → 200 cash
Strength Level 50 → 50,000 cash
Strength Level 200 → 2,000,000 cash
```

This creates a **healthy cash sink**.

---

# 💰 **VII. TON Pricing Model (This Is Where You Make Money)**

You must price TON conversions based on actual user habits.

---

## **Starter TON Packs**

| Pack Name | TON    | Diamonds Awarded |
| --------- | ------ | ---------------- |
| Small     | 1 TON  | 120 diamonds     |
| Standard  | 3 TON  | 420 diamonds     |
| Whale     | 10 TON | 1,600 diamonds   |
| Godfather | 30 TON | 5,000 diamonds   |

---

## **What can users buy with TON?**

**Top sellers in mafia games ALWAYS are:**

### 1. **Protection Packs**

(we already covered these)

### 2. **Energy / Stamina Refills**

* 0.1 TON per refill
* Yes → players BUY MORE ATTACKS

### 3. **Building Boosters**

* 2× income for 24h → 0.5 TON
* 3× income for 24h → 1 TON

### 4. **Premium Buildings**

TON-only, high income.

### 5. **Limited Characters**

Scarcity = huge sales.

Example:

* "Don Angelo — 200 mints only — +10% building income & +5% strength"
* Price: 5 TON

---

# 🔄 **VIII. Core Economy Loop**

### **1. Do Jobs (PvE) → Earn Cash → Train Stats**

Simple, engaging progression.

### **2. Attack rivals (PvP) → Earn Respect → Steal Cash**

Conflict drives engagement.

### **3. Build/Upgrade Buildings → Passive Income**

Long-term progression.

### **4. TON Purchases Enhance Key Loops**

But never replace skill or strategy.

---

