import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-input bg-transparent hover:bg-muted dark:border-foreground dark:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-transparent hover:bg-muted dark:border-foreground dark:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "relative overflow-hidden text-foreground gradient-border [&::before]:content-[''] [&::before]:absolute [&::before]:inset-[3px] [&::before]:rounded-[10px] [&::before]:bg-background [&::before]:z-[1]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
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
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }))

    if (variant === "gradient") {
      const content = React.isValidElement(children) ? (
        React.cloneElement(children, {
          className: cn(
            "relative z-[2] inline-flex items-center justify-center gap-2",
            // @ts-ignore - allow merging existing className
            children.props.className
          ),
        })
      ) : (
        <span className="relative z-[2] inline-flex items-center justify-center gap-2">
          {children}
        </span>
      )

      const Comp = asChild ? Slot : "button"
      return (
        <Comp ref={ref} className={classes} {...props}>
          {content}
        </Comp>
      )
    }

    const Comp = asChild ? Slot : "button"
    return (
      <Comp ref={ref} className={classes} {...props}>
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
