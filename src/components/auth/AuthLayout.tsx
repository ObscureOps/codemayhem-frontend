import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useOutlet } from 'react-router-dom'
import { Zap, Terminal, Trophy } from 'lucide-react'

// Raw hex needed only for the SVG gradient/drop-shadow filters below, which can't
// be expressed via Tailwind utility classes. Everything else in this file uses the
// real bg-*/text-*/fill-*/stroke-* utilities generated from the @theme tokens.
const SIGNAL_HEX = '#FFB100'
const CHALK_HEX = '#EDEBE4'

const FEATURES = [
  { icon: Zap, title: 'Real-time battles', body: 'Face off live against classmates, not just the clock.' },
  { icon: Terminal, title: 'C, Java, and SQL', body: 'Submit real code, judged in real sandboxes.' },
  { icon: Trophy, title: 'Climb the boards', body: 'Every battle updates your rank.' },
]

function SignalBars({ reducedMotion }: { reducedMotion: boolean }) {
  const bars = [
    { h: 6, delay: 0 },
    { h: 11, delay: 150 },
    { h: 15, delay: 300 },
    { h: 8, delay: 450 },
  ]

  return (
    <div className="mb-3 flex h-4 items-end gap-1">
      <style>{`
        @keyframes barPulse {
          0%, 100% { transform: scaleY(0.45); }
          50% { transform: scaleY(1); }
        }

        .sig-bar {
          animation: barPulse 1.15s ease-in-out infinite;
        }
      `}</style>

      {bars.map((b, i) => (
        <span
          key={i}
          className={`w-[3px] bg-signal ${reducedMotion ? '' : 'sig-bar'}`}
          style={{
            height: `${b.h}px`,
            transformOrigin: 'bottom',
            animationDelay: reducedMotion ? undefined : `${b.delay}ms`,
            opacity: reducedMotion ? 0.75 : 1,
          }}
        />
      ))}
    </div>
  )
}

function makeStars(
  count: number,
  seedA: number,
  seedB: number,
  rMin: number,
  rMax: number,
  oMin: number,
  oMax: number,
) {
  return Array.from({ length: count }, (_, i) => ({
    x: (i * seedA) % 100,
    y: (i * seedB) % 100,
    r: rMin + (((i * 7) % 10) / 10) * (rMax - rMin),
    o: oMin + (((i * 13) % 10) / 10) * (oMax - oMin),
  }))
}

const STARS_FAR = makeStars(90, 31.7, 67.3, 0.3, 0.6, 0.12, 0.3)
const STARS_MID = makeStars(40, 53.1, 41.9, 0.6, 1.0, 0.3, 0.5)
const STARS_NEAR = makeStars(14, 71.3, 19.7, 1.0, 1.7, 0.5, 0.8)

interface ShootingStarInstance {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  dx: number
  dy: number
  duration: number
}

let shootingStarSeq = 0

type SkyRegion =
  | 'upper-left'
  | 'upper-right'
  | 'middle-left'
  | 'middle-right'
  | 'lower-left'
  | 'lower-right'

function getRegion(x: number, y: number): SkyRegion {
  const horizontal = x < 50 ? 'left' : 'right'

  if (y < 30) {
    return horizontal === 'left'
      ? 'upper-left'
      : 'upper-right'
  }

  if (y < 58) {
    return horizontal === 'left'
      ? 'middle-left'
      : 'middle-right'
  }

  return horizontal === 'left'
    ? 'lower-left'
    : 'lower-right'
  }

function regionDistance(
  a: SkyRegion,
  b: SkyRegion,
): number {
  const positions: Record<SkyRegion, [number, number]> = {
    'upper-left': [0, 0],
    'upper-right': [1, 0],
    'middle-left': [0, 1],
    'middle-right': [1, 1],
    'lower-left': [0, 2],
    'lower-right': [1, 2],
  }

  const [ax, ay] = positions[a]
  const [bx, by] = positions[b]

  return Math.abs(ax - bx) + Math.abs(ay - by)
}

/*
 * Choose a spawn position that is deliberately far from currently
 * visible meteors.
 *
 * This prevents:
 *
 *   star  star  star
 *
 * from appearing in one part of the sky.
 *
 * Instead, overlapping meteors are pushed toward distant regions.
 */
