# DESIGN.md — One Crunch Lady

Derived from this codebase's existing tokens and conventions (CLAUDE.md, `tailwind.config.ts`,
`app/globals.css`, and precedent in `components/features/`). This file documents a system that
already exists — it does not introduce one. Written in the Stitch `DESIGN.md` format so any
coding agent (this one or another) can build a new page and land inside the existing brand
without re-deriving it from scratch each time.

## 1. Visual Theme & Atmosphere

"Manga / comic book." Bold, high-contrast, hand-drawn-panel energy for a Singapore home bakery
that sells cookies direct via WhatsApp/PayNow — playful and loud, not corporate-clean. The
recurring devices: thick borders (2–4px) on everything that's a discrete unit, hard offset drop
shadows instead of soft blurs (comic-panel "pop," not elevation), occasional slight rotation/skew
on hero panels for hand-placed energy, and a sunburst/halftone backdrop behind primary CTAs.
Never minimal, never soft-shadowed, never pastel.

## 2. Color Palette & Roles

| Token | Hex | Role |
|---|---|---|
| `hero-yellow` | `#FFD700` | Backgrounds, accents, sunburst fills |
| `power-red` | `#D32F2F` | CTAs, critical actions, discount/sale badges, error states |
| `cookie-brown` | `#8D6E63` | Borders, icon fills, non-text UI — **never text** |
| `cookie-brown-dark` | `#6B4F44` | All body copy, labels — the only text color on brand backgrounds |
| `flour-white` | `#FAFAFA` | Base backgrounds, card interiors |

**Hard rules, not preferences:**
- `cookie-brown` fails AA for text on both `hero-yellow` (3.30:1) and `flour-white` (4.43:1) — it
  clears only the 3:1 non-text threshold. It is a border/icon/decorative color, full stop.
- `cookie-brown-dark` is the only text color used against any brand background; it passes AA on
  both `hero-yellow` and `flour-white`.
- Never white text on `hero-yellow`.
- Never apply `/NN` opacity to a *text* color — it drags contrast back under AA even when the
  base color would pass. Opacity on a *background* (`bg-cookie-brown/10`) is fine and used
  throughout (footer, unavailable cart lines).
- A struck-through "original price" is still text: `text-cookie-brown-dark`, never muted with
  opacity.

## 3. Typography

- `font-display` → Bangers (`--font-bangers`), used on every heading tag (`h1`–`h6`) globally via
  `app/globals.css`, always `uppercase`. This is the "impact lettering" voice — large sizes read
  as shouted, which is the intent.
- `font-sans` → Inter (`--font-inter`), body copy, labels, buttons, form fields.
- Headings scale up aggressively across breakpoints (`text-4xl … desktop:text-8xl` on the hero) —
  don't undersize a `font-display` heading, it reads as a mistake in this system, not restraint.

## 4. Component Stylings

Real precedent, not invented:

- **Primary CTA button:** `rounded-md border-[3px] border-cookie-brown bg-power-red px-6
  text-flour-white font-semibold`, min `.tap-target` (44×44).
- **Secondary/icon button:** `rounded-md border-2 border-cookie-brown text-cookie-brown-dark`
  (thinner border than primary — the 3px border is reserved for the single most important action
  in a given view).
- **Text input:** `rounded-md border-2 border-cookie-brown px-3 text-cookie-brown-dark`, full
  width, `.tap-target` height.
- **Checkbox:** the one documented exception to the radius scale —
  `rounded-sm h-4 w-4 appearance-none border-2 border-cookie-brown checked:bg-cookie-brown`.
  `rounded-sm` only here; nowhere else.
- **Card / list-item container:** `rounded-xl border-2 border-cookie-brown`.
- **Top-level panel (hero, drawer, modal):** `rounded-2xl` (or `rounded-l-2xl` for a
  right-anchored drawer) with the thicker `border-[3px]`/`border-[4px]` treatment and often a hard
  offset shadow: `shadow-[Npx_Npx_0_0_#8D6E63]`.
- **Disabled state:** `disabled:opacity-40` / `disabled:brightness-90` + `disabled:cursor-not-allowed`
  — opacity is fine here because it's not text-color opacity, it's whole-element.
- **Placeholder art:** when a product/entity has no photo, an inline SVG monogram
  (`hero-yellow` fill, `cookie-brown` stroke, first-letter Bangers glyph in `cookie-brown`) — never
  a generic gray box or stock icon. See `ProductPlaceholder` in `ProductCard.tsx`.
