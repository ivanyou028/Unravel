import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '#/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--signal)] text-[var(--canvas)] hover:bg-[var(--signal-strong)]',
        outline:
          'border-[var(--line)] bg-white/4 text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:bg-white/8 hover:text-[var(--ink)]',
        secondary:
          'border-transparent bg-[rgba(201,240,122,0.14)] text-[var(--accent)] hover:bg-[rgba(201,240,122,0.2)]',
        ghost:
          'border-transparent bg-transparent text-[var(--ink-dim)] hover:bg-white/6 hover:text-[var(--ink)]',
        destructive:
          'border-transparent bg-[rgba(255,128,117,0.14)] text-[var(--danger)] hover:bg-[rgba(255,128,117,0.22)]',
        link: 'border-transparent px-0 text-[var(--signal-strong)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4',
        xs: 'h-7 rounded-full px-2.5 text-xs',
        sm: 'h-8 rounded-full px-3 text-xs',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-10',
        'icon-xs': 'size-7 rounded-full',
        'icon-sm': 'size-8 rounded-full',
        'icon-lg': 'size-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