function pickDistantSpawn(
  liveStars: ShootingStarInstance[],
): { x1: number; y1: number } {
  const candidates = Array.from(
    { length: 30 },
    () => ({
      x1: 12 + Math.random() * 76,
      y1: 8 + Math.random() * 70,
    }),
  )

  if (liveStars.length === 0) {
    return candidates[
      Math.floor(
        Math.random() * candidates.length,
      )
    ]
  }

  const scored = candidates.map((candidate) => {
    const candidateRegion = getRegion(
      candidate.x1,
      candidate.y1,
    )

    let score = 0

    for (const star of liveStars) {
      const existingRegion = getRegion(
        star.x1,
        star.y1,
      )

      /*
       * Strongly prefer a different region.
       *
       * Upper-left -> lower-right
       * Upper-right -> lower-left
       * Middle-left -> upper-right
       * etc.
       */
      score += regionDistance(
        candidateRegion,
        existingRegion,
      )

      /*
       * Also reward physical distance.
       */
      const dx = candidate.x1 - star.x1
      const dy = candidate.y1 - star.y1

      score += Math.sqrt(
        dx * dx + dy * dy,
      ) * 0.12
    }

    return {
      ...candidate,
      score,
    }
  })

  scored.sort(
    (a, b) => b.score - a.score,
  )

  /*
   * Randomize between the best few choices so the
   * animation doesn't become predictable.
   */
  const topChoices = scored.slice(0, 6)

  return topChoices[
    Math.floor(
      Math.random() * topChoices.length,
    )
  ]
}

function makeShootingStar(
  id: number,
  liveStars: ShootingStarInstance[],
): ShootingStarInstance {
  /*
   * Every meteor uses the same 45° downward-left
   * local trajectory from its own spawn point.
   */
  const angleDeg = 45
  const angleRad =
    (angleDeg * Math.PI) / 180

  /*
   * Moderate travel distance.
   */
  const dist = 120 + Math.random() * 60

  /*
   * Fast enough to feel like a shooting star,
   * but still readable to the eye.
   */
  const duration =
    1.15 + Math.random() * 0.45

  /*
   * Down-left:
   * negative X = left
   * positive Y = down
   */
  const dx =
    -Math.cos(angleRad) * dist

  const dy =
    Math.sin(angleRad) * dist

  /*
   * Pick a spawn location that is far away
   * from every currently active meteor.
   */
  const { x1, y1 } = pickDistantSpawn(
    liveStars,
  )

  /*
   * Preserve the existing short shooting-star
   * appearance.
   */
  const trailPct =
    7 + Math.random() * 2

  const x2 =
    x1 +
    (dx / dist) * trailPct

  const y2 =
    y1 +
    (dy / dist) * trailPct

  return {
    id,
    x1,
    y1,
    x2,
    y2,
    dx,
    dy,
    duration,
  }
}

/*
 * Shooting-star scheduler.
 *
 * Maximum = 3 visible at once.
 *
 * Meteors are NEVER intentionally spawned at the exact
 * same moment.
 *
 * Instead:
 *
 *   meteor A
 *          ↓
 *       meteor B
 *                ↓
 *            meteor C
 *
 * while each one is placed in a distant region of the sky.
 */
function useShootingStars(
  reducedMotion: boolean,
) {
  const [stars, setStars] =
    useState<ShootingStarInstance[]>([])

  const liveRef =
    useRef<ShootingStarInstance[]>([])

  useEffect(() => {
    if (reducedMotion) return

    let spawnTimeout: number

    function spawnOne() {
      /*
       * Hard cap:
       * never let more than 3 meteors be visible.
       */
      if (liveRef.current.length >= 3) {
        spawnTimeout =
          window.setTimeout(
            spawnOne,
            250 +
              Math.random() * 350,
          )

        return
      }

      const star =
        makeShootingStar(
          shootingStarSeq++,
          liveRef.current,
        )

      liveRef.current = [
        ...liveRef.current,
        star,
      ]

      setStars([
        ...liveRef.current,
      ])

      /*
       * Remove the meteor after its animation
       * has completed.
       */
      window.setTimeout(() => {
        liveRef.current =
          liveRef.current.filter(
            (st) =>
              st.id !== star.id,
          )

        setStars([
          ...liveRef.current,
        ])
      }, star.duration * 1000 + 100)

      const activeCount =
        liveRef.current.length

      let nextDelay: number

      if (activeCount === 1) {
        /*
         * One meteor visible.
         *
         * Bring another in fairly soon.
         */
        nextDelay =
          350 +
          Math.random() * 650
      } else if (activeCount === 2) {
        /*
         * Two visible.
         *
         * Sometimes create a third, but not too quickly.
         */
        nextDelay =
          500 +
          Math.random() * 900
      } else {
        /*
         * Three visible.
         *
         * Give the scene time to clear before
         * starting another cycle.
         */
        nextDelay =
          1000 +
          Math.random() * 1800
      }

      /*
       * Add occasional quiet periods.
       *
       * This prevents the animation from becoming
       * a constant particle emitter.
       */
      if (
        activeCount >= 2 &&
        Math.random() < 0.22
      ) {
        nextDelay +=
          700 +
          Math.random() * 1100
      }

      spawnTimeout =
        window.setTimeout(
          spawnOne,
          nextDelay,
        )
    }

    /*
     * Initial meteor does not appear immediately
     * after page load.
     */
    spawnTimeout =
      window.setTimeout(
        spawnOne,
        700 +
          Math.random() * 900,
      )

    return () => {
      window.clearTimeout(
        spawnTimeout,
      )
    }
  }, [reducedMotion])

  return stars
}

