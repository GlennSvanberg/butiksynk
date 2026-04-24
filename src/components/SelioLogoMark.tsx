import { cn } from '~/lib/utils'

type SelioLogoMarkProps = {
  className?: string
  /** Slot in the layout (default matches nav wordmark height). */
  variant?: 'nav' | 'compact'
}

/**
 * Renders selio.png in a fixed slot with a slight scale-up so transparent
 * padding in the asset does not shrink the mark next to the wordmark.
 */
export function SelioLogoMark({
  className,
  variant = 'nav',
}: SelioLogoMarkProps) {
  const slot =
    variant === 'nav' ? 'size-10 sm:size-11' : 'size-9 sm:size-10'
  const imgScale =
    variant === 'nav'
      ? 'scale-[1.34] sm:scale-[1.4]'
      : 'scale-[1.28] sm:scale-[1.32]'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md',
        slot,
        className,
      )}
      aria-hidden
    >
      <img
        src="/selio.png"
        alt=""
        decoding="async"
        draggable={false}
        className={cn(
          'size-full max-h-none max-w-none origin-center object-contain',
          imgScale,
        )}
      />
    </span>
  )
}
