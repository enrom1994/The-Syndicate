Perfect. I’ll keep this **practical, implementable, and v1-focused** — not fantasy design.
This is a spec you can actually hand to devs (or yourself in 2 weeks and still understand).

---

# 🗺️ TURF MAP v1 — FUNCTIONAL SPEC

## 1. Purpose of TurfMap v1

**Primary goal (v1):**

> Give players a **clear, interactive overview of turf ownership and war status** during Family War seasons.

**Non-goals (explicitly not v1):**

* No 3D
* No real geography
* No influence percentages
* No fog-of-war complexity
* No animated battles

This keeps v1 shippable.

---

## 2. Core User Stories (v1 Only)

### Player

* I can see **which family owns which turf**
* I can see **which turfs are vulnerable / contested**
* I can tap a turf to view **intel + actions**
* I can tell **where war will happen today**

### Leader (Boss / Underboss)

* I can quickly identify **attackable turfs**
* I can see **lock timers**
* I can plan **next moves**

---

## 3. Map Model (Conceptual)

### Map Is:

* **Abstract city**
* Divided into **named districts**
* Turf shapes are **stylized**, not realistic
* Layout never changes during a season

Think: *board game map*, not Google Maps.

---

## 4. Data Model (Backend → Frontend)

Each turf region is driven by server truth.

```ts
type Turf = {
  id: string
  name: string

  ownerFamilyId: number | null

  status:
    | "safe"
    | "vulnerable"
    | "contested"
    | "locked"

  vulnerabilityWindow?: {
    start: string
    end: string
  }

  activeConflict?: {
    attackerFamilyId: number
    phase: "prep" | "live" | "resolution"
  }
}
```

**Frontend never decides status.**
It only renders it.

---

## 5. Visual Language (v1)

### Color Logic

* **Owner color** = base fill
* **Neutral turf** = parchment gray
* **Enemy turf** = muted version of their color
* **Your family turf** = full saturation

### Status Overlays

| Status     | Visual Treatment        |
| ---------- | ----------------------- |
| Safe       | Flat fill               |
| Vulnerable | Pulsing border          |
| Contested  | Diagonal stripe overlay |
| Locked     | Darkened + lock icon    |

---

## 6. Interactions (Touch First)

### Tap

* Opens **Turf Intel Drawer**
* Shows:

  * Owner
  * Status
  * Time windows
  * Available actions

### Long Press (Leader roles only)

* Context action:

  * Declare attack
  * Reinforce
  * Scout

### Pan / Zoom

* Enabled
* Constrained (no infinite zoom)

---

## 7. Turf Intel Panel (v1)

Minimal, fast, useful.

```
──────────────
DOWNTOWN
Owned by: Black Vipers
Status: Vulnerable
Window: 20:00 – 22:00

[Attack] [Scout]
──────────────
```

No charts. No lore dumps.

---

# 🧱 SVG REGION DESIGN RULES

This is the **critical part**.
Bad SVG rules = pain forever.

---

## 8. SVG Map Structure

### File

```
/assets/maps/city_v1.svg
```

### Root Rules

```xml
<svg viewBox="0 0 1000 1000">
  <g id="turfs">
    <!-- Regions go here -->
  </g>
</svg>
```

**Fixed coordinate system** — never change after launch.

---

## 9. Region Definition Rules

Each turf is a single, closed path.

```xml
<path
  id="turf-downtown"
  d="M120 140 L300 160 L280 300 L140 280 Z"
/>
```

### Mandatory Rules

1. **One path = one turf**
2. No overlapping paths
3. No strokes in SVG file (React applies them)
4. Paths must be:

   * Closed
   * Clockwise
5. No transforms on individual paths

---

## 10. Naming Convention (NON-NEGOTIABLE)

```txt
turf-{slug}
```

Examples:

* `turf-downtown`
* `turf-harbor`
* `turf-industrial`

This lets React do:

```ts
document.getElementById(`turf-${turf.id}`)
```

---

## 11. Styling Strategy (React-Controlled)

SVG file contains **no styling**.

React applies styles dynamically:

```tsx
<path
  className={clsx(
    "turf",
    `owner-${ownerFamilyId}`,
    `status-${status}`
  )}
/>
```

### Base CSS

```css
.turf {
  transition: fill 0.3s, stroke 0.3s;
  cursor: pointer;
}
```

---

## 12. Status Overlay Techniques (SVG-Safe)

### Vulnerable (Pulse)

* CSS animation on stroke-opacity

### Contested (Stripes)

* SVG `<pattern>` injected at runtime
* Mask applied to region

### Locked

* Opacity + icon anchored at centroid

---

## 13. Region Size Rules

To prevent UX hell:

* Minimum tappable area: **48×48 px**
* No “needle” regions
* Adjacent regions must have **visible separation**

If a region is too small:
👉 merge or redesign

---

## 14. Centroid Calculation (For Icons)

You will need this.

Either:

* Precompute centroids offline
* Or calculate via SVG path bounds

Used for:

* Lock icons
* Conflict indicators
* Timers

---

## 15. Turf Count (v1 Recommendation)

**Sweet spot:**
🟩 **12–18 turfs total**

Enough strategy, not overwhelming.

---

# 🚀 v1 Delivery Checklist

Before calling TurfMap “done”:

* [ ] All turfs clickable on mobile
* [ ] No accidental taps while panning
* [ ] Status changes animate cleanly
* [ ] No SVG edits required for new seasons
* [ ] Backend can fully drive map state

---

## What I’d Do Next (Optional)

If you want, next steps could be:

1. **Draw the actual city layout** (district ideas)
2. Create a **TurfMap.tsx skeleton**
3. Design **war-time visual escalation**
4. Plan **v2 fog of war**

Just tell me which one you want next.
