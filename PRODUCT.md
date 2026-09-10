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
- **Over-rounding**, with one deliberate exception: the island is a full pill and the
  expanded panel is 22px, because that is what a Dynamic Island is. Everything *inside*
  the panel still tops out at 8px.
- **Notification-centre theatre.** No toasts that slide and auto-vanish, no badge
  animations celebrating themselves. Alerts are sticky and quiet.
- **Dashboard-metric templates.** No big-number-plus-tiny-label hero stat blocks. The
  numbers here are small because they are read at a glance, not presented.
- **Prose in a peripheral HUD.** The collapsed island carries zero words. A platform
  is a mark, not a name; a finished task is a filled progress bar, not a sentence.
  Words are reserved for the two states that need a human.
- **Containers as decoration.** No cards, no wells, no card-in-card. Grouping is done
  with spacing and a single hairline. A border must earn its pixel.

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
4. **Catch edges, not levels.** The job is to notice the transition into "needs a
   human", not to render the current state of everything. A level never changes what
   Yanice does next; that is what made earlier versions feel heavy despite being
   small. **Glanceable beats complete, everywhere.** The widget answers "does anything need
   me?" in one look. The panel answers "what, and in which project?" Neither is a
   place to be thorough. When in doubt, cut. Notes and the per-event timeline were
   both cut for exactly this reason: they were record-keeping, and this is an
   instrument, not a record.
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
- Light and dark both ship, following the macOS system appearance with no control in
  the UI. The native window material is `Popover`, which AppKit renders light or dark
  to match, so the frost and the CSS never disagree.
- Light mode is not the dark palette inverted. It uses a **more opaque** tint (0.76 vs
  0.62) because dark text over a light translucent panel loses contrast far faster as
  the wallpaper darkens, and darker status hues, because the dark-mode hues fail on a
  light surface. Both themes are measured against their own worst-case wallpaper.
