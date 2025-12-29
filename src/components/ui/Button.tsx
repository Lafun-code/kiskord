import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 shadow-lg",
          {
            "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:shadow-purple-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]":
              variant === "primary",
            "bg-secondary/80 text-secondary-foreground hover:bg-secondary border border-border/50 hover:border-border":
              variant === "secondary",
            "bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-red-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]":
              variant === "danger",
            "hover:bg-accent hover:text-accent-foreground shadow-none": variant === "ghost",
            "h-9 px-4 text-sm": size === "sm",
            "h-11 px-5 py-2": size === "md",
            "h-12 px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
