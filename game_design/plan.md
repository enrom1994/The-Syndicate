Nice — I read all three docs you uploaded (Economy_Analysis.md, Economy_Numbers.md, Game_Mechanics_Reference.md) and I’ll give you a focused, actionable analysis: what’s solid, what’s broken or risky, exact balance changes I recommend (numbers and formulas), integration fixes, monetization tuning for TON, and a prioritized run-book of changes (what to fix first, what to iterate later). I’ll cite the files I used so you can map every recommendation back to source.

Sources used: Economy_Analysis.md.  Economy_Numbers.md.  Game_Mechanics_Reference.md. 

---

# TL;DR — the short read

What’s good: core systems exist (jobs, businesses, PvP types, boosters, families), starting resources look sensible, businesses ROI is generally consistent.  

Big problems that will kill retention / revenue if not fixed now:

1. Several boosters (2x_attack, shield, vip_pass) are **not integrated** into gameplay — players may pay for nonfunctional items. High priority.  
2. Crew upkeep at scale is massively higher than incomes for realistic players (99 thugs upkeep >> typical business income). This will bankrupt players or force pay-to-survive. 
3. Some PvE jobs (Casino Heist) and PvP loot look **overly profitable** compared to passive business income — this breaks intended gameplay balance (jobs should supplement, not outpace businesses). 
4. TON pricing needs sanity-check vs USD and perceived value — some offered TON sinks feel underpriced or poorly matched to player value. 

I’ll fix each with concrete numbers and code-level guidance below.

---

# 1 — Immediate critical fixes (HIGH priority)

These must be addressed before running a live sale / TON promotion.

### A. Integrate boosters into RPCs (2x_attack, shield, vip_pass)

Problem: boosters exist in DB but are not applied in RPCs (business collection / PvP). Players can purchase but receive no effect.  

Action (implement server-side):

* On purchase: write `player_boosters` record with `booster_type`, `activated_at`, `expires_at`.
* In `perform_pvp_attack(attacker_id, defender_id, attack_type)`:

  * Fetch active boosters for attacker/defender: `SELECT * FROM player_boosters WHERE player_id IN (...) AND expires_at > now()`
  * Apply modifiers:

    * `2x_attack` → multiply `attacker_base_attack` by 2 for win-chance & damage calc.
    * `shield` → set `defender_invulnerable = true` for shield duration (reject attack with proper UX message).
    * `vip_pass` → e.g., bypass matchmaking limits / decrease cooldowns / +10% respect gain (define exact effect).
* In `collect_business_income(player_id)`:

  * If `2x_income` active → multiply income by 2.

Pseudo (Postgres pl/pgSQL style):

```sql
-- check boosters example (simplified)
SELECT booster_type FROM player_boosters
 WHERE player_id = $1 AND expires_at > now();
```

Then apply in the relevant RPC. (Make sure all RPCs re-check boosters to avoid race conditions.)

**Why:** Selling nonfunctional boosts destroys trust and refund risk.

Sources: integration gaps described.  

---

### B. Reduce mass crew upkeep (balance / sanity)

Problem: 99 Thugs upkeep = $118,800/day which outstrips many players' incomes; unrealistic and will force players to abandon or buy TON just to survive. 

Recommendation (numbers):

* Change Street Thug upkeep from **$50/hr → $12/hr** (or at minimum $25/hr as interim). I recommend $12/hr if you want crew to be a *manageable* midgame cost; $25/hr is safer for a faster sink.

  * Example daily: 99 thugs @ $12/hr = $28,488/day (still meaningful, but survivable).
* For other crew, scale down proportionally:

  * Bodyguard: $150/hr → $60/hr
  * Getaway Driver: $200/hr → $80/hr
  * Pro Hitman: $500/hr → $200/hr
  * Enforcer Captain: $750/hr → $300/hr
  * Personal Guard: $1,000/hr → $400/hr

Rationale: crew should be a strategic cost, not an instant bankruptcy. Lowering upkeep also reduces pressure to hunt whales or grind unrealistic amounts of PvE.

Source: crew costs listed. 

---

### C. Nerf highest-yield PvE jobs to match passive ROI

Problem: Casino Heist ($100k for 75 energy → $1,333/energy) massively outpaces high-end business income, making PvE the dominant grind. 

