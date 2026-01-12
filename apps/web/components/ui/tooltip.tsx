"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

/**
 * TooltipProvider
 * - Wraps tooltips and controls shared config (delayDuration)
 */
const TooltipProvider = TooltipPrimitive.Provider

/**
 * Tooltip
 * - Root component
 * - Manages open/close state
 */
const Tooltip = TooltipPrimitive.Root

/**
 * TooltipTrigger
 * - Element that triggers the tooltip
 */
const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * TooltipContent
 * - The floating tooltip panel
 * - Includes animations, arrow, and portal rendering
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // Base styles
        "z-50 overflow-hidden rounded-md border border-border bg-foreground px-3 py-1.5 text-xs text-background shadow-md",

        // Animations
        "animate-in fade-in-0 zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",

        // Direction-aware slide animations
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=top]:slide-in-from-bottom-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",

        className
      )}
      {...props}
    >
      {props.children}

      {/* Arrow */}
      <TooltipPrimitive.Arrow className="fill-foreground rotate-45 w-2 h-2" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
}