- **Badges (sold-out, discount, etc.):** solid `power-red` background, `flour-white` text, sits as
  a local-stacking-context overlay (`z-10`/`z-20`), not part of the global z-index scale below.

## 5. Layout Principles

- Mobile-first. Custom breakpoints only: `mobile:375px` / `tablet:768px` / `desktop:1280px`. The
  default Tailwind `sm`/`md`/`lg`/`xl` scale still technically exists in the generated CSS but is
  never used in this codebase — don't introduce it in new work.
- `.responsive-shell` is the page-width container (`min(100%, 375/768/1280px)`, auto margins) —
  use it, don't hand-roll a max-width wrapper.
- `.full-bleed` escapes it for a section that needs to run to the viewport edge; nest
  `.responsive-shell` back inside if that section still needs a constrained column.
- Panels commonly carry a slight `rotate(-1deg)`/`skew(-1deg)` transform for hand-placed energy —
  used sparingly, on hero/story panels, not on every card.

## 6. Depth & Elevation

No soft `box-shadow` blur anywhere in this system — depth reads through **borders + hard offset
shadows**, not blur:

```
.impact-border { border-[3px] border-cookie-brown shadow-[4px_4px_0_0_#8D6E63] }
```

Larger panels scale the offset up (`shadow-[8px_8px_0_0_#8D6E63]` on the story panel). Stacking
order is a fixed, named scale in `app/globals.css` — reuse these, don't invent a new z-index:

| Class | z-index | Layer |
|---|---|---|
| `.z-header` | 40 | Sticky site header |
| `.z-cart-bubble` | 45 | Floating cart bubble |
| `.z-modal` | 50 | Product detail modal / dialogs |
| `.z-drawer` | 60 | Cart drawer |
| `.z-toast` | 65 | Add-to-cart toast (must read above the drawer that triggered it) |
| `.z-splash` | 70 | One-time full-viewport intro — the only thing above the drawer |

A badge or overlay scoped inside a `relative` card (sold-out scrim, discount tag) is a *local*
stacking context and uses ordinary low values (`z-10`/`z-20`) — it is not part of this scale.

## 7. Do's and Don'ts

**Do:**
- Reuse `.impact-border`, `.tap-target`, `.responsive-shell`, `.full-bleed`, `.hero-sunburst`
  from `app/globals.css` before writing new utility combinations.
- Keep every interactive element ≥ 44×44px (`.tap-target`).
- Run every new text/background color pairing against WCAG AA before shipping.
- Follow the radius scale by *role*, not by feel: `rounded-md` (controls) → `rounded-xl` (cards) →
  `rounded-2xl` (top-level containers) → `rounded-full` (true circles/pills).

**Don't:**
- Don't use `cookie-brown` for text, ever.
- Don't put white text on `hero-yellow`.
- Don't apply `/NN` opacity to a text color.
- Don't introduce `sm:`/`md:`/`lg:`/`xl:` — this codebase has its own breakpoint names.
- Don't introduce `rounded-lg` or bare `rounded` — not in the scale.
- Don't use soft/blurred `box-shadow` — hard offset shadows only.
- Don't add a new z-index value outside the named scale for a page-level overlay.

## 8. Responsive Behavior

- Design mobile-first (375px) and scale up; `desktop:` (1280px) is the ceiling, not the default
  design target.
- Multi-item navigation (6 links) does not fit inline at 375–767px — collapse to a hamburger/panel
  pattern below `tablet:`, matching the existing focus-trap + scroll-lock pattern used by the cart
  drawer and product modal (`hooks/useFocusTrap.ts`, `hooks/useBodyScrollLock.ts`) rather than a
  new one.
- Hero/story panel rotation transforms are visual flourish only — confirm they don't clip content
  at 375px before shipping.

## 9. Agent Prompt Guide

When building a new page or component in this codebase:

1. Reuse an existing panel/button/input class combination from section 4 before writing a new one.
2. Reuse `.responsive-shell` for page width; never hand-roll `max-w-*` + `mx-auto`.
3. Every heading is `font-display uppercase`; every other text is `font-sans` (Inter, the default).
4. Every color pairing must clear WCAG AA — `cookie-brown-dark` for text, `cookie-brown` only for
   borders/icons/non-text.
5. Depth is borders + hard offset shadow, never blur. Stacking order comes from the named z-index
   scale for anything that overlays the whole page; local badges use ordinary low z-index.
6. Breakpoints are `mobile:`/`tablet:`/`desktop:` only.
7. If a pattern here doesn't cover the case, look for the closest real precedent in
   `components/features/` before inventing a new one — this file documents what exists, it is not
   exhaustive.
