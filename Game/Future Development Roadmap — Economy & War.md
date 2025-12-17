Future Development Roadmap — Economy & War

Feature: War-Time Contraband Demand Spikes
Status: Planned
Priority: High (War Economy)

Description:
During active war phases, Black Market buyers pay increased rates for contraband items, reflecting heightened underground demand. This provides instant economic rewards for PvP, raids, and heists, allowing wars to partially fund themselves and reducing friction around upkeep and protection costs.

Design Goals:

Increase cash velocity during wars

Reward active PvP participation

Support defense, insurance, and protection spending

Avoid inflation or market abuse

Initial Implementation (Phase 1):

Apply temporary sell-price multipliers during war state:

Common contraband: 70% → 80%

Uncommon contraband: 75% → 85%

Rare contraband: 80% → 90%

System-controlled pricing (no player auctions)

Reverts automatically when war ends

Success Metrics:

Increased contraband sales during war

Higher protection/shield repurchase rates

Stable average player cash (no inflation spike)

Increased engagement during war windows

6️⃣ Strategic Framing (Do This When You Announce It)

When this eventually ships, frame it as:

🩸 War Drives Demand
Black Market buyers are paying top dollar for supplies during conflict.

Not:

“Prices increased”

“Economic modifier”

“Buff”

Always tie it to world logic, not systems.


Recommended Fee Structure (Ship This)
Flat Fee, Scales with Player Progress

Do not scale by target. Scale by attacker tier.

Example (clean and understandable):

Player Tier	PvP Cash Fee
Early game	$500
Mid game	$1,000
Late game	$2,000

Why this works:

Always affordable

Never ignorable

Predictable

Doesn’t punish weaker players disproportionately

This is roughly:

~1–3% of daily income

Comparable to a “meaningful click”

❌ What NOT to Do

% of cash (feels punitive)

Scaling by defender wealth (grief fuel)

TON or Diamonds (wrong emotional layer)

Zero-cost revenge (infinite loops)

💡 Revenge Fee

👉 Same fee as normal PvP

Do not discount revenge.
The emotional discount is enough.

2️⃣ Predicted Impact on PvP Frequency

Let’s be realistic.

Short-Term (First 48–72 Hours)

📉 PvP attempts drop ~20–30%

📈 PvP success rate increases

📈 Protection purchases increase

📈 Revenge usage increases

This is good.
You are filtering out low-intent noise.

Medium-Term (1–2 Weeks)

⚔️ Total PvP actions stabilize at ~85–90% of previous

😡 Rage attacks decrease

🎯 Targeted attacks increase

🔁 Feuds emerge (A ↔ B patterns)

This is where retention improves.

Monetization Side Effects (Important)

Protection & shields: +10–20% usage

Cash sinks stabilize inflation

Diamond rebuy loop improves indirectly

Players plan attacks instead of spamming

Net result:

Slightly fewer attacks, much higher-quality PvP

That’s exactly what you want for a long-running game.

3️⃣ War-Only PvP Rule Variants (This Is Where It Gets Fun)

War is where you can safely bend rules, because context justifies it.

The key principle:

War loosens constraints — it never removes them.

🔥 War Variant 1: Reduced PvP Fee (RECOMMENDED)

During war:

PvP cash fee reduced by 50%

Why:

Encourages aggression

Feels like “resources are flowing”

Still prevents spam

Example:

Normal: $1,000

War: $500

This alone will spike PvP.

🔥 War Variant 2: Limited Revenge Expansion

During war only:

Revenge window extended (e.g. 24h → 48h)

Still:

One revenge

Same fee

No chaining

This supports:

Long-running feuds

Multi-day wars

Emotional continuity

🔥 War Variant 3: Protection Tension (OPTIONAL, LATER)

Do not do this in v1, but note it for later:

Protection duration unchanged

But cooldown to re-buy protection increases during war

This creates:

Strategic vulnerability windows

High-value targets

More meaningful timing

Only add this once you’re confident.

🚫 What You Should NOT Change During War

Level gap rules ❌

Protection immunity ❌

PvP fee removal ❌

Free attacks ❌

War should feel dangerous, not chaotic.

4️⃣ Recommended Implementation Order
Ship Now

Flat cash PvP fee (tiered)

Same fee for revenge

No attacks vs protected players

Next War Patch

50% fee reduction during war

Extended revenge window during war

Everything else can wait.

5️⃣ How to Explain This to Players (Important)

Never say:

“We added a fee”

Say:

🗡️ Assassinations Require Resources
Attacking another player now costs cash.
During war, violence is cheaper.

That framing matters.

Final Operator Summary

You’re doing three smart things simultaneously:

Adding friction with purpose

Creating economic tension

Designing war as a ruleset, not a skin

This is exactly how sustainable PvP economies are built.


