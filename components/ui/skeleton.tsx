import { cn } from '@/lib/utils'

// ============================================================================
// COMPONENTE BASE SKELETON
// ============================================================================

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'shimmer' | 'pulse' | 'none'
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  }

  const animationClasses = {
    shimmer: 'shimmer',
    pulse: 'animate-pulse bg-slate-200',
    none: 'bg-slate-200',
  }

  return (
    <span
      className={cn(
        'block',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  )
}

// ============================================================================
// SKELETON PRESETS
// ============================================================================

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className="h-4"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
    />
  )
}

export function SkeletonButton({ width = 80, height = 36 }: { width?: number; height?: number }) {
  return (
    <Skeleton
      variant="rounded"
      width={width}
      height={height}
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-6 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-5 w-32" />
        <Skeleton variant="rounded" className="h-8 w-8" />
      </div>
      <Skeleton variant="text" className="h-8 w-24" />
      <Skeleton variant="text" className="h-4 w-48" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-slate-50 border-b border-slate-200">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-slate-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              className="h-4 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" className="h-4 w-24" />
          <Skeleton variant="text" className="h-8 w-20" />
          <Skeleton variant="text" className="h-3 w-32" />
        </div>
        <Skeleton variant="rounded" className="h-12 w-12" />
      </div>
    </div>
  )
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <SkeletonAvatar size={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-40" />
            <Skeleton variant="text" className="h-3 w-24" />
          </div>
          <Skeleton variant="rounded" className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="h-4 w-24" />
          <Skeleton variant="rounded" className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton variant="rounded" className="h-10 w-32" />
        <Skeleton variant="rounded" className="h-10 w-24" />
      </div>
    </div>
  )
}

// ============================================================================
// EXPORTAÇÃO DEFAULT
// ============================================================================

export default Skeleton