function StarField({
  reducedMotion,
}: {
  reducedMotion: boolean
}) {
  const shootingStars =
    useShootingStars(reducedMotion)

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <style>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.35;
          }

          50% {
            opacity: 0.9;
          }
        }

        .star-twinkle {
          animation:
            twinkle
            3.4s
            ease-in-out
            infinite;
        }

        /*
         * Shooting-star movement:
         *
         * tiny line
         *      ↓
         * rapidly extends
         *      ↓
         * visible streak
         *      ↓
         * gradual fade
         */
        @keyframes streak {
          0% {
            opacity: 0;
            transform:
              translate(0, 0);
          }

          5% {
            opacity: 0.35;
            transform:
              translate(
                calc(var(--dx) * 0.025),
                calc(var(--dy) * 0.025)
              );
          }

          12% {
            opacity: 1;
            transform:
              translate(
                calc(var(--dx) * 0.12),
                calc(var(--dy) * 0.12)
              );
          }

          58% {
            opacity: 1;
            transform:
              translate(
                calc(var(--dx) * 0.58),
                calc(var(--dy) * 0.58)
              );
          }

          78% {
            opacity: 0.9;
            transform:
              translate(
                calc(var(--dx) * 0.78),
                calc(var(--dy) * 0.78)
              );
          }

          100% {
            opacity: 0;
            transform:
              translate(
                var(--dx),
                var(--dy)
              );
          }
        }

        .shooting-star {
          animation:
            streak
            var(--dur)
            linear
            forwards;
        }

        /*
         * Reveals the streak itself.
         */
        @keyframes reveal {
          0% {
            stroke-dasharray: 0 1;
            opacity: 0;
          }

          5% {
            stroke-dasharray:
              0.15 1;
            opacity: 0.35;
          }

          14% {
            stroke-dasharray:
              1 1;
            opacity: 1;
          }

          62% {
            stroke-dasharray:
              1 1;
            opacity: 1;
          }

          82% {
            stroke-dasharray:
              0.8 1;
            opacity: 0.85;
          }

          100% {
            stroke-dasharray:
              0 1;
            opacity: 0;
          }
        }

        .shooting-star-line {
          animation:
            reveal
            var(--dur)
            linear
            forwards;
        }
      `}</style>

      <defs>
        <linearGradient
          id="shootCore"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stopColor={CHALK_HEX}
            stopOpacity="0"
          />

          <stop
            offset="100%"
            stopColor={CHALK_HEX}
            stopOpacity="1"
          />
        </linearGradient>

        <linearGradient
          id="shootGlow"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stopColor={SIGNAL_HEX}
            stopOpacity="0"
          />

          <stop
            offset="100%"
            stopColor={SIGNAL_HEX}
            stopOpacity="0.65"
          />
        </linearGradient>
      </defs>

      {STARS_FAR.map((s, i) => (
        <circle
          key={`f${i}`}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          className="fill-chalk"
          opacity={s.o}
        />
      ))}

      {STARS_MID.map((s, i) => (
        <circle
          key={`m${i}`}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          className="fill-chalk"
          opacity={s.o}
        />
      ))}

      {STARS_NEAR.map((s, i) => (
        <circle
          key={`n${i}`}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          className={`fill-chalk ${
            !reducedMotion &&
            (i === 2 || i === 7)
              ? 'star-twinkle'
              : ''
          }`}
          opacity={s.o}
        />
      ))}

      {shootingStars.map((s) => (
        <g
          key={s.id}
          className="shooting-star"
          style={
            {
              '--dx': `${s.dx}px`,
              '--dy': `${s.dy}px`,
              '--dur': `${s.duration}s`,
            } as CSSProperties
          }
        >
          <line
            pathLength={1}
            className="shooting-star-line"
            x1={`${s.x1}%`}
            y1={`${s.y1}%`}
            x2={`${s.x2}%`}
            y2={`${s.y2}%`}
            stroke="url(#shootGlow)"
            strokeWidth={5}
            strokeLinecap="round"
            style={{
              filter:
                'blur(2px)',
            }}
          />

          <line
            pathLength={1}
            className="shooting-star-line"
            x1={`${s.x1}%`}
            y1={`${s.y1}%`}
            x2={`${s.x2}%`}
            y2={`${s.y2}%`}
            stroke="url(#shootCore)"
            strokeWidth={2}
            strokeLinecap="round"
          />

          <circle
            cx={`${s.x2}%`}
            cy={`${s.y2}%`}
            r={5}
            fill={SIGNAL_HEX}
            opacity={0.35}
            style={{
              filter:
                'blur(3px)',
            }}
          />

          <circle
            cx={`${s.x2}%`}
            cy={`${s.y2}%`}
            r={2}
            className="fill-chalk"
            style={{
              filter:
                'drop-shadow(0 0 4px rgba(237,235,228,1))',
            }}
          />
        </g>
      ))}
    </svg>
  )
}

function OrbitMark({
  reducedMotion,
  pulseTrigger,
}: {
  reducedMotion: boolean
  pulseTrigger: number
}) {
  const cx = 150
  const cy = 140
  const outerRx = 138
  const outerRy = 58
  const innerRx = 96
  const innerRy = 42

  const outerPath =
    `M ${cx - outerRx} ${cy}` +
    ` A ${outerRx} ${outerRy} 0 1 0 ${cx + outerRx} ${cy}` +
    ` A ${outerRx} ${outerRy} 0 1 0 ${cx - outerRx} ${cy}`

  const innerPath =
    `M ${cx - innerRx} ${cy}` +
    ` A ${innerRx} ${innerRy} 0 1 0 ${cx + innerRx} ${cy}` +
    ` A ${innerRx} ${innerRy} 0 1 0 ${cx - innerRx} ${cy}`

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <style>{`
        @keyframes dashFlow {
          from {
            stroke-dashoffset: 0;
          }

          to {
            stroke-dashoffset: -40;
          }
        }

        @keyframes bob {
          0%, 100% {
            transform:
              translateY(-4px);
          }

          50% {
            transform:
              translateY(7px);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.28;
          }

          50% {
            opacity: 0.65;
          }
        }

        @keyframes ringIn {
          from {
            opacity: 0;
            transform: scale(0.82);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bracketIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }

          70% {
            opacity: 1;
            transform: scale(1.08);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes ripple {
          from {
            r: 8;
            opacity: 0.9;
            stroke-width: 2px;
          }

          to {
            r: 100;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }

        .ring-a-in {
          transform-origin:
            150px 140px;
          animation:
            ringIn
            650ms
            cubic-bezier(0.16,1,0.3,1)
            both;
        }

        .ring-b-in {
          transform-origin:
            150px 140px;
          animation:
            ringIn
            650ms
            cubic-bezier(0.16,1,0.3,1)
            100ms
            both;
        }

        .bracket-in {
          transform-origin:
            150px 140px;
          animation:
            bracketIn
            600ms
            cubic-bezier(0.16,1,0.3,1)
            280ms
            both;
        }

        .ring-b-dash {
          animation:
            dashFlow
            2.2s
            linear
            infinite;
        }

        .arena-bracket {
          transform-origin:
            150px 140px;
          animation:
            bob
            3.4s
            ease-in-out
            infinite;
        }

        .arena-glow {
          animation:
            pulseGlow
            2.8s
            ease-in-out
            infinite;
        }

        .arena-ripple {
          animation:
            ripple
            900ms
            cubic-bezier(0.16,1,0.3,1)
            forwards;
        }

        .arena-reduced * {
          animation:
            none !important;
        }
      `}</style>

      <svg
        viewBox="0 0 300 240"
        className={`h-auto w-full ${
          reducedMotion
            ? 'arena-reduced'
            : ''
        }`}
      >
        <defs>
          <filter
            id="arenaGlowFilter"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur
              stdDeviation="8"
            />
          </filter>
        </defs>

        <g className="ring-a-in">
          <path
            id="ringPathA"
            d={outerPath}
            fill="none"
            className="stroke-chalk"
            strokeOpacity={0.35}
            strokeWidth={1.5}
          />
        </g>

        <g className="ring-b-in">
          <path
            id="ringPathB"
            className="ring-b-dash stroke-chalk"
            d={innerPath}
            fill="none"
            strokeOpacity={0.35}
            strokeWidth={1.5}
            strokeDasharray="4 6"
          />
        </g>

        {reducedMotion ? (
          <>
            <circle
              cx={cx + outerRx}
              cy={cy}
              r={3.5}
              className="fill-signal"
            />

            <circle
              cx={cx - innerRx}
              cy={cy}
              r={2.5}
              className="fill-signal"
            />
          </>
        ) : (
          <>
            <circle
              r={3.5}
              className="fill-signal"
              style={{
                filter:
                  `drop-shadow(0 0 4px ${SIGNAL_HEX})`,
              }}
            >
              <animateMotion
                dur="9s"
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href="#ringPathA" />
              </animateMotion>
            </circle>

            <circle
              r={2.5}
              className="fill-signal"
              style={{
                filter:
                  `drop-shadow(0 0 3px ${SIGNAL_HEX})`,
              }}
            >
              <animateMotion
                dur="6s"
                repeatCount="indefinite"
                keyPoints="1;0"
                keyTimes="0;1"
                calcMode="linear"
                rotate="auto"
              >
                <mpath href="#ringPathB" />
              </animateMotion>
            </circle>
          </>
        )}

        {!reducedMotion &&
          pulseTrigger > 0 && (
            <circle
              key={pulseTrigger}
              className="arena-ripple stroke-signal"
              cx={cx}
              cy={cy}
              r={8}
              fill="none"
              strokeWidth={1.5}
            />
          )}

        <g className="bracket-in">
          <g className="arena-bracket">
            <text
              className="arena-glow fill-signal"
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize={56}
              fontWeight={600}
              filter="url(#arenaGlowFilter)"
            >
              {'</>'}
            </text>

            <text
              className="fill-chalk"
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize={56}
              fontWeight={600}
            >
              {'</>'}
            </text>
          </g>
        </g>
      </svg>
    </div>
  )
}

function AstronautIcon({
  reducedMotion,
  size = 190,
}: {
  reducedMotion: boolean
  size?: number
}) {
  return (
    <div
      style={{
        width: `${size}px`,
      }}
    >
      <style>{`
        @keyframes astroDrift {
          0%, 100% {
            transform:
              translate(0, 0);
          }

          50% {
            transform:
              translate(-6px, -8px);
          }
        }

        .astro-float {
          animation:
            astroDrift
            5.5s
            ease-in-out
            infinite;
        }

        @keyframes thrustFlicker {
          0%, 100% {
            opacity: 0.55;
          }

          50% {
            opacity: 0.95;
          }
        }

        .astro-thrust {
          animation:
            thrustFlicker
            0.9s
            ease-in-out
            infinite;
        }

        @keyframes motionFade {
          0%, 100% {
            opacity: 0.35;
          }

          50% {
            opacity: 0.12;
          }
        }

        .astro-motion {
          animation:
            motionFade
            1.6s
            ease-in-out
            infinite;
        }

        .astro-reduced,
        .astro-reduced * {
          animation:
            none !important;
        }
      `}</style>

      <svg
        viewBox="-30 0 220 170"
        className={`h-auto w-full ${
          reducedMotion
            ? 'astro-reduced'
            : 'astro-float'
        }`}
      >
        <line
          className="astro-motion stroke-chalk"
          x1={115}
          y1={92}
          x2={150}
          y2={88}
          strokeWidth={2}
          style={{
            animationDelay: '0ms',
          }}
        />

        <line
          className="astro-motion stroke-chalk"
          x1={112}
          y1={104}
          x2={155}
          y2={102}
          strokeWidth={2}
          style={{
            animationDelay: '150ms',
          }}
        />

        <line
          className="astro-motion stroke-chalk"
          x1={118}
          y1={116}
          x2={148}
          y2={118}
          strokeWidth={2}
          style={{
            animationDelay: '300ms',
          }}
        />

        <g transform="rotate(-14 60 90)">
          <rect
            x={58}
            y={72}
            width={16}
            height={42}
            rx={5}
            className="fill-ink stroke-chalk"
            strokeWidth={2}
          />

          <path
            className="astro-thrust fill-signal"
            d="M62 112 L82 119 L62 126 Z"
          />

          <path
            className="astro-thrust fill-signal"
            d="M60 108 L74 112 L60 116 Z"
            opacity={0.7}
          />

          <rect
            x={62}
            y={108}
            width={34}
            height={15}
            rx={7}
            className="fill-ink stroke-chalk"
            strokeWidth={2}
          />

          <rect
            x={88}
            y={103}
            width={20}
            height={15}
            rx={6}
            className="fill-graphite"
          />

          <rect
            x={30}
            y={66}
            width={50}
            height={48}
            rx={20}
            className="fill-ink stroke-chalk"
            strokeWidth={2.5}
          />

          <rect
            x={42}
            y={82}
            width={20}
            height={14}
            rx={3}
            fill="none"
            className="stroke-graphite"
            strokeWidth={1.5}
          />

          <circle
            cx={47}
            cy={89}
            r={2}
            className="fill-signal"
          />

          <circle
            cx={57}
            cy={89}
            r={2}
            className="fill-graphite"
          />

          <path
            d="M32 76 Q10 82 8 102"
            fill="none"
            className="stroke-chalk"
            strokeWidth={9}
            strokeLinecap="round"
          />

          <circle
            cx={8}
            cy={104}
            r={7}
            className="fill-ink stroke-chalk"
            strokeWidth={2}
          />

          <g transform="rotate(-10 4 108)">
            <rect
              x={-16}
              y={96}
              width={34}
              height={24}
              rx={3}
              className="fill-ink stroke-chalk"
              strokeWidth={2}
            />

            <rect
              x={-13}
              y={99}
              width={28}
              height={18}
              rx={2}
              className="fill-signal"
              opacity={0.18}
            />

            <rect
              x={-11}
              y={104}
              width={14}
              height={2}
              className="fill-signal"
              opacity={0.7}
            />

            <rect
              x={-20}
              y={120}
              width={40}
              height={6}
              rx={2}
              className="fill-chalk"
            />
          </g>

          <rect
            x={42}
            y={62}
            width={18}
            height={8}
            rx={3}
            className="fill-graphite"
          />

          <circle
            cx={50}
            cy={40}
            r={26}
            className="fill-ink stroke-chalk"
            strokeWidth={2.5}
          />

          <ellipse
            cx={42}
            cy={40}
            rx={15}
            ry={18}
            className="fill-graphite"
            opacity={0.9}
          />

          <path
            d="M30 30 A15 18 0 0 1 46 24"
            fill="none"
            className="stroke-chalk"
            strokeWidth={1.5}
            opacity={0.5}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  )
}

export default function AuthLayout() {
  const location = useLocation()
  const outlet = useOutlet()

  const mode: 'login' | 'signup' =
    location.pathname === '/signup'
      ? 'signup'
      : 'login'

  const [reducedMotion, setReducedMotion] =
    useState(false)

  const [pulseTrigger, setPulseTrigger] =
    useState(0)

  const [displayLocation, setDisplayLocation] =
    useState(location)

  const [displayOutlet, setDisplayOutlet] =
    useState(outlet)

  const [phase, setPhase] =
    useState<
      'idle' | 'exiting' | 'entering'
    >('idle')

  const [direction, setDirection] =
    useState<
      'forward' | 'backward'
    >('forward')

  useEffect(() => {
    setReducedMotion(
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches,
    )
  }, [])

  useEffect(() => {
    if (
      location.pathname ===
      displayLocation.pathname
    ) {
      return
    }

    setPulseTrigger((n) => n + 1)

    setDirection(
      displayLocation.pathname === '/login'
        ? 'forward'
        : 'backward',
    )

    if (reducedMotion) {
      setDisplayLocation(location)
      setDisplayOutlet(outlet)
      return
    }

    setPhase('exiting')

    const t = window.setTimeout(() => {
      setDisplayLocation(location)
      setDisplayOutlet(outlet)
      setPhase('entering')

      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          setPhase('idle'),
        ),
      )
    }, 180)

    return () =>
      window.clearTimeout(t)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const displayMode:
    'login' | 'signup' =
    displayLocation.pathname === '/signup'
      ? 'signup'
      : 'login'

  const slideOffset =
    reducedMotion ? 0 : 18

  const translateX =
    phase === 'exiting'
      ? direction === 'forward'
        ? -slideOffset
        : slideOffset
      : phase === 'entering'
        ? direction === 'forward'
          ? slideOffset
          : -slideOffset
        : 0

  const contentOpacity =
    phase === 'idle' ? 1 : 0

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <StarField
        reducedMotion={
          reducedMotion
        }
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col">
        <div className="flex items-center justify-between px-6 pt-12 sm:px-12">
          <span className="font-display text-xl font-semibold">
            <span className="text-chalk">
              CODE
            </span>

            <span className="text-signal">
              MAYHEM
            </span>
          </span>

          <Link
            to={
              mode === 'login'
                ? '/signup'
                : '/login'
            }
            className="border border-graphite px-3 py-2 text-xs text-graphite"
          >
            {mode === 'login'
              ? 'New here? '
              : 'Already registered? '}

            <span className="font-semibold text-signal">
              {mode === 'login'
                ? 'Sign up →'
                : 'Log in →'}
            </span>
          </Link>
        </div>

        <div className="flex flex-1">
          <div className="hidden flex-col p-12 lg:flex lg:w-[55%]">
            <h1 className="font-display mb-4 text-6xl font-bold leading-[1.05] text-chalk">
              Code.
              <br />
              Clash.
              <br />
              <span className="text-signal">
                Conquer.
              </span>
            </h1>

            <p className="mb-10 max-w-sm text-base text-graphite">
              Real-time coding battles for CS students.
            </p>

            <div className="mb-4 flex max-w-sm flex-col gap-4">
              {FEATURES.map(
                ({
                  icon: Icon,
                  title,
                  body,
                }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-graphite">
                      <Icon
                        size={18}
                        className="text-chalk"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-chalk">
                        {title}
                      </p>

                      <p className="text-sm text-graphite">
                        {body}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-8"
                style={{
                  background:
                    `radial-gradient(circle at center, ${SIGNAL_HEX}08 0%, transparent 70%)`,
                }}
              />

              <div className="relative">
                <OrbitMark
                  reducedMotion={
                    reducedMotion
                  }
                  pulseTrigger={
                    pulseTrigger
                  }
                />

                <svg
                  aria-hidden="true"
                  viewBox="0 0 320 260"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  <line
                    x1={255}
                    y1={150}
                    x2={290}
                    y2={168}
                    className="stroke-chalk"
                    strokeWidth={1.5}
                    strokeDasharray="3 6"
                    opacity={0.3}
                  />

                  <line
                    x1={268}
                    y1={168}
                    x2={300}
                    y2={182}
                    className="stroke-chalk"
                    strokeWidth={1.5}
                    strokeDasharray="3 6"
                    opacity={0.22}
                  />
                </svg>

                <div className="absolute -bottom-8 -right-11">
                  <AstronautIcon
                    reducedMotion={
                      reducedMotion
                    }
                    size={130}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center p-6 sm:p-12">
            <div className="w-full max-w-[420px] overflow-hidden border border-graphite bg-graphite/5 px-8 py-10">
              <div
                style={{
                  transform:
                    `translateX(${translateX}px)`,
                  opacity:
                    contentOpacity,
                  transition:
                    reducedMotion
                      ? 'opacity 120ms linear'
                      : 'transform 220ms ease, opacity 220ms ease',
                }}
              >
                <SignalBars
                  reducedMotion={
                    reducedMotion
                  }
                />

                <h2 className="font-display mb-2 text-4xl font-bold text-chalk">
                  {displayMode === 'login'
                    ? 'Enter the Arena'
                    : 'Join the Arena'}
                </h2>

                <p className="mb-6 text-sm text-graphite">
                  {displayMode === 'login'
                    ? 'Log in to continue your climb.'
                    : 'Create your account to start battling.'}
                </p>

                {displayOutlet}
              </div>
            </div>

            <p className="mt-8 font-mono text-xs text-graphite">
              dcism.org
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
