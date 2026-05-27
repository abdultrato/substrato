"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const TextInput = forwardRef<HTMLInputElement, Props>(
  ({ error, leftIcon, rightIcon, className = "", ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          {...props}
          className={`
            h-9 w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-tight text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition-colors
            ${leftIcon ? "pl-10" : ""}
            ${rightIcon ? "pr-10" : ""}
            ${
              error
                ? "border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20"
                : "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            }
            ${className}
          `}
        />

        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {rightIcon}
          </span>
        )}
      </div>
    );
  },
);

TextInput.displayName = "TextInput";

export default TextInput;