Recommendation:

* Lower Casino Heist reward to **$75,000** (as already suggested in Economy_Numbers.md). That yields $1,000/energy (still good, but not grossly dominant). 
* Lower Rob the Bank ($50k) to $40k or increase cooldown/required level to restrict casual farming.
* Alternatively, increase energy cost or add item/crew requirements as gating (e.g., Casino Heist requires at least 1 Driver + 1 Hitman on your roster).

Why: keeps businesses relevant as a long-term passive play style and prevents PvE exploits.

---

# 2 — Mid-priority balancing & economy changes (MEDIUM priority)

### A. Re-tune building income vs upgrade costs

Current business ROI times are okay but a few adjustments will improve perceived TON value: 

Suggested changes:

* Slightly reduce Street-tier business upgrade cost multipliers (e.g., multiplier 1.3 → 1.4 for mid tiers), but keep TON-only buildings (Black Market) premium:

  * Keep Black Market buy price as TON but reduce ROI hours from 10 → 8 to feel premium but valuable (suggested in Economy_Numbers.md). 
* Confirm `Upgrade Cost = base * multiplier^level` and log sample numbers to avoid exponential cliffing; you already use multiplier 1.5 default in mechanics doc. Keep that but cap at level 20 before multiplier increases further.

### B. Golden Revolver / Weapon price normalization

Problem: Golden Revolver is overpriced relative to attack-per-dollar. 

Options:

1. Lower Gold Revolver price to $30,000 if it’s intended as a late-game purchasable (improves price/attack parity).
2. Or keep $50,000 but add unique passive (e.g., +10% respect gain, small income bonus) to justify price.

I prefer #2 to create item differentiation beyond raw stat.

### C. Add sell-back for weapons/equipment