Treasury-funded War actions


🕵️ FAMILY INTEL SYSTEM — FORMAL DESIGN SPEC
1️⃣ PURPOSE & DESIGN INTENT

The Intel System exists to:

Add information asymmetry to Family conflict

Make preparation matter more than raw stats

Give the Family Armory a strategic purpose

Create costly choices through visibility tradeoffs

Gate Family Wars and advanced attacks behind preparation

Intel is not power.
Intel is knowledge at a cost.

2️⃣ CORE CONCEPTS
🔹 Intel (Resource)

A family-level resource

Generated via the Family Armory

Spent, not passive

Cannot be bought directly with money or premium currency

Has a cap

🔹 Visibility (Cost)

Spending Intel increases Family Visibility

Visibility represents how exposed your family is

Visibility is:

Bidirectional

Temporary

Non-exact

Visibility creates counterplay

3️⃣ FAMILY ARMORY → INTEL GENERATION
Armory Role

The Armory is not storage — it is an infrastructure.

Armory items contribute to:

Intel Generation Rate

Intel Storage Cap

Conceptual Examples (Flavor, Not Final Items)

Informant Network

Surveillance Gear

Wiretaps

Forged Dossiers

Bribed Officials

Generation Rules

Intel generates slowly over time

Each Armory item contributes diminishing returns

Max generation rate is capped

This prevents hoarding and snowballing.

4️⃣ INTEL STORAGE & DECAY
Intel Cap

Families cannot stockpile unlimited Intel

Cap scales modestly with Armory investment

Intel Decay (Soft)

If Intel is not spent, it decays slowly

Decay is gentle (e.g. % over days, not hours)

Encourages use, not hoarding

5️⃣ INTEL SPEND — SCOUTING ACTIONS

Intel is spent through explicit actions.

🔍 Intel Actions Menu (Conceptual)
Action	Intel Cost	Visibility Cost	Result
Quick Glance	Low	Low	1 random family attribute
Focused Recon	Medium	Medium	2 related attributes
Deep Intel	High	High	Pattern-based insight
War Prep	High	High	Unlocks war actions
🎲 Randomness (Important)

Early scouting returns randomized info

Prevents surgical targeting

Preserves uncertainty

6️⃣ WHAT CAN BE REVEALED (ALLOWED)

Intel reveals categories and ranges, never exact values.

Possible Reveal Categories

Crew composition (light / heavy)

Defense focus (low / medium / high)

Armory investment level

Treasury activity (active / inactive)

Recent PvP intensity (quiet / active)

7️⃣ WHAT CAN NEVER BE REVEALED

Hard rules — do not break these:

❌ Exact STR / DEF values
❌ Exact item lists
❌ Online status
❌ Shield / protection timers
❌ Individual player stats
❌ Real-time data

If Intel ever removes risk, the system fails.

8️⃣ VISIBILITY SYSTEM (CRITICAL)
What Visibility Does

When a family spends Intel:

Their visibility increases

Other families gain:

Partial intel access

Awareness of activity

Visibility Effects (Conceptual)

Family appears as:

“Actively Gathering Intel”

Opponents may:

Perform counter-intel

Prepare defenses

Choose diplomacy or escalation

Visibility fades over time if Intel spending stops.

9️⃣ INTEL & FAMILY WARS (GATING MECHANISM)
War Prerequisite

A minimum Intel threshold is required to:

Declare war

Launch coordinated family attacks

Intel is consumed to initiate war

This ensures:

No impulsive wars

Clear escalation windows

Time for counterplay

🔟 BALANCE & ANTI-ABUSE MEASURES
Anti-Snowball

Intel caps

Diminishing Armory returns

Visibility scaling faster than Intel gain

Anti-Griefing

Intel costs apply even for failed scouting

Visibility always increases on spend

Small Family Viability

Intel gain scales per-member

Smaller families can outplay larger ones with smart spending

1️⃣1️⃣ UI / UX PRINCIPLES (NO DESIGN YET)

Intel shown as a resource bar

Spend actions feel intentional

Visibility is hinted, not numerically exposed

Tooltips explain tradeoffs clearly

Tone:

Strategic. Risk-aware. Mafia-flavored.

1️⃣2️⃣ SEASON & LONG-TERM INTEGRATION
Season Interaction

Intel resets each season

Armory items persist

Visibility does not carry over

Long-Term Evolution (Later)

Counter-intel actions

Intel warfare

False information (deception mechanics)

Not for Season 1.

FINAL DESIGN VERDICT

✅ Fits your existing systems
✅ Deepens Family gameplay
✅ Enables meaningful Wars
✅ Avoids pay-to-win
✅ Creates stories, not spreadsheets

This is a foundational war system, and you’ve designed it the right way:
on paper first.