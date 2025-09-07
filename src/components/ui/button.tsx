import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-luxury focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        
        // Luxury Agent Lee Variants
        nexus: "bg-gold-gradient text-emerald-primary border border-gold-secondary hover:shadow-gold hover:scale-105 active:scale-95 shadow-luxury rounded-full",
        settings: "glass-panel text-gold-primary hover:bg-glass-border hover:shadow-glow rounded-xl border border-glass-border backdrop-blur-sm",
        action: "bg-emerald-accent text-gold-primary hover:bg-emerald-secondary hover:shadow-gold border border-gold-muted rounded-lg",
        floating: "glass-panel text-gold-primary hover:bg-emerald-accent/20 shadow-luxury rounded-2xl border border-glass-border backdrop-blur-lg",
        icon: "bg-emerald-accent/80 text-gold-primary hover:bg-emerald-accent hover:shadow-glow rounded-full border border-gold-muted/30",
        premium: "bg-gold-gradient text-emerald-primary hover:shadow-glow hover:scale-105 active:scale-95 shadow-gold rounded-xl border border-gold-secondary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
        "icon-xl": "h-16 w-16",
        nexus: "h-32 w-32 rounded-full",
        floating: "h-12 px-6 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
