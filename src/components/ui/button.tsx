import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui Button, tuned to the site: pill shape, 44px touch target,
 * and press feedback on pointer-down (scale + darker fill).
 * Astro files use `buttonVariants()` on plain <a> elements so scoped styles still apply.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold leading-tight tracking-[-0.005em] no-underline outline-none select-none cursor-pointer [-webkit-tap-highlight-color:transparent] touch-manipulation transition-[transform,background-color,color,box-shadow] duration-150 ease-out hover:no-underline active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:text-primary-foreground hover:bg-primary/90 active:bg-primary-press',
        secondary: 'bg-secondary text-secondary-foreground hover:text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-hover',
        outline:
          'border border-border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground active:bg-secondary-hover',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground active:bg-secondary-hover',
        link: 'text-link underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        default: 'min-h-11 px-[1.375rem] py-[0.6875rem] text-base',
        sm: 'min-h-9 px-[0.9375rem] py-[0.4375rem] text-[0.9375rem]',
        lg: 'min-h-12 px-7 text-[1.0625rem]',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
