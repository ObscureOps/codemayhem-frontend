# CISCODE — Design Tokens

Single source of truth for the visual system. Update this before changing
`tailwind.config.js`, not after.

## Color
| Token | Hex | Role |
|---|---|---|
| `ink` | `#15181F` | Dark surface — nav rail, dark UI |
| `chalk` | `#EDEBE4` | Light surface — main content background |
| `graphite` | `#4A4E58` | Secondary text, hairline borders |
| `signal` | `#FFB100` | Single loud accent — primary actions + one signature element per screen. Not decorative. |
| `pass` | `#4C9A6A` | Passed test / success state |
| `fail` | `#C4574A` | Failed test / error state |

## Type
- Display (headings): Space Grotesk, 500/600/700
- Body: IBM Plex Sans, 400/500/600
- Mono (code, timers, IDs, live data): IBM Plex Mono, 400/500/600

## Layout
- Dark nav rail (`ink`) + light content area (`chalk`) — the shell's one
  structural signature. Left rail on desktop (md+), bottom bar on mobile,
  same `ink` treatment at both sizes so identity doesn't shift across
  breakpoints.
- Hairline (`graphite`, 1px) borders instead of shadow-cards.

## Rules
- `signal` is reserved. Don't spend it on decoration — it marks the one
  interactive/important thing per screen (active nav item, primary button,
  a battle timer readout).
- No soft drop-shadows on cards; use `graphite` hairlines.
- Respect `prefers-reduced-motion` (baked into `index.css` globally — don't
  add per-component overrides that fight it).
