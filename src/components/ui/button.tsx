import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold no-underline ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-subtle hover:bg-primary-hover hover:shadow-card",
        destructive:
          "bg-destructive text-destructive-foreground shadow-subtle hover:bg-destructive/92 hover:shadow-card",
        secondary:
          "border border-border-subtle bg-secondary text-secondary-foreground hover:border-border hover:bg-muted",
        tertiary:
          "border border-transparent bg-transparent text-foreground hover:border-border-subtle hover:bg-muted/70",
        outline:
          "border border-border-subtle bg-background text-foreground hover:border-border hover:bg-muted/65",
        ghost: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        link: "h-auto rounded-none px-0 py-0 font-semibold text-primary underline underline-offset-4 decoration-primary/45 hover:decoration-primary",
        automotive: "bg-automotive-blue text-white shadow-subtle hover:bg-automotive-blue/92 hover:shadow-card",
        analytics: "bg-primary text-primary-foreground shadow-subtle hover:bg-primary-hover hover:shadow-card",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-sm px-3 text-xs",
        lg: "h-11 rounded-md px-6 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