Economy_Analysis recommends allowing sell-back; implement a 50% sell-back rule (already some items in numbers chart have sell values, but earlier doc said players can't sell weapons). Add API: `sell_item(player_id, item_id)` which credits `sell_price = floor(item.base_price * 0.5)` cash and removes item. This is a low-effort quality-of-life and reduces frustration. 

---

# 3 — TON pricing and monetization tuning (HIGH→MED)

You noted retail TON pack offers and protection prices. We must align to perceived USD value. Economy_Analysis flagged concerns. 

Assume price peg: **1 TON ≈ $5.5 USD** (pick current market price; verify live before final push).

### Re-evaluate protection pricing:

Current: Basic 0.1 TON (≈ $0.55) for 1h; Premium 1 TON ($5.50) for 24h. That makes 24h cost cheap. 

Suggested new protection tiers:

* **Basic (1h): 0.05 TON** — cheap, impulse buy (~$0.28)
* **Standard (6h): 0.35 TON** — (~$1.93)
* **Premium (24h): 1.5 TON** — (~$8.25)

Rationale: make 24h meaningful and not trivially cheap. Price must balance whales vs casual players.

### TON → Diamonds conversion packs (keep “value” progression)

The existing packs are okay, but present a better “bonus curve”:

Keep:

* 1 TON → 120 💎
* 3 TON → 420 💎 (+60 bonus)
* 10 TON → 1600 💎 (+400)
* 30 TON → 5,000 💎 (+1500)

These rates were in Economy_Analysis and are fine; maintain promotions occasionally to drive lift. 

### Major TON sinks to emphasize

* **Auto-Collector (permanent):** 5 TON — keep, but add scarcity (only one per account) to justify price. 
* **Limited Skins / Mythic Drops:** 3–8 TON each (auction or limited mint). These sell if scarcity + social flex exist. 
* **Family (Cell) creation fee:** make it a TON fee (e.g., 0.5–1 TON) so Cells are meaningful. Currently Families cost diamonds—switch to TON + diamonds hybrid to make ownership premium. 

---

# 4 — Diamond economy & sinks (MEDIUM priority)

Economy_Analysis shows insufficient diamond sinks, leading to accumulation. 

Additions:

* **Sell Listing Fee** already exists (10💎) — keep. Expand: list items beyond contraband if you want further sinks. 
* **Crafted cosmetics**: cosmetic recolors cost diamonds (small amounts, e.g., 25–100💎).
* **Daily VIP missions** that require diamonds to enter but pay out a premium cash reward — creates cyclical spending.
* **Conversion mechanic**: let players convert diamonds → small amount of cash at a poor rate (prevents hoarding but doesn’t create arbitrage).

---

# 5 — Gameplay & anti-abuse fixes (MEDIUM priority)

### A. Newbie shield / protection logic

Newbie shield: 48 hours auto-protection from Game Mechanics Reference. Keep that, ensure purchasing protection cannot override or be stacked to extend newbie invisibly. Add telemetry to detect shield abuse (create and sell accounts, etc.). 

### B. Crew death and recovery

Crew PERMANENT death is harsh. Keep it (adds stakes) but ensure **clear UI warning** and recovery mechanics:

* Add “Mercenary Hire” (early cheap temp crew) to let players replace lost manpower.
* Allow a TON-based “Rescue” option to recover 50% of a dead crew member’s value — monetizes grief.

### C. Vault / Safe Heist caps & cap enforcement

Game mechanics already cap theft. Verify server-side enforcement for:

* Max theft % per attack type
* Vault fractional cap (15% stealable) 

---

# 6 — Analytics & monitoring (must-have)

Before/after every change, track these KPIs (instrumented via your backend):

* D1 / D7 retention
* % paying users
* Average revenue per paying user (ARPPU)
* TON purchase conversion rate per offer
* Booster purchase → usage discrepancy (any booster bought but never applied)
* Average daily cash inflows vs outflows per cohort
* Number of accounts hitting negative balances / forced to buy TON to survive

Economy_Analysis flagged boosters unpaid/unused — add automated alerts if purchases exist with no effect. 

---

# 7 — Quick numeric summary of recommended value changes

(Referenced items and numbers below come from Economy_Numbers and Economy_Analysis.)  

* Casino Heist → **$75,000** (was $100k)
* Street Thug upkeep/hr → **$12/hr** (was $50/hr) — OR interim **$25/hr** if you want softer change.
* Black Market ROI target → change Hours to ROI **8 hrs** (was 10 hrs) to improve TON perceived value. 
* Protection pricing (24h) → **1.5 TON** (was 1 TON)
* Auto-Collector → **5 TON** (keep but single purchase per account) 
* Golden Revolver → either reduce price to **$30k** OR add unique non-stats passive; recommend adding passive bonus instead. 
* Booster Diamond prices: ensure `shield` = 100💎 (as in Economy_Analysis), but implement immediately. 

---

# 8 — Prioritized actionable roadmap (developer checklist — no timelines)

### P0 (Must do before next live push)

1. Integrate boosters into all relevant RPCs (PvP, business collect) — fix "purchasable but non-functional" issue. 
2. Implement sell-back for equipment (50% price), and/or remove sell restrictions. 
3. Reduce crew upkeep parameters in DB; rerun quick economic simulation. 

### P1 (High priority)

4. Nerf Casino Heist and other superprofitable jobs or add gating. 
5. Adjust protection TON pricing tiers to recommended values. 
6. Add telemetry to detect booster purchase-but-not-applied events. 

### P2 (Medium)

7. Add cosmetic diamond sinks (crafting, recolors) & family creation TON fee.  
8. Revisit weapon pricing or add passives to justify expensive weapons. 

### P3 (Low / Nice to have)

9. Implement paid mercenary rescue mechanic (TON).
10. Add Auction House expansion and contraband valuation monitoring. 

---

# 9 — Suggested unit tests & simulations (technical)

* Simulate 1,000 players for 30 days with current parameters to collect:

  * median daily cash flow
  * % hitting zero cash
  * average time to max crew
* Test booster flows: buy `2x_attack` → verify `perform_pvp_attack` uses multiplier for at least 100 simulated attacks.
* Test sell flow: create item → list sell → verify 50% credit and removal.
* Check all `max steal` caps are enforced in RPCs.

---

# 10 — UX / Messaging recommendations

* If you change boost or protection prices, show an in-game "value justification" tooltip (e.g., “Premium Protection: prevents all PvP for 24h — protects your pocket cash and crew.”). People will convert better if they clearly know what they're protecting. 
* When crew upkeep is reduced, present it as a patch note and give players 1 free retroactive refund or grace period to smooth churn.

---
