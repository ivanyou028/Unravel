import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'

import { cn } from '#/lib/utils'

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="size-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaPrimitive.ScrollAreaScrollbarProps) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation={orientation}
      className={cn(
        'flex touch-none select-none p-1 transition-colors',
        orientation === 'vertical'
          ? 'h-full w-3 border-l border-l-transparent'
          : 'h-3 flex-col border-t border-t-transparent',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-white/15" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
