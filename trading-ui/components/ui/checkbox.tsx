"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
        return (
            <input
                ref={ref}
                type="checkbox"
                className={cn(
                    "h-4 w-4 rounded border border-gray-300 text-primary focus:ring-2 focus:ring-primary/50",
                    disabled && "opacity-50 cursor-not-allowed",
                    className
                )}
                checked={checked}
                onChange={(e) => onCheckedChange?.(e.target.checked)}
                disabled={disabled}
                {...props}
            />
        );
    }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
