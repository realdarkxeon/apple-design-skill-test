import * as React from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui DropdownMenu (trimmed to the parts the site uses).
 * The content uses the site's translucent material and opens from the trigger's corner.
 */
function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-60 min-w-44 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-[var(--radius)] bg-popover p-1.5 text-popover-foreground shadow-lg outline-none',
          'supports-[backdrop-filter]:bg-material supports-[backdrop-filter]:backdrop-blur-[30px] supports-[backdrop-filter]:backdrop-saturate-[1.8]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 data-[state=closed]:duration-150',
          'motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn('px-3 py-1.5 text-xs font-semibold tracking-[0.02em] text-muted-foreground', className)}
      {...props}
    />
  );
}

function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'relative flex min-h-11 cursor-default items-center justify-between gap-4 rounded-xl px-3 py-2 text-base font-medium text-foreground no-underline outline-none select-none hover:no-underline focus:bg-accent focus:text-accent-foreground active:bg-secondary-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem };
