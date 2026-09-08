import type { ElementType, ReactNode } from 'react'

const HEADING_STYLES = {
  1: 'font-display text-4xl font-semibold tracking-tight md:text-5xl',
  2: 'font-display text-2xl font-semibold tracking-tight md:text-3xl',
  3: 'font-display text-xl font-medium md:text-2xl',
  4: 'font-display text-lg font-medium',
} as const

interface HeadingProps {
  level?: 1 | 2 | 3 | 4
  children: ReactNode
  className?: string
}

export function Heading({ level = 1, children, className = '' }: HeadingProps) {
  const Tag = `h${level}` as ElementType
  return <Tag className={`${HEADING_STYLES[level]} ${className}`}>{children}</Tag>
}

interface BodyProps {
  size?: 'base' | 'sm'
  children: ReactNode
  className?: string
  as?: ElementType
}

export function Body({ size = 'base', children, className = '', as: Tag = 'p' }: BodyProps) {
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <Tag className={`font-body leading-relaxed text-ink ${sizeClass} ${className}`}>
      {children}
    </Tag>
  )
}

interface MonoProps {
  size?: 'sm' | 'base' | 'readout'
  children: ReactNode
  className?: string
}

const MONO_SIZES = {
  sm: 'text-xs',
  base: 'text-sm',
  readout: 'text-3xl md:text-4xl tabular-nums',
} as const

export function Mono({ size = 'base', children, className = '' }: MonoProps) {
  return <span className={`font-mono ${MONO_SIZES[size]} ${className}`}>{children}</span>
}
