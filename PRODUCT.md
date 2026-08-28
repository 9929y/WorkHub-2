# Product

## Register

product

## Users

One person: Yanice, a product designer running several AI coding and design agents at
once (Cursor, Codex, Figma, Cloud jobs). Context of use is peripheral, not focal. The
HUD sits in the top-right corner of the desktop for the whole working day while
attention is somewhere else entirely, in an editor or a Figma file. It is glanced at,
not visited. A session with it lasts seconds.

The job to be done: answer "what finished, what is blocked, what is still running"
without switching to four tools and reconstructing the state by hand.

## Product Purpose

Workhub aggregates status reported by machines. Agents POST events to a local endpoint
and Workhub groups them by project, rolls status up across tools, and holds
notifications until they are explicitly dismissed.

It is explicitly not a todo app. Nothing in it is maintained by hand except notes.
Success is that Yanice stops asking "did that finish?" and stops losing a blocked
agent for an hour because nothing surfaced it.

## Brand Personality

A macOS system utility, in the iStat Menus / Activity Monitor tradition. An instrument,
not an app.

- No brand voice in the interface. The product name appears once, small, and never
  again. There is no marketing surface anywhere in the product.
- Native by default: SF Pro via the system stack, standard macOS affordances, no
  invented controls.
- Information first. Density is a feature; the panel should feel like a readout.
- Quiet until something needs a decision. The interface earns attention only when a
  task is blocked or waiting on Yanice, and it must be honest about when it does not
  need attention at all.

## Anti-references

- **Landing pages.** There is no hero, no onboarding, no empty marketing state. First
  paint is a working HUD.
- **Large-area purple / violet gradients.** The saturated AI-product default. Banned
  outright.
- **Over-rounding.** Nothing rounder than 12px. 20px+ radii read as a consumer widget,
  not an instrument.
- **Notification-centre theatre.** No toasts that slide and auto-vanish, no badge
  animations celebrating themselves. Alerts are sticky and quiet.
- **Dashboard-metric templates.** No big-number-plus-tiny-label hero stat blocks. The
  numbers here are small because they are read at a glance, not presented.
- **Decorative translucency.** Frosted glass is kept because the window genuinely
  floats over the desktop, which is a functional reason. It is never applied to inner
  elements for looks.

## Design Principles

1. **Legibility must not depend on the wallpaper.** Translucency is the identity, so
   every text/background pair has to pass contrast against the *tint alone*, assuming
   the worst-case bright desktop behind it. If a colour only works over dark
   wallpaper, it is wrong.
2. **Status colour means status, nothing else.** The four state colours are a reserved
   vocabulary. Counts, emphasis, pinning and selection use neutrals. A red badge next
   to a red status chip is a bug, not a style.
3. **Never colour-only.** Status must survive being printed in greyscale: shape and
   text carry it too. This is a four-colour system including the red/green pair.
4. **Glanceable beats complete.** The collapsed widget answers one question in one
   look. Anything that needs reading belongs in the panel. When in doubt, cut from the
   widget, not from the panel.
5. **Earned familiarity over invention.** Standard macOS behaviour every time there is
   a choice. Novelty in a peripheral always-on utility is a cost, not a feature.

## Accessibility & Inclusion

- Target WCAG AA: body text >=4.5:1, large/bold text >=3:1, measured against the glass
  tint rather than an assumed dark backdrop.
- **Colour-vision independence is a requirement, not a nice-to-have.** The status
  system spans red and green, so each status carries a distinct glyph shape in addition
  to hue, and every status indicator exposes a text label to assistive tech.
- `prefers-reduced-motion` is honoured; the only continuous animation in the product
  (the running pulse) must stop under it, and no information may be conveyed by motion
  alone.
- Full keyboard operability with visible focus rings. Focus is never removed, only
  scoped to keyboard use.
- Dark-only is a deliberate constraint, not an omission: the HUD floats over arbitrary
  wallpaper and a light variant would lose contrast against bright desktops.
