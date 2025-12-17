# Ops Page Action Audit Report

**Audit Date**: 2025-12-17  
**Scope**: Jobs, Heists, PvP Attacks, Drive-by, High Stakes

---

## 1. JOBS (PvE - NPC Targets)

| Job Name | Target | Energy Cost | Possible Losses | Possible Rewards | Risk Tier |
|----------|--------|-------------|-----------------|------------------|-----------|
| Pickpocket | NPC | 2 | Energy only | $150, +2 Respect | **Low** |
| Mug a Pedestrian | NPC | 3 | Energy only | $300, +5 Respect | **Low** |
| Rob a Corner Store | NPC | 5 | Energy only | $750, +12 Respect | **Low** |
| Collect Protection | NPC | 10 | Energy only | $5,000, +30 Respect | **Low** |
| Hijack Delivery | NPC | 15 | Energy only | $8,000, +50 Respect | **Low** |
| Smuggle Goods | NPC | 25 | Energy only | $15,000, +75 Respect | **Low** |
| Hit Contract | NPC | 35 | Energy only | $25,000, +125 Respect | **Low** |
| Rob the Bank | NPC | 50 | Energy only | $50,000, +250 Respect | **Low** |
| Casino Heist | NPC | 75 | Energy only | $100,000, +600 Respect | **Low** |

> **Notes**: Jobs have variable success rates (95% - 50%). On failure, only energy is lost. Job Chains provide streak bonuses (+10% per streak, max 50%). Chain failures can be recovered for 15💎.

---

## 2. HEISTS (PvE - NPC Targets)

| Heist Name | Target | Stamina Cost | Possible Losses | Possible Rewards | Risk Tier |
|------------|--------|--------------|-----------------|------------------|-----------|
| Street Punk | NPC | 3 | Stamina only | $500, +1 Respect | **Low** |
| Corner Shop | NPC | 5 | Stamina only | $1,500, +2 Respect | **Low** |
| Rival Dealer | NPC | 8 | Stamina only | $2,500, +3 Respect | **Low** |
| Rival Gang Hideout | NPC | 10 | Stamina only | $8,000, +5 Respect | **Low** |
| Armored Truck | NPC | 15 | Stamina only | $25,000, +10 Respect | **Low** |
| Police Convoy | NPC | 20 | Stamina only | $50,000, +25 Respect | **Low** |

> **Notes**: Heists have individual cooldowns (15-120 mins). No item/cash/crew losses on defeat. Rush cooldown for 3💎.

---

## 3. PVP ATTACKS (Player Targets)

| Attack Type | Target | Stamina Cost | Requirements | Possible Losses (defeat) | Possible Rewards (victory) | Risk Tier |
|-------------|--------|--------------|--------------|--------------------------|---------------------------|-----------|
| Mugging | Player | 5 | None | -4 to -8 Respect | 20% Cash, +5 Respect | **Medium** |
| Business Raid | Player | 10 | Crew | -4 to -8 Respect, up to 2 crew | 30% Cash, Contraband, +5 Respect | **Medium** |
| Safe Heist | Player | 15 | Crew, Consumables | -4 to -8 Respect, up to 2 crew | 15% Vault, Contraband, +10 Respect | **High** |
| Drive-By | Player | 8 | Consumables | -4 to -8 Respect | Crew kills (max 2), +10 Respect | **Medium** |

### PVP Steal Matrix

| Attack Type | Steals Cash | Steals Vault | Steals Contraband | Steals Respect | Kills Crew |
|-------------|:-----------:|:------------:|:-----------------:|:--------------:|:----------:|
| Mugging | ✅ 20% | ❌ | ❌ | ❌ | ❌ |
| Business Raid | ✅ 30% | ❌ | ✅ (up to 2) | ❌ | ❌ |
| Safe Heist | ❌ | ✅ 15% | ✅ (up to 2) | ❌ | ❌ |
| Drive-By | ❌ | ❌ | ❌ | ❌ | ✅ (max 2) |

### PVP Respect Mechanics

| Outcome | Attacker | Defender |
|---------|----------|----------|
| Victory (base attack) | +5 Respect + stolen | -3 Respect - stolen |
| Victory (consumable attack) | +10 Respect + stolen | -3 Respect - stolen |
| Defeat | -4 to -8 Respect (flat) | +2 Respect |

> **Notes**: Shield booster blocks PvP entirely. Insurance protects cash only, NOT Respect.

---

## 4. HIGH STAKES MISSIONS (Premium Jobs)

| Mission Name | Target | Entry Cost | Energy Cost | Possible Losses | Possible Rewards | Risk Tier |
|--------------|--------|------------|-------------|-----------------|------------------|-----------|
| Operation: Black Vault | NPC | 50💎 | 25 | 50💎 (always), Energy | $225,000, +300 Respect | **High** |
| Syndicate Heist | NPC | 75💎 | 35 | 75💎 (always), Energy | $450,000, +500 Respect | **High** |
| Casino Takeover | NPC | 100💎 | 50 | 100💎 (always), Energy | $900,000, +1,000 Respect | **High** |

> **Notes**: Entry fee is **non-refundable** on failure. Success rates: 45%-65%. Cooldowns: 60-180 mins.

---

## Risk Tier Summary

| Tier | Description | Actions |
|------|-------------|---------|
| **Low** | No permanent losses. Only energy/stamina consumed. | Jobs, PvE Heists |
| **Medium** | Moderate Respect loss on defeat. Harassment attacks. | Mugging, Business Raid, Drive-By |
| **High** | Significant Respect/crew loss, material theft. | Safe Heist |
| **Extreme** | Diamond entry fee (non-refundable). High failure rate. | High Stakes Missions |

---

*Sources: `037_pvp_attack_overhaul.sql`, `036_pve_attack_system.sql`, `055_diamond_sinks.sql`, `111_pvp_respect_alignment.sql`, `game_definitions.sql`*
