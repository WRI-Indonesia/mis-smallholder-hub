"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "has-[:checked]:bg-primary bg-input",
          className
        )}
      >
        <input
          type="checkbox"
          id={id}
          ref={ref}
          className="peer sr-only"
          {...props}
        />
        <span className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform peer-checked:translate-x-4 translate-x-0" />
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
